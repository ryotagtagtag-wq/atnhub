export async function onRequest(context) {
  const { request, env, params } = context
  const schoolId = params.schoolId
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method === 'GET') {
    const users = await env.DB.prepare(
      'SELECT id, login_id, name, role, created_at FROM users WHERE school_id = ? ORDER BY created_at DESC'
    ).bind(schoolId).all()
    return new Response(JSON.stringify({ users: users.results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'POST') {
    const { login_id, password, name, role } = await request.json()

    if (!login_id || !password || !name || !role) {
      return new Response(JSON.stringify({ error: '全項目必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await env.DB.prepare(
      'INSERT INTO users (id, school_id, login_id, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, schoolId, login_id, password, name, role, new Date().toISOString()).run()

    return new Response(JSON.stringify({ id: userId, login_id, name, role }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
