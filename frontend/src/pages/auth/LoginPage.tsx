import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Select, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    login_id: '',
    password: '',
    school_id: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(formData.login_id, formData.password, formData.school_id)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 bg-clip-text text-transparent">
            atnhub
          </h1>
          <p className="mt-2 text-primary-600">学校向け出席管理プラットフォーム</p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>アカウントでサインインしてください</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Select
                label="役割"
                value={formData.school_id === 'admin' ? 'admin' : 'school'}
                onChange={(e) => setFormData(prev => ({ ...prev, school_id: e.target.value }))}
                options={[
                  { value: 'admin', label: '管理者 (admin@atnhub.ryopc.org)' },
                  { value: 'school_demo', label: '教師/生徒 (デモ中学校)' },
                ]}
                error={error && '認証に失敗しました'}
              />

              <Input
                label={formData.school_id === 'admin' ? 'メールアドレス' : 'ログインID'}
                type={formData.school_id === 'admin' ? 'email' : 'text'}
                value={formData.login_id}
                onChange={(e) => setFormData(prev => ({ ...prev, login_id: e.target.value }))}
                placeholder={formData.school_id === 'admin' ? 'admin@atnhub.ryopc.org' : 'teacher01 / student01'}
                required
                autoComplete={formData.school_id === 'admin' ? 'email' : 'username'}
              />

              <Input
                label="パスワード"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder={formData.school_id === 'admin' ? 'admin123' : 'pass123'}
                required
                autoComplete="current-password"
              />

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm" role="alert">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                ログイン
              </Button>
            </form>

            <div className="mt-6 p-4 rounded-xl bg-gray-50 text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-700">デモアカウント:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border">
                  <span className="font-medium text-primary-600">管理者:</span> admin@atnhub.ryopc.org / admin123
                </div>
                <div className="p-2 bg-white rounded-lg border">
                  <span className="font-medium text-green-600">教師:</span> teacher01 / pass123
                </div>
                <div className="p-2 bg-white rounded-lg border">
                  <span className="font-medium text-blue-600">生徒:</span> student01 / pass123
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-gray-500 text-sm">
          © 2026 atnhub. All rights reserved.
        </p>
      </div>
    </div>
  )
}
