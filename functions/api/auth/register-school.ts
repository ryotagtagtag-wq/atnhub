export async function onRequest(context: any) {
  const { request, env } = context

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { school_name, subdomain, admin_email, admin_password } = await request.json()

    // バリデーション
    if (!school_name || !subdomain || !admin_email || !admin_password) {
      return new Response(JSON.stringify({ error: '全項目が必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return new Response(JSON.stringify({ error: 'サブドメインは英小文字・数字・ハイフンのみ使用できます' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (admin_password.length < 8) {
      return new Response(JSON.stringify({ error: 'パスワードは8文字以上にしてください' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
      return new Response(JSON.stringify({ error: '有効なメールアドレスを入力してください' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // サブドメイン重複チェック
    const existingSchool = await env.DB.prepare(
      'SELECT id FROM schools WHERE subdomain = ?'
    ).bind(subdomain).first()
    if (existingSchool) {
      return new Response(JSON.stringify({ error: 'このサブドメインは既に使用されています' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // メールアドレス重複チェック
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(admin_email).first()
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'このメールアドレスは既に登録されています' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date().toISOString()
    const schoolId = `school_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const adminId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    // 学校作成
    await env.DB.prepare(
      'INSERT INTO schools (id, name, subdomain, created_at) VALUES (?, ?, ?, ?)'
    ).bind(schoolId, school_name, subdomain, now).run()

    // 管理者ユーザー作成（school_idは学校IDに紐付け）
    await env.DB.prepare(
      'INSERT INTO users (id, school_id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(adminId, schoolId, admin_email, admin_password, `${school_name} 管理者`, 'admin', now).run()

    return new Response(JSON.stringify({
      school: { id: schoolId, name: school_name, subdomain },
      admin: { id: adminId, email: admin_email, role: 'admin' },
      message: '学校を登録しました',
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'サーバーエラーが発生しました' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
