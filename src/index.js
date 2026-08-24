/**
 * atnhub API v2.2
 * Cloudflare Workers (ES Module) + D1
 *
 * 学校向け出席管理 API。
 * - D1 バインディング: env.DB
 * - 認証: httpOnly Cookie セッション（sessions テーブル / 7 日間有効）
 * - セキュリティ: 同一 identifier ロック / IP レート制限 / 監査ログ / CSRF保護
 */

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 出席ステータスとして許可する値 */
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave'];

/** 学校コード生成に使用する文字（英大文字 + 数字） */
const SCHOOL_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** ログイン失敗時の統一レスポンス（ロック中 / 不一致を区別不可にする） */
const LOGIN_FAILED_BODY = { error: '認証に失敗しました' };

/** ユーザー不在時の PIN 検証に使うダミーソルト（タイミング差の低減用） */
const DUMMY_SALT = '0123456789abcdef0123456789abcdef';

// ---------------------------------------------------------------------------
// 基本ユーティリティ
// ---------------------------------------------------------------------------

/** Uint8Array を 16 進文字列へ変換する */
function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 16 進文字列を Uint8Array へ変換する（奇数長など不正値は例外） */
function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length === 0 || hex.length % 2 !== 0) {
    throw new Error('invalid hex string');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** JSON レスポンスヘルパー（全レスポンスに CORS ヘッダを付与する） */
function json(data, status = 200, extraHeaders = {}, corsHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    ...corsHeaders,
    ...extraHeaders,
  };
  if (!headers['Access-Control-Allow-Credentials']) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * CORS ヘッダを生成する。
 * - FRONTEND_ORIGIN 未設定 -> Access-Control-Allow-Origin: '*'
 * - 設定あり -> リクエスト Origin と照合し、一致した場合のみその Origin を返す
 */
function getCorsHeaders(request, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
  const allowedOrigins = String(env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    headers['Access-Control-Allow-Origin'] = '*';
    return headers;
  }
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }
  return headers;
}

/** OPTIONS プリフライト応答（204 + CORS ヘッダ） */
function handleOptions(corsHeaders) {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** リクエストボディを JSON としてパースする（失敗時は null） */
async function parseJsonBody(request) {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** 6 桁数字 PIN の検証 */
function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

/** 出席番号（数字のみ）の検証 */
function isValidStudentNumber(studentNumber) {
  return typeof studentNumber === 'string' && /^\d+$/.test(studentNumber);
}

/** 値をトリム済み文字列へ安全に変換する（文字列 / 数値以外は空文字） */
function asString(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** 値を正の整数へ変換する（不能なら null） */
function asIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** クライアント IP を取得する（CF-Connecting-IP ヘッダ、無ければ 'unknown'） */
function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/** Cookie ヘッダからセッショントークンを抽出する（無ければ null） */
function extractSessionToken(request) {
  const cookieHeader = request.headers.get('Cookie') || "";
  const match = /(?:^|;\s*)session=([^;]+)/.exec(cookieHeader);
  return match ? match[1].trim() : null;
}


// ---------------------------------------------------------------------------
// 暗号ユーティリティ（Web Crypto）
// ---------------------------------------------------------------------------

/** SHA-256 ハッシュを計算し 16 進文字列で返す */
async function sha256hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return bytesToHex(new Uint8Array(digest));
}

/**
 * PIN を PBKDF2-SHA256 でハッシュ化する。
 * （100000 反復 / 256bit 出力 / salt は 16 進文字列 -> 戻り値も 16 進文字列）
 */
async function hashPin(pin, saltHex) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: 100000 },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

/** ランダムソルト生成（16 バイト -> 16 進 32 文字） */
function makeSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

/** ランダムトークン生成（32 バイト -> 16 進 64 文字） */
function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** 6 桁の学校コードをランダム生成する（英大文字 + 数字） */
function makeSchoolCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = '';
  for (const byte of bytes) {
    code += SCHOOL_CODE_CHARS[byte % SCHOOL_CODE_CHARS.length];
  }
  return code;
}

/** ユーザー行からハッシュ系フィールドを除外した公開情報を組み立てる */
function sanitizeUser(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    role: row.role,
    login_id: row.login_id,
    name: row.name,
    class_id: row.class_id ?? null,
    student_number: row.student_number ?? null,
    is_active: row.is_active,
  };
}

