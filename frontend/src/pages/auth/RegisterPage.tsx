import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    school_name: '',
    subdomain: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.admin_password !== formData.confirm_password) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    try {
      await api.registerSchool({
        school_name: formData.school_name,
        subdomain: formData.subdomain,
        admin_email: formData.admin_email,
        admin_password: formData.admin_password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 bg-clip-text text-transparent">
            atnhub
          </h1>
          <p className="mt-2 text-primary-600">学校登録</p>
        </div>

        {success ? (
          <Card variant="elevated" padding="lg">
            <CardContent className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">登録が完了しました！</h2>
              <p className="mt-2 text-gray-500 text-sm">
                ログインページへ移動します...<br />
                登録した管理者アカウントでログインできます。
              </p>
              <Link to="/login" className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium">
                今すぐログイン →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>新しい学校を登録</CardTitle>
              <CardDescription>学校情報と管理者アカウントを作成します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="学校名"
                  value={formData.school_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, school_name: e.target.value }))}
                  placeholder="例: デモ中学校"
                  required
                />

                <Input
                  label="サブドメイン"
                  value={formData.subdomain}
                  onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase() }))}
                  placeholder="例: demo-school"
                  required
                  helperText="英小文字・数字・ハイフンのみ（URLで使用します）"
                  pattern="[a-z0-9-]+"
                />

                <Input
                  label="管理者メールアドレス"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="admin@example-school.ed.jp"
                  required
                  autoComplete="email"
                />

                <Input
                  label="管理者パスワード"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                  placeholder="8文字以上"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

                <Input
                  label="パスワード（確認）"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder="同じパスワードを入力"
                  required
                  autoComplete="new-password"
                />

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm" role="alert">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  学校を登録する
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                既にアカウントをお持ちですか？{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  ログイン
                </Link>
              </p>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-gray-500 text-sm">
          © 2026 atnhub. All rights reserved.
        </p>
      </div>
    </div>
  )
}
