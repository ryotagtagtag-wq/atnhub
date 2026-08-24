import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router';
import { CircleAlert, CircleCheckBig, KeyRound, School } from 'lucide-react';
import { api } from '../../api/client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
} from '../../components/ui';

const SLUG_PATTERN = /^[a-z0-9-]{3,30}$/;
const PIN_PATTERN = /^\d{6}$/;

/** 学校名など任意テキストをスラッグ候補へ変換する（小文字化・英数字とハイフン以外をハイフンへ・両端のハイフン除去） */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** APIエラーを日本語のわかりやすいメッセージへ変換する */
function toFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return '学校の登録に失敗しました。しばらくしてからもう一度お試しください。';
  }
  const raw = error.message.toLowerCase();
  if (raw.includes('slug') || raw.includes('duplicate') || raw.includes('conflict')) {
    return '入力された識別子スラッグは既に使用されています。別のスラッグに変更してください。';
  }
  if (raw.includes('401') || raw.includes('unauthorized')) {
    return '認証に失敗しました。入力内容をご確認ください。';
  }
  return `学校の登録に失敗しました: ${error.message}`;
}

interface RegisterFormState {
  name: string;
  slug: string;
  adminLoginId: string;
  adminName: string;
  adminPin: string;
  adminPinConfirm: string;
}

const emptyForm: RegisterFormState = {
  name: '',
  slug: '',
  adminLoginId: '',
  adminName: '',
  adminPin: '',
  adminPinConfirm: '',
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>(emptyForm);
  const [slugEditedByUser, setSlugEditedByUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField =
    (field: keyof RegisterFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      if (field === 'slug') {
        setSlugEditedByUser(true);
        setForm((prev) => ({ ...prev, slug: value }));
        return;
      }

      setForm((prev) => {
        // 学校名からスラッグを自動生成（ユーザーが手動編集していない間のみ）
        if (field === 'name' && !slugEditedByUser) {
          return { ...prev, name: value, slug: slugify(value) };
        }
        return { ...prev, [field]: value };
      });
    };

  const validate = (): string | null => {
    if (form.name.trim() === '') return '学校名を入力してください。';
    if (!SLUG_PATTERN.test(form.slug)) {
      return '識別子スラッグは英小文字・数字・ハイフンで3〜30文字で入力してください。';
    }
    if (form.adminName.trim() === '') return '管理者名を入力してください。';
    if (form.adminLoginId.trim() === '') return '管理者ログインIDを入力してください。';
    if (!PIN_PATTERN.test(form.adminPin)) return 'PINは6桁の数字で入力してください。';
    if (form.adminPin !== form.adminPinConfirm) return 'PIN（確認）が一致していません。';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    // 境界で検証：不正な入力はここで止める
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.bootstrap({
        name: form.name.trim(),
        slug: form.slug,
        admin_login_id: form.adminLoginId.trim(),
        admin_pin: form.adminPin,
        admin_name: form.adminName.trim(),
      });
      setSchoolCode(response.school.code);
    } catch (error) {
      setErrorMessage(toFriendlyErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (schoolCode !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="text-center">
              <CircleCheckBig size={48} className="mx-auto text-success" aria-hidden />
              <CardHeader className="mt-4 text-xl">学校を登録しました 🎉</CardHeader>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                以下の<strong>学校コード</strong>を使ってログインできます。
                生徒・教師にも共有してください。
              </p>
              <div className="my-6 rounded-xl border-2 border-dashed border-primary/40 bg-primary-light/40 px-4 py-6">
                <p className="text-xs font-medium uppercase tracking-widest text-primary">
                  学校コード
                </p>
                <p className="mt-2 font-mono text-5xl font-bold tracking-widest text-primary">
                  {schoolCode}
                </p>
              </div>
              <Link to="/login" className="inline-block w-full">
                <Button className="w-full">ログインページへ</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pinMismatch = form.adminPinConfirm.length > 0 && form.adminPin !== form.adminPinConfirm;
  const slugInvalid = form.slug.length > 0 && !SLUG_PATTERN.test(form.slug);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-primary">ATN Hub</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            学校の新規登録（管理者アカウント作成）
          </p>
        </div>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <School size={18} aria-hidden />
            学校情報の入力
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger dark:bg-red-950 dark:text-red-300"
                >
                  <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <Label htmlFor="register-name">学校名</Label>
                <Input
                  id="register-name"
                  value={form.name}
                  onChange={updateField('name')}
                  placeholder="例: 静岡市立みなと小学校"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="register-slug">識別子スラッグ</Label>
                <Input
                  id="register-slug"
                  value={form.slug}
                  onChange={updateField('slug')}
                  placeholder="例: minato-es"
                  invalid={slugInvalid}
                />
                <p className={`mt-1 text-xs ${slugInvalid ? 'text-danger' : 'text-gray-500'}`}>
                  英小文字・数字・ハイフンのみ（3〜30文字）。未入力の場合、学校名から自動生成されます。
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="mb-3 flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <KeyRound size={14} aria-hidden />
                  管理者アカウント
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="register-admin-name">管理者名</Label>
                    <Input
                      id="register-admin-name"
                      value={form.adminName}
                      onChange={updateField('adminName')}
                      placeholder="例: 谷口 涼"
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-admin-login-id">管理者ログインID</Label>
                    <Input
                      id="register-admin-login-id"
                      value={form.adminLoginId}
                      onChange={updateField('adminLoginId')}
                      placeholder="例: admin-taniguchi"
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-admin-pin">PIN（6桁）</Label>
                    <Input
                      id="register-admin-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.adminPin}
                      onChange={updateField('adminPin')}
                      invalid={form.adminPin.length > 0 && !PIN_PATTERN.test(form.adminPin)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="register-admin-pin-confirm">PIN確認</Label>
                    <Input
                      id="register-admin-pin-confirm"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.adminPinConfirm}
                      onChange={updateField('adminPinConfirm')}
                      invalid={pinMismatch}
                    />
                    {pinMismatch && (
                      <p className="mt-1 text-xs text-danger">PINが一致していません。</p>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                登録する
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                既にアカウントをお持ちの方は{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  ログイン
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