/** 監査ログを記録する */
async function writeAuditLog(env, entry) {
  await env.DB.prepare(
    `INSERT INTO audit_logs (school_id, user_id, action, target_type, target_id, before_data, after_data, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  )
    .bind(
      entry.schoolId,
      entry.userId ?? null,
      entry.action,
      entry.targetType ?? null,
      asIntOrNull(entry.targetId),
      entry.beforeData ? JSON.stringify(entry.beforeData) : null,
      entry.afterData ? JSON.stringify(entry.afterData) : null,
      entry.ipHash ?? null,
    )
    .run();
}

// ---------------------------------------------------------------------------
// 認証ミドルウェア
// ---------------------------------------------------------------------------

/**
 * Cookie トークンで認証し、ユーザー行を返す（失敗時は null）。
 * - sessions JOIN users
 * - 有効期限切れセッション / 無効ユーザーは拒否
 */
async function authenticate(request, env) {
  const token = extractSessionToken(request);
  if (!token) return null;
  const user = await env.DB.prepare(
    `SELECT u.id, u.school_id, u.role, u.login_id, u.name, u.class_id, u.student_number, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`,
  )
    .bind(token)
    .first();
  return user ?? null;
}

/** ロール検査：許可ロール配列に含まれない場合は null を返す */
function requireRole(user, allowedRoles) {
  return allowedRoles.includes(user.role) ? user : null;
}

// ---------------------------------------------------------------------------
// ログイン処理（共通）
// ---------------------------------------------------------------------------

/**
 * 共通ログイン処理。
 * セキュリティ要件:
 *   1. 同一 identifier（school_id + login_id）の失敗が 15 分以内に 5 回以上で
 *      以降は正しい PIN でも拒否する。ロック中も PIN 不一致も同一メッセージ /
 *      同一ステータスで応答し、外部から区別できないようにする。
 *   2. 同一 IP の試行が 1 分間に 10 回以上で 429 を返す。
 *   3. 成功 / 失敗を問わず全試行を login_attempts に記録する。
 */
async function performLogin(ctx, params) {
  const { env, request, respond } = ctx;
  const ipHash = await sha256hex(getClientIP(request));

  // IP 単位のレート制限（1 分間に 10 回以上で拒否）
  const ipAttemptCount = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_attempts
     WHERE ip_hash = ? AND attempted_at > datetime('now', '-1 minute')`,
  )
    .bind(ipHash)
    .first();
  if ((ipAttemptCount?.c ?? 0) >= 10) {
    return respond({ error: 'Too Many Requests' }, 429);
  }

  // 学校コード解決（未知のコードも区別せず 401 固定）
  const school = await env.DB.prepare('SELECT id FROM schools WHERE code = ?')
    .bind(params.schoolCode)
    .first();
  if (!school) return respond(LOGIN_FAILED_BODY, 401);

  // 同一 identifier ロック判定（ログイン処理前に実施）
  const recentFailCount = await env.DB.prepare(
    `SELECT COUNT(*) AS c FROM login_attempts
     WHERE school_id = ? AND login_id = ? AND success = 0
       AND attempted_at > datetime('now', '-15 minutes')`,
  )
    .bind(school.id, params.loginId)
    .first();
  const isLocked = (recentFailCount?.c ?? 0) >= 5;

  // ユーザー検索（school_id 条件は必須）
  const user = await env.DB.prepare(
    `SELECT id, pin_hash, salt, name, class_id, student_number, role, is_active
     FROM users
     WHERE school_id = ? AND login_id = ? AND role = ? AND is_active = 1`,
  )
    .bind(school.id, params.loginId, params.expectedRole)
    .first();

  // PIN 検証（ユーザー不在時もダミー計算でタイミング差を低減する）
  let authenticated = false;
  if (user) {
    authenticated = (await hashPin(params.pin, user.salt)) === user.pin_hash;
  } else {
    await hashPin(params.pin, DUMMY_SALT);
  }

  // 全試行を記録する（成功 / 失敗を問わない）
  await env.DB.prepare(
    `INSERT INTO login_attempts (school_id, login_id, ip_hash, success, attempted_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  )
    .bind(school.id, params.loginId, ipHash, authenticated ? 1 : 0)
    .run();

  // ロック中 / 不一致は同一レスポンスで返す（区別不可能にする）
  if (!authenticated || isLocked) {
    return respond(LOGIN_FAILED_BODY, 401);
  }

  // セッション発行（7 日間有効）
  const token = randomToken();
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, expires_at, created_at)
     VALUES (?, ?, datetime('now', '+7 days'), datetime('now'))`,
  )
    .bind(token, user.id)
    .run();

  // httpOnly Cookie でセッショントークンを設定
  const cookie = `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
  return respond({
    user: sanitizeUser(user),
  }, 200, { 'Set-Cookie': cookie });
}

/** 生徒ログイン: { school_code, class_code, student_number, pin } */
async function handleStudentLogin(ctx) {
  const { request, respond } = ctx;
  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const schoolCode = asString(body.school_code);
  const classCode = asString(body.class_code);
  const studentNumber = asString(body.student_number);
  const pin = asString(body.pin);
  if (!schoolCode || !classCode || !isValidStudentNumber(studentNumber) || !isValidPin(pin)) {
    return respond({ error: '入力内容が不正です' }, 400);
  }

  return performLogin(ctx, {
    schoolCode,
    loginId: `${classCode}:${studentNumber}`,
    pin,
    expectedRole: 'student',
  });
}

/** 教職員ログイン共通: { school_code, login_id, pin } */
async function handleStaffLogin(ctx, expectedRole) {
  const { request, respond } = ctx;
  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const schoolCode = asString(body.school_code);
  const loginId = asString(body.login_id);
  const pin = asString(body.pin);
  if (!schoolCode || !loginId || !isValidPin(pin)) {
    return respond({ error: '入力内容が不正です' }, 400);
  }

  return performLogin(ctx, { schoolCode, loginId, pin, expectedRole });
}

/** ログアウト: 自分のセッションを削除する */
async function handleLogout(ctx) {
  const { env, request, respond } = ctx;
  const token = extractSessionToken(request);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  const cookie = 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
  return respond({ ok: true }, 200, { 'Set-Cookie': cookie });
}

// ---------------------------------------------------------------------------
// 学校初期化（bootstrap）: 複数学校対応
// ---------------------------------------------------------------------------

/** POST /api/schools/bootstrap — { name, slug, admin_login_id, admin_pin, admin_name } */
async function handleBootstrap(ctx) {
  const { env, request, respond, ipHash } = ctx;

  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const name = asString(body.name);
  const slug = asString(body.slug);
  const adminLoginId = asString(body.admin_login_id);
  const adminPin = asString(body.admin_pin);
  const adminName = asString(body.admin_name);

  // 入力検証（slug は ^[a-z0-9-]+$、PIN は 6 桁数字）
  if (!name || !/^[a-z0-9-]+$/.test(slug) || !adminLoginId || !isValidPin(adminPin) || !adminName) {
    return respond({ error: '入力内容が不正です' }, 400);
  }

  // slug 重複チェック（UNIQUE 制約の事前確認）
  const slugDuplicate = await env.DB.prepare('SELECT id FROM schools WHERE slug = ?').bind(slug).first();
  if (slugDuplicate) return respond({ error: 'このslugは既に使用されています' }, 400);

  // 衝突しない学校コードを生成する（最大 10 回試行）
  let schoolCode = '';
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = makeSchoolCode();
    const codeDuplicate = await env.DB.prepare('SELECT id FROM schools WHERE code = ?').bind(candidate).first();
    if (!codeDuplicate) {
      schoolCode = candidate;
      break;
    }
  }
  if (!schoolCode) return respond({ error: '学校コードの生成に失敗しました' }, 500);

  // 学校を作成
  const schoolResult = await env.DB.prepare(
    'INSERT INTO schools (name, slug, code) VALUES (?, ?, ?)',
  )
    .bind(name, slug, schoolCode)
    .run();
  const schoolId = schoolResult.meta.last_row_id;

  // 管理者ユーザー（role=school_admin）を作成
  const salt = makeSalt();
  const pinHash = await hashPin(adminPin, salt);
  const adminResult = await env.DB.prepare(
    `INSERT INTO users (school_id, role, login_id, pin_hash, salt, name, is_active)
     VALUES (?, 'school_admin', ?, ?, ?, ?, 1)`,
  )
    .bind(schoolId, adminLoginId, pinHash, salt, adminName)
    .run();
  const adminUserId = adminResult.meta.last_row_id;

  // 監査ログ記録
  await writeAuditLog(env, {
    schoolId,
    userId: adminUserId,
    action: 'school.bootstrap',
    targetType: 'school',
    targetId: schoolId,
    afterData: { name, slug, code: schoolCode },
    ipHash,
  });

  return respond({ ok: true, school: { id: schoolId, name, slug, code: schoolCode } }, 201);
}

// ---------------------------------------------------------------------------
// クラス管理
// ---------------------------------------------------------------------------

/** POST /api/classes（管理者専用）— { name, grade?, teacher_id? } */
async function handleCreateClass(ctx) {
  const { env, request, respond, user } = ctx;
  if (user.role !== 'school_admin') return respond({ error: '権限がありません' }, 403);

  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const name = asString(body.name);
  if (!name) return respond({ error: 'クラス名は必須です' }, 400);
  const grade = asIntOrNull(body.grade);
  const teacherId = asIntOrNull(body.teacher_id);

  // teacher_id 指定時は自校の教師であることを確認（school_id 条件は必須）
  if (teacherId !== null) {
    const teacher = await env.DB.prepare(
      `SELECT id FROM users WHERE id = ? AND school_id = ? AND role = 'teacher' AND is_active = 1`,
    )
      .bind(teacherId, user.school_id)
      .first();
    if (!teacher) return respond({ error: '指定された教師が見つかりません' }, 400);
  }

  // 同一学校内のクラス名重複チェック（UNIQUE(school_id, name) の事前確認）
  const nameDuplicate = await env.DB.prepare('SELECT id FROM classes WHERE school_id = ? AND name = ?')
    .bind(user.school_id, name)
    .first();
  if (nameDuplicate) return respond({ error: '同名のクラスが既に存在します' }, 400);

  const result = await env.DB.prepare(
    'INSERT INTO classes (school_id, name, grade, teacher_id) VALUES (?, ?, ?, ?)',
  )
    .bind(user.school_id, name, grade, teacherId)
    .run();

  return respond(
    {
      ok: true,
      class: { id: result.meta.last_row_id, school_id: user.school_id, name, grade, teacher_id: teacherId },
    },
    201,
  );
}

/** GET /api/classes — 自校のクラス一覧 */
async function handleListClasses(ctx) {
  const { env, respond, user } = ctx;
  const rows = await env.DB.prepare(
    'SELECT id, name, grade, teacher_id FROM classes WHERE school_id = ? ORDER BY id',
  )
    .bind(user.school_id)
    .all();
  return respond({ classes: rows.results ?? [] });
}

// ---------------------------------------------------------------------------
// 教師管理
// ---------------------------------------------------------------------------

/** POST /api/teachers（管理者専用）— { login_id, pin, name, class_id? } */
async function handleCreateTeacher(ctx) {
  const { env, request, respond, user, ipHash } = ctx;
  if (user.role !== 'school_admin') return respond({ error: '権限がありません' }, 403);

  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const loginId = asString(body.login_id);
  const pin = asString(body.pin);
  const name = asString(body.name);
  const classId = asIntOrNull(body.class_id);
  if (!loginId || !isValidPin(pin) || !name) {
    return respond({ error: '入力内容が不正です' }, 400);
  }

  // class_id 指定時は自校のクラスであることを確認
  if (classId !== null) {
    const targetClass = await env.DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?')
      .bind(classId, user.school_id)
      .first();
    if (!targetClass) return respond({ error: '指定されたクラスが見つかりません' }, 400);
  }

  // 同一学校内のログイン ID 重複チェック（school_id 条件は必須）
  const loginDuplicate = await env.DB.prepare('SELECT id FROM users WHERE school_id = ? AND login_id = ?')
    .bind(user.school_id, loginId)
    .first();
  if (loginDuplicate) return respond({ error: 'このログインIDは既に使用されています' }, 400);

  // 教師ユーザーを作成
  const salt = makeSalt();
  const pinHash = await hashPin(pin, salt);
  const result = await env.DB.prepare(
    `INSERT INTO users (school_id, role, login_id, pin_hash, salt, name, class_id, is_active)
     VALUES (?, 'teacher', ?, ?, ?, ?, ?, 1)`,
  )
    .bind(user.school_id, loginId, pinHash, salt, name, classId)
    .run();
  const teacherUserId = result.meta.last_row_id;

  // 監査ログ記録
  await writeAuditLog(env, {
    schoolId: user.school_id,
    userId: user.id,
    action: 'teacher.create',
    targetType: 'user',
    targetId: teacherUserId,
    afterData: { login_id: loginId, name, class_id: classId },
    ipHash,
  });

  return respond(
    { ok: true, teacher: { id: teacherUserId, login_id: loginId, name, class_id: classId, role: 'teacher' } },
    201,
  );
}

// ---------------------------------------------------------------------------
// 生徒管理
// ---------------------------------------------------------------------------

/**
 * POST /api/students（管理者 / 教師）— { class_id, student_number, pin, name }
 * クラス名をクラスコード代わりに用い、login_id = `${クラス名}:${出席番号}` を生成する。
 * （生徒ログインの login_id 生成規則と一致させる）
 */
async function handleCreateStudent(ctx) {
  const { env, request, respond, user, ipHash } = ctx;
  if (!requireRole(user, ['school_admin', 'teacher'])) return respond({ error: '権限がありません' }, 403);

  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const classId = asIntOrNull(body.class_id);
  const studentNumber = asString(body.student_number);
  const pin = asString(body.pin);
  const name = asString(body.name);
  if (classId === null || !isValidStudentNumber(studentNumber) || !isValidPin(pin) || !name) {
    return respond({ error: '入力内容が不正です' }, 400);
  }

  // 対象クラスが自校に存在することを確認（school_id 条件は必須）
  const targetClass = await env.DB.prepare('SELECT id, name FROM classes WHERE id = ? AND school_id = ?')
    .bind(classId, user.school_id)
    .first();
  if (!targetClass) return respond({ error: 'クラスが見つかりません' }, 404);

  // クラスコードから login_id を生成
  const classCode = asString(targetClass.name);
  const loginId = `${classCode}:${studentNumber}`;

  // 同一学校内のログイン ID 重複チェック
  const loginDuplicate = await env.DB.prepare('SELECT id FROM users WHERE school_id = ? AND login_id = ?')
    .bind(user.school_id, loginId)
    .first();
  if (loginDuplicate) return respond({ error: 'この生徒のログインIDは既に存在します' }, 400);

  // 生徒ユーザーを作成
  const salt = makeSalt();
  const pinHash = await hashPin(pin, salt);
  const result = await env.DB.prepare(
    `INSERT INTO users (school_id, role, login_id, pin_hash, salt, name, class_id, student_number, is_active)
     VALUES (?, 'student', ?, ?, ?, ?, ?, ?, 1)`,
  )
    .bind(user.school_id, loginId, pinHash, salt, name, classId, parseInt(studentNumber, 10))
    .run();
  const studentUserId = result.meta.last_row_id;

  // 監査ログ記録
  await writeAuditLog(env, {
    schoolId: user.school_id,
    userId: user.id,
    action: 'student.create',
    targetType: 'user',
    targetId: studentUserId,
    afterData: { login_id: loginId, name, class_id: classId, student_number: studentNumber },
    ipHash,
  });

  return respond(
    {
      ok: true,
      student: {
        id: studentUserId,
        login_id: loginId,
        name,
        class_id: classId,
        student_number: studentNumber,
        role: 'student',
      },
    },
    201,
  );
}

/**
 * GET /api/students?class_id= — 自校の生徒一覧
 * （ハッシュ系を含まず id / name / student_number / class_id のみ返却）
 */
async function handleListStudents(ctx) {
  const { env, respond, user, url } = ctx;
  const classId = asIntOrNull(url.searchParams.get('class_id'));
  if (classId === null) return respond({ error: 'class_id は必須です' }, 400);

  // クラスが自校のものであることを確認（school_id 条件は必須）
  const targetClass = await env.DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?')
    .bind(classId, user.school_id)
    .first();
  if (!targetClass) return respond({ error: 'クラスが見つかりません' }, 404);

  const rows = await env.DB.prepare(
    `SELECT id, name, student_number, class_id
     FROM users
     WHERE school_id = ? AND class_id = ? AND role = 'student' AND is_active = 1
     ORDER BY student_number, id`,
  )
    .bind(user.school_id, classId)
    .all();
  return respond({ students: rows.results ?? [] });
}

// ---------------------------------------------------------------------------
// 出席管理
// ---------------------------------------------------------------------------

/**
 * POST /api/attendance（教師。管理者も可）
 * { class_id, date, records: [{ student_id, status, note? }] }
 * attendance は (student_id, date) でユニークのため UPSERT する。
 */
async function handleRecordAttendance(ctx) {
  const { env, request, respond, user, ipHash } = ctx;
  if (!requireRole(user, ['teacher', 'school_admin'])) return respond({ error: '権限がありません' }, 403);

  const body = await parseJsonBody(request);
  if (!body) return respond({ error: 'リクエストボディが不正です' }, 400);

  const classId = asIntOrNull(body.class_id);
  const date = asString(body.date);
  if (classId === null) return respond({ error: 'class_id は必須です' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return respond({ error: 'date は YYYY-MM-DD 形式で指定してください' }, 400);
  }
  if (!Array.isArray(body.records) || body.records.length === 0) {
    return respond({ error: 'records は空でない配列で指定してください' }, 400);
  }

  // 各レコードの検証（status は許可値のみ / student_id は正の整数）
  const studentIds = new Set();
  for (const record of body.records) {
    if (!record || typeof record !== 'object') {
      return respond({ error: 'records の要素が不正です' }, 400);
    }
    const studentId = asIntOrNull(record.student_id);
    if (studentId === null) return respond({ error: 'student_id が不正です' }, 400);
    if (!ATTENDANCE_STATUSES.includes(record.status)) {
      return respond({ error: 'status は present/absent/late/leave のいずれかです' }, 400);
    }
    studentIds.add(studentId);
  }

  // クラスが自校のものであることを確認（school_id 条件は必須）
  const targetClass = await env.DB.prepare('SELECT id FROM classes WHERE id = ? AND school_id = ?')
    .bind(classId, user.school_id)
    .first();
  if (!targetClass) return respond({ error: 'クラスが見つかりません' }, 404);

  // 対象生徒が全員「自校 × 当該クラス」の在籍生徒であることを確認
  const uniqueIds = Array.from(studentIds);
  const placeholders = uniqueIds.map(() => '?').join(',');
  const foundStudents = await env.DB.prepare(
    `SELECT id FROM users
     WHERE school_id = ? AND class_id = ? AND role = 'student' AND id IN (${placeholders})`,
  )
    .bind(user.school_id, classId, ...uniqueIds)
    .all();
  if ((foundStudents.results?.length ?? 0) !== uniqueIds.length) {
    return respond({ error: '対象生徒が見つかりません' }, 400);
  }

  // UPSERT を一括実行（同一生徒・同一日付は更新）
  const statements = body.records.map((record) =>
    env.DB.prepare(
      `INSERT INTO attendance (school_id, class_id, student_id, date, status, recorded_by, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, date) DO UPDATE SET
         class_id = excluded.class_id,
         status = excluded.status,
         recorded_by = excluded.recorded_by,
         note = excluded.note,
         updated_at = datetime('now')`,
    ).bind(
      user.school_id,
      classId,
      asIntOrNull(record.student_id),
      date,
      record.status,
      user.id,
      record.note === undefined || record.note === null ? null : asString(record.note),
    ),
  );
  await env.DB.batch(statements);

  // 監査ログ記録
  await writeAuditLog(env, {
    schoolId: user.school_id,
    userId: user.id,
    action: 'attendance.upsert',
    targetType: 'class',
    targetId: classId,
    afterData: { date, count: body.records.length },
    ipHash,
  });

  return respond({ ok: true, saved: body.records.length });
}

/** GET /api/attendance?class_id=&date= — 当該日の出席一覧 */
async function handleGetAttendance(ctx) {
  const { env, respond, user, url } = ctx;
  const classId = asIntOrNull(url.searchParams.get('class_id'));
  const date = asString(url.searchParams.get('date'));
  if (classId === null || !date) return respond({ error: 'class_id と date は必須です' }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return respond({ error: 'date は YYYY-MM-DD 形式で指定してください' }, 400);
  }

  const rows = await env.DB.prepare(
    `SELECT id, class_id, student_id, date, status, recorded_by, note
     FROM attendance
     WHERE school_id = ? AND class_id = ? AND date = ?
     ORDER BY student_id`,
  )
    .bind(user.school_id, classId, date)
    .all();
  return respond({ attendance: rows.results ?? [] });
}

// ---------------------------------------------------------------------------
// エントリポイント
// ---------------------------------------------------------------------------

export default {
  /** リクエストのルーティングを行う */
  async fetch(request, env, ctx) {
    // 全レスポンスへ付与する CORS ヘッダを先に確定させる
    const corsHeaders = getCorsHeaders(request, env);
    const respond = (data, status = 200, extraHeaders = {}) => json(data, status, extraHeaders, corsHeaders);
    /** ハンドラ共通コンテキスト */
    const requestContext = { env, request, respond };

    try {
      // プリフライトリクエストは即応答する
      if (request.method === 'OPTIONS') return handleOptions(corsHeaders);

      const url = new URL(request.url);
      // 末尾スラッシュを正規化してルーティング判定に使う
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
      const method = request.method;
      requestContext.url = url;

      // CSRF 保護: 状態変更リクエストで Origin ヘッダを検証
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('Origin');
        const allowedOrigins = String(env.FRONTEND_ORIGIN || '')
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
        if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
          return new Response(JSON.stringify({ error: 'CSRF check failed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json; charset=UTF-8', ...getCorsHeaders(new Request(''), { FRONTEND_ORIGIN: '' }) },
          });
        }
      }

      const url = new URL(request.url);
      // 末尾スラッシュを正規化してルーティング判定に使う
      const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
      const method = request.method;
      requestContext.url = new URL(request.url);

      // ---- 公開エンドポイント ----
      if (method === 'GET' && path === '/') {
        return respond({ ok: true, name: 'atnhub-api', version: '2.2' });
      }

      if (method === 'POST' && path === '/api/schools/bootstrap') {
        requestContext.ipHash = await sha256hex(getClientIP(request));
        return await handleBootstrap(requestContext);
      }

      if (method === 'POST' && path === '/api/auth/login') {
        return await handleStudentLogin(requestContext);
      }
      if (method === 'POST' && path === '/api/auth/login/admin') {
        return await handleStaffLogin(requestContext, 'school_admin');
      }
      if (method === 'POST' && path === '/api/auth/login/teacher') {
        return await handleStaffLogin(requestContext, 'teacher');
      }

      // ---- 認証必須エンドポイント ----
      const user = await authenticate(request, env);
      if (!user) return respond({ error: '認証が必要です' }, 401);
      requestContext.user = user;
      requestContext.ipHash = await sha256hex(getClientIP(request));

      if (method === 'POST' && path === '/api/auth/logout') {
        return await handleLogout(requestContext);
      }
      if (method === 'GET' && path === '/api/me') {
        return respond({ user: sanitizeUser(user) });
      }

      if (path === '/api/classes') {
        if (method === 'GET') return await handleListClasses(requestContext);
        if (method === 'POST') return await handleCreateClass(requestContext);
      }

      if (path === '/api/teachers' && method === 'POST') {
        return await handleCreateTeacher(requestContext);
      }

      if (path === '/api/students') {
        if (method === 'GET') return await handleListStudents(requestContext);
        if (method === 'POST') return await handleCreateStudent(requestContext);
      }

      if (path === '/api/attendance') {
        if (method === 'GET') return await handleGetAttendance(requestContext);
        if (method === 'POST') return await handleRecordAttendance(requestContext);
      }

      // 未定義ルート
      return respond({ error: 'Not Found' }, 404);
    } catch (error) {
      // 予期しない例外は詳細を漏らさず 500 を返す（詳細はログのみ）
      console.error('[atnhub] unhandled error:', error instanceof Error ? error.message : error);
      return respond({ error: 'サーバーエラーが発生しました' }, 500);
    }
  },
};
