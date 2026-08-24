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
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const user_id = url.searchParams.get('user_id')

    let query = 'SELECT * FROM attendance WHERE school_id = ?'
    const params: (string | number)[] = [schoolId]

    if (date) {
      query += ' AND date = ?'
      params.push(date)
    }
    if (user_id) {
      query += ' AND user_id = ?'
      params.push(user_id)
    }

    query += ' ORDER BY date DESC, created_at DESC'

    const attendance = await env.DB.prepare(query).bind(...params).all()
    return new Response(JSON.stringify({ attendance: attendance.results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (request.method === 'POST') {
    const { user_id, date, status, note } = await request.json()

    if (!user_id || !date || !status) {
      return new Response(JSON.stringify({ error: 'user_id, date, status は必須です' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const validStatuses = ['present', 'absent', 'late', 'early_leave']
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: '無効なステータスです' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM attendance WHERE school_id = ? AND user_id = ? AND date = ?'
    ).bind(schoolId, user_id, date).first()

    if (existing) {
      await env.DB.prepare(
        'UPDATE attendance SET status = ?, note = ?, updated_at = ? WHERE id = ?'
      ).bind(status, note || '', new Date().toISOString(), existing.id).run()
      return new Response(JSON.stringify({ id: existing.id, message: '更新しました' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await env.DB.prepare(
        'INSERT INTO attendance (id, school_id, user_id, date, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, schoolId, user_id, date, status, note || '', new Date().toISOString(), new Date().toISOString()).run()
      return new Response(JSON.stringify({ id, message: '作成しました' }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
