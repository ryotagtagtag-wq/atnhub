-- Atnhub (アテンハブ) - 出席管理システム
-- Cloudflare D1 (SQLite) 用スキーマ
-- 学校単位テナント分離: 全テーブルに school_id 必須、全クエリ WHERE school_id=?

-- ============================================================
-- 1. 学校テーブル（テナント最上位）
-- ============================================================
CREATE TABLE schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 学校名
  slug TEXT NOT NULL UNIQUE,             -- URL用スラッグ（英数ハイフン）
  code TEXT NOT NULL UNIQUE,             -- 学校コード（6桁英数）
  contact_email TEXT,                    -- 連絡用メール（任意）
  settings TEXT,                         -- JSON設定（拡張用）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. ユーザーテーブル（3ロール: school_admin / teacher / student）
-- ============================================================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('school_admin','teacher','student')),
  login_id TEXT NOT NULL,                -- ログインID（学校内ユニーク、全体では非ユニーク）
  pin_hash TEXT NOT NULL,                -- PBKDF2-SHA256ハッシュ
  salt TEXT NOT NULL,                    -- ユーザーごとのソルト
  name TEXT NOT NULL,                    -- 氏名
  class_id INTEGER,                      -- クラスID（studentのみ必須、teacherは担任クラス、adminはNULL）
  student_number INTEGER,                -- 出席番号（studentのみ）
  is_active INTEGER DEFAULT 1,           -- 有効/無効フラグ
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);
-- 同一学校内で login_id ユニーク
CREATE UNIQUE INDEX idx_users_school_login ON users(school_id, login_id);
-- school_id + role での検索用
CREATE INDEX idx_users_school_role ON users(school_id, role);
-- class_id での検索用
CREATE INDEX idx_users_class ON users(class_id);

-- ============================================================
-- 3. クラステーブル
-- ============================================================
CREATE TABLE classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  name TEXT NOT NULL,                    -- クラス名（例: "3年A組"）
  grade INTEGER,                         -- 学年（例: 3）
  teacher_id INTEGER,                    -- 担任教師ID
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE UNIQUE INDEX idx_classes_school_name ON classes(school_id, name);

-- ============================================================
-- 4. セッショントークンテーブル
-- ============================================================
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,                -- 32バイトhex
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,              -- ISO8601
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- 5. ログイン試行履歴テーブル（レート制限・ロック用）
-- ============================================================
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  login_id TEXT,                         -- 存在しないIDの場合も記録
  ip_hash TEXT NOT NULL,                 -- IPのSHA256ハッシュ
  success INTEGER NOT NULL,              -- 0=失敗, 1=成功
  attempted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (school_id) REFERENCES schools(id)
);
CREATE INDEX idx_login_attempts_school_ip_time ON login_attempts(school_id, ip_hash, attempted_at);
CREATE INDEX idx_login_attempts_school_login_time ON login_attempts(school_id, login_id, attempted_at);

-- ============================================================
-- 6. 出席テーブル
-- ============================================================
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,                    -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'present', -- present/absent/late/leave
  recorded_by INTEGER NOT NULL,          -- 記録者（teacher_id）
  note TEXT,                             -- 備考（任意）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
-- 同一学生の同一日付は一意（教師修正はUPDATE）
CREATE UNIQUE INDEX idx_attendance_student_date ON attendance(student_id, date);
-- 日付・クラスでの検索用
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
-- school_id + date での集計用
CREATE INDEX idx_attendance_school_date ON attendance(school_id, date);

-- ============================================================
-- 7. 監査ログテーブル（重要操作の履歴）
-- ============================================================
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,                  -- 操作種別
  target_type TEXT,                      -- 対象タイプ
  target_id INTEGER,                     -- 対象ID
  before_data TEXT,                      -- 変更前JSON
  after_data TEXT,                       -- 変更後JSON
  ip_hash TEXT,                          -- 実行者IPハッシュ
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_audit_school_time ON audit_logs(school_id, created_at);
