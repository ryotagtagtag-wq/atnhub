import { cors } from 'hono/cors'

export async function onRequest(context) {
  const { request, env } = context
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { login_id, password, school_id } = await request.json()

    if (!login_id || !password || !school_id) {
      return new Response(JSON.stringify({ error: 'login_id, password, school_id は必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let user
    if (school_id === 'admin') {
      const result = await env.DB.prepare(
        'SELECT * FROM users WHERE email = ? AND role = ?'
      ).bind(login_id, 'admin').first()
      user = result
    } else {
      const result = await env.DB.prepare(
        'SELECT * FROM users WHERE login_id = ? AND school_id = ?'
      ).bind(login_id, school_id).first()
      user = result
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'ユーザーが見つかりません' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (user.password !== password) {
      return new Response(JSON.stringify({ error: 'パスワードが違います' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        school_id: user.school_id,
        role: user.role,
        name: user.name,
      },
      token: `mock-token-${user.id}-${Date.now()}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
