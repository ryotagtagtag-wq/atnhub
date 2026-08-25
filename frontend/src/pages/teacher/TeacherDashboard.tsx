import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { api, Attendance, User, ChatRoom, Message, STATUS_LABELS, STATUS_COLORS, ROOM_TYPE_LABELS } from '../../api/client'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../../components/ui'

type Tab = 'attendance' | 'chat' | 'students'

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('attendance')
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', type: 'class' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/login')
      return
    }
    loadData()
  }, [user, navigate])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [attRes, stuRes, roomRes] = await Promise.all([
        api.getAttendance(user.school_id, { date }),
        api.getUsers(user.school_id),
        api.getChatRooms(user.school_id),
      ])
      setAttendance(attRes.attendance)
      setStudents(stuRes.users.filter(u => u.role === 'student'))
      setRooms(roomRes.rooms)
      if (roomRes.rooms.length > 0) {
        setActiveRoom(prev => prev ?? roomRes.rooms[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadMessages = async () => {
      if (activeRoom && user) {
        try {
          const res = await api.getMessages(user.school_id, activeRoom.id)
          setMessages(res.messages)
        } catch (err) {
          console.error(err)
        }
      }
    }
    loadMessages()
  }, [activeRoom, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAttendanceChange = async (studentId: string, status: Attendance['status']) => {
    if (!user) return
    try {
      await api.createAttendance(user.school_id, { user_id: studentId, date, status })
      setAttendance(prev => {
        const existing = prev.find(a => a.user_id === studentId)
        if (existing) {
          return prev.map(a => a.user_id === studentId ? { ...a, status, updated_at: new Date().toISOString() } : a)
        }
        return [...prev, { id: `temp-${Date.now()}`, school_id: user.school_id, user_id: studentId, date, status, note: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })
    } catch (err) {
      console.error(err)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoom || !user) return
    const msg = newMessage
    setNewMessage('')
    try {
      await api.sendMessage(user.school_id, activeRoom.id, { user_id: user.id, content: msg })
      const res = await api.getMessages(user.school_id, activeRoom.id)
      setMessages(res.messages)
    } catch (err) {
      console.error(err)
      setNewMessage(msg)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      await api.createChatRoom(user.school_id, newRoom)
      const res = await api.getChatRooms(user.school_id)
      setRooms(res.rooms)
      setShowCreateRoom(false)
      setNewRoom({ name: '', type: 'class' })
    } catch (err) {
      console.error(err)
    }
  }

  const changeDate = (newDate: string) => {
    setDate(newDate)
    if (user) {
      api.getAttendance(user.school_id, { date: newDate }).then(res => setAttendance(res.attendance)).catch(console.error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const todayAttendance = students.map(student => {
    const record = attendance.find(a => a.user_id === student.id)
    return { student, record }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">atnhub</h1>
                <p className="text-xs text-gray-500">教師ダッシュボード</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2">
          {(['attendance', 'chat', 'students'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'attendance' ? '出席管理' : t === 'chat' ? 'チャット' : '生徒一覧'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 出席管理タブ */}
        {tab === 'attendance' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">日付:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => changeDate(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button variant="outline" size="sm" onClick={() => changeDate(format(new Date(), 'yyyy-MM-dd'))}>
                    今日
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">生徒</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">現在の状態</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">記録</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {todayAttendance.map(({ student, record }) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.login_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {record ? (
                              <Badge className={STATUS_COLORS[record.status]}>
                                {STATUS_LABELS[record.status]}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">未記録</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2">
                              {(['present', 'absent', 'late', 'early_leave'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => handleAttendanceChange(student.id, status)}
                                  disabled={record?.status === status}
                                  className={`px-3 py-1.5 text-xs rounded-xl transition-colors ${
                                    record?.status === status
                                      ? 'bg-primary-600 text-white font-medium'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {STATUS_LABELS[status]}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* チャットタブ */}
        {tab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ルーム一覧 */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">チャットルーム</CardTitle>
                  <Button size="sm" onClick={() => setShowCreateRoom(true)}>+ 新規</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {rooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        activeRoom?.id === room.id ? 'bg-primary-50' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm truncate">{room.name}</p>
                      <p className="text-xs text-gray-500">{ROOM_TYPE_LABELS[room.type]}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* チャットエリア */}
            <Card className="lg:col-span-2 flex flex-col">
              {activeRoom ? (
                <>
                  <CardHeader className="border-b border-gray-100">
                    <CardTitle>{activeRoom.name}</CardTitle>
                    <CardDescription>{ROOM_TYPE_LABELS[activeRoom.type]}・{messages.length}件</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                          <p>メッセージがありません</p>
                          <p className="text-sm">最初のメッセージを送信しましょう</p>
                        </div>
                      ) : (
                        messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              msg.user_id === user?.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.user_id === user?.id ? 'text-primary-100' : 'text-gray-400'}`}>
                                {msg.user_name}・{format(new Date(msg.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="p-4 border-t border-gray-100 flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="メッセージを入力..."
                        className="flex-1"
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim()}>送信</Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-gray-400">チャットルームを選択してください</p>
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* 生徒一覧タブ */}
        {tab === 'students' && (
          <Card>
            <CardHeader>
              <CardTitle>生徒一覧</CardTitle>
              <CardDescription>{students.length}名が登録されています</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">生徒</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ログインID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">本日の出席</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">登録日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map(student => {
                      const record = attendance.find(a => a.user_id === student.id)
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                {student.name.charAt(0)}
                              </div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-600">{student.login_id}</td>
                          <td className="px-4 py-4">
                            {record ? (
                              <Badge className={STATUS_COLORS[record.status]}>
                                {STATUS_LABELS[record.status]}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">未記録</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-gray-500 text-sm">
                            {format(new Date(student.created_at), 'yyyy/MM/dd')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* ルーム作成モーダル */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">新しいチャットルーム</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <Input label="ルーム名" value={newRoom.name} onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))} placeholder="例: 1年A組" required />
              <Select
                label="タイプ"
                value={newRoom.type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
                options={[
                  { value: 'class', label: 'クラス' },
                  { value: 'grade', label: '学年' },
                  { value: 'club', label: '部活' },
                  { value: 'staff', label: '職員室' },
                ]}
              />
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setShowCreateRoom(false)} className="flex-1">キャンセル</Button>
                <Button type="submit" className="flex-1">作成</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
