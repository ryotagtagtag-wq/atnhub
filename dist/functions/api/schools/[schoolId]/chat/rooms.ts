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
    const rooms = await env.DB.prepare(
      'SELECT * FROM chat_rooms WHERE school_id = ? ORDER BY created_at DESC'
    ).bind(schoolId).all()
    return new Response(JSON.stringify({ rooms: rooms.results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'POST') {
    const { name, type, member_ids } = await request.json()

    if (!name || !type) {
      return new Response(JSON.stringify({ error: 'name と type は必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await env.DB.prepare(
      'INSERT INTO chat_rooms (id, school_id, name, type, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(roomId, schoolId, name, type, 'teacher_001', new Date().toISOString()).run()

    if (member_ids && member_ids.length > 0) {
      for (const memberId of member_ids) {
        await env.DB.prepare(
          'INSERT INTO chat_room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)'
        ).bind(roomId, memberId, new Date().toISOString()).run()
      }
    }

    return new Response(JSON.stringify({ id: roomId, name, type }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
