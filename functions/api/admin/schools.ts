import { cors } from 'hono/cors'

export async function onRequest(context) {
  const { request, env } = context
  
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
    const schools = await env.DB.prepare(
      'SELECT * FROM schools ORDER BY created_at DESC'
    ).all()
    return new Response(JSON.stringify({ schools: schools.results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'POST') {
    const { name, subdomain } = await request.json()

    if (!name || !subdomain) {
      return new Response(JSON.stringify({ error: 'name と subdomain は必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const schoolId = `school_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await env.DB.prepare(
      'INSERT INTO schools (id, name, subdomain, created_at) VALUES (?, ?, ?, ?)'
    ).bind(schoolId, name, subdomain, new Date().toISOString()).run()

    return new Response(JSON.stringify({ id: schoolId, name, subdomain }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
