import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import { api, Attendance, STATUS_LABELS, STATUS_COLORS } from '../../api/client'
import { Button, Card, CardContent, Badge } from '../../components/ui'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.role !== 'student') {
      navigate('/')
      return
    }
    loadData()
  }, [user, navigate])

  const loadData = async () => {
    if (!user) return
    try {
      const data = await api.getAttendance(user.school_id, { user_id: user.id })
      setAttendance(data.attendance)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // 直近30日分の出席状況
  const recent = attendance.slice(0, 30)
  const presentCount = attendance.filter(a => a.status === 'present').length
  const absentCount = attendance.filter(a => a.status === 'absent').length
  const lateCount = attendance.filter(a => a.status === 'late').length
  const earlyLeaveCount = attendance.filter(a => a.status === 'early_leave').length
  const total = attendance.length || 1
  const rate = Math.round((presentCount / total) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">atnhub</h1>
                <p className="text-xs text-gray-500">生徒ダッシュボード</p>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-primary-600">{rate}%</p>
              <p className="mt-1 text-xs text-gray-500">出席率</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-green-600">{presentCount}</p>
              <p className="mt-1 text-xs text-gray-500">出席</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-red-600">{absentCount}</p>
              <p className="mt-1 text-xs text-gray-500">欠席</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-yellow-600">{lateCount}</p>
              <p className="mt-1 text-xs text-gray-500">遅刻</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-blue-600">{earlyLeaveCount}</p>
              <p className="mt-1 text-xs text-gray-500">早退</p>
            </CardContent>
          </Card>
        </div>

        {/* 出席履歴 */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">出席履歴</h2>
            {recent.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">出席記録はまだありません</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recent.map(record => (
                  <div key={record.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(record.date), 'yyyy年M月d日 (EEE)', { locale: ja })}
                        </p>
                        {record.note && <p className="text-xs text-gray-500">{record.note}</p>}
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[record.status]}>
                      {STATUS_LABELS[record.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
