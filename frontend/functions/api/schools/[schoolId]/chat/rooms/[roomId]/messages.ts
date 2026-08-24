export async function onRequest(context) {
  const { request, env, params } = context
  const schoolId = params.schoolId
  const roomId = params.roomId
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // ルームの存在確認
  const room = await env.DB.prepare(
    'SELECT id FROM chat_rooms WHERE id = ? AND school_id = ?'
  ).bind(roomId, schoolId).first()

  if (!room) {
    return new Response(JSON.stringify({ error: 'ルームが見つかりません' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const limit = url.searchParams.get('limit') || '50'
    const before = url.searchParams.get('before')

    let query = 'SELECT m.*, u.name as user_name FROM messages m JOIN users u ON m.user_id = u.id WHERE m.room_id = ?'
    const queryParams: (string | number)[] = [roomId]

    if (before) {
      query += ' AND m.created_at < ?'
      queryParams.push(before)
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?'
    queryParams.push(parseInt(limit, 10))

    const messages = await env.DB.prepare(query).bind(...queryParams).all()
    return new Response(JSON.stringify({ messages: messages.results.reverse() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'POST') {
    const { user_id, content } = await request.json()

    if (!user_id || !content) {
      return new Response(JSON.stringify({ error: 'user_id と content は必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    await env.DB.prepare(
      'INSERT INTO messages (id, room_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(messageId, roomId, user_id, content, new Date().toISOString()).run()

    return new Response(JSON.stringify({ id: messageId, room_id: roomId, user_id, content, created_at: new Date().toISOString() }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
