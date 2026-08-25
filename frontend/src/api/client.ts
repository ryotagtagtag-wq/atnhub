const API_BASE = '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options

  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }

  const token = localStorage.getItem('auth_token')
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...headers,
  }

  const response = await fetch(url.toString(), {
    ...restOptions,
    headers: defaultHeaders,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'リクエストに失敗しました' }))
    throw new Error(error.error || `HTTPエラー ${response.status}`)
  }

  return response.json()
}

export const api = {
  // 認証
  login: (data: { login_id: string; password: string; school_id: string }) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 学校登録（新規）
  registerSchool: (data: { school_name: string; subdomain: string; admin_email: string; admin_password: string }) =>
    request<RegisterSchoolResponse>('/auth/register-school', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 管理者
  getSchools: () => request<{ schools: School[] }>('/admin/schools'),
  createSchool: (data: { name: string; subdomain: string }) =>
    request<School>('/admin/schools', { method: 'POST', body: JSON.stringify(data) }),

  // ユーザー
  getUsers: (schoolId: string) => request<{ users: User[] }>(`/schools/${schoolId}/users`),
  createUser: (schoolId: string, data: { login_id: string; password: string; name: string; role: string }) =>
    request<User>(`/schools/${schoolId}/users`, { method: 'POST', body: JSON.stringify(data) }),

  // 出席
  getAttendance: (schoolId: string, params?: { date?: string; user_id?: string }) =>
    request<{ attendance: Attendance[] }>(`/schools/${schoolId}/attendance`, { params }),
  createAttendance: (schoolId: string, data: { user_id: string; date: string; status: string; note?: string }) =>
    request<Attendance>(`/schools/${schoolId}/attendance`, { method: 'POST', body: JSON.stringify(data) }),

  // チャットルーム
  getChatRooms: (schoolId: string) => request<{ rooms: ChatRoom[] }>(`/schools/${schoolId}/chat/rooms`),
  createChatRoom: (schoolId: string, data: { name: string; type: string; member_ids?: string[] }) =>
    request<ChatRoom>(`/schools/${schoolId}/chat/rooms`, { method: 'POST', body: JSON.stringify(data) }),

  // メッセージ
  getMessages: (schoolId: string, roomId: string, params?: { limit?: string; before?: string }) =>
    request<{ messages: Message[] }>(`/schools/${schoolId}/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (schoolId: string, roomId: string, data: { user_id: string; content: string }) =>
    request<Message>(`/schools/${schoolId}/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
}

// 型定義
export interface User {
  id: string
  school_id: string
  login_id: string | null
  email: string | null
  name: string
  role: 'admin' | 'teacher' | 'student'
  created_at: string
}

export interface School {
  id: string
  name: string
  subdomain: string
  created_at: string
}

export interface RegisterSchoolResponse {
  school: School
  admin: { id: string; email: string; role: string }
  message: string
}

export interface Attendance {
  id: string
  school_id: string
  user_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'early_leave'
  note: string
  created_at: string
  updated_at: string
  user_name?: string
}

export interface ChatRoom {
  id: string
  school_id: string
  name: string
  type: 'class' | 'grade' | 'club' | 'staff' | 'direct'
  created_by: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  room_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_name?: string
}

export const STATUS_LABELS: Record<Attendance['status'], string> = {
  present: '出席',
  absent: '欠席',
  late: '遅刻',
  early_leave: '早退',
}

export const STATUS_COLORS: Record<Attendance['status'], string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  late: 'bg-yellow-100 text-yellow-800',
  early_leave: 'bg-blue-100 text-blue-800',
}

export const ROOM_TYPE_LABELS: Record<ChatRoom['type'], string> = {
  class: 'クラス',
  grade: '学年',
  club: '部活',
  staff: '職員室',
  direct: 'DM',
}
