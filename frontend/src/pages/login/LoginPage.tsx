import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { CircleAlert, GraduationCap, LogIn, School, ShieldCheck } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { LoginStaffRequest, LoginStudentRequest, UserRole } from '../../types/api';

type RoleTab = UserRole;

const DASHBOARD_PATH: Record<RoleTab, string> = {
  student: '/student',
  teacher: '/teacher',
  school_admin: '/admin',
};

const emptyStudentForm: LoginStudentRequest = {
  school_code: '',
  class_code: '',
  number: '',
  pin: '',
};

const emptyStaffForm: LoginStaffRequest = {
  school_code: '',
  login_id: '',
  pin: '',
};

const isSixDigitPin = (pin: string): boolean => /^\d{6}$/.test(pin);

interface ErrorAlertProps {
  message: string;
}

function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger dark:bg-red-950 dark:text-red-300"
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState<RoleTab>('student');
  const [studentForm, setStudentForm] = useState<LoginStudentRequest>(emptyStudentForm);
  const [staffForm, setStaffForm] = useState<LoginStaffRequest>(emptyStaffForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateStudentField =
    (field: keyof LoginStudentRequest) => (event: ChangeEvent<HTMLInputElement>) => {
      setStudentForm((form) => ({ ...form, [field]: event.target.value }));
    };

  const updateStaffField =
    (field: keyof LoginStaffRequest) => (event: ChangeEvent<HTMLInputElement>) => {
      setStaffForm((form) => ({ ...form, [field]: event.target.value }));
    };

  const switchRole = (role: string): void => {
    setActiveRole(role as RoleTab);
    setErrorMessage(null);
  };

  /** ログイン処理の本体。生徒フォーム（submit）とスタッフボタン（click）の両方から呼ばれる */
  const submitLogin = async (): Promise<void> => {
    setErrorMessage(null);

    // 境界で入力を検証してからAPIへ渡す
    const pin = activeRole === 'student' ? studentForm.pin : staffForm.pin;
    if (!isSixDigitPin(pin)) {
      setErrorMessage('PINは6桁の数字で入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(activeRole, activeRole === 'student' ? studentForm : staffForm);
      navigate(DASHBOARD_PATH[activeRole], { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ログインに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submitLogin();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-primary">ATN Hub</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            出席管理システムにログイン
          </p>
        </div>

        <Card>
          <CardContent>
            <Tabs value={activeRole} onValueChange={switchRole}>
              <TabsList className="w-full">
                <TabsTrigger value="student" className="flex-1 gap-1">
                  <GraduationCap size={14} aria-hidden />
                  生徒
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex-1 gap-1">
                  <School size={14} aria-hidden />
                  教師
                </TabsTrigger>
                <TabsTrigger value="school_admin" className="flex-1 gap-1">
                  <ShieldCheck size={14} aria-hidden />
                  管理者
                </TabsTrigger>
              </TabsList>

              {errorMessage && (
                <div className="mt-4">
                  <ErrorAlert message={errorMessage} />
                </div>
              )}

              <TabsContent value="student">
                <form onSubmit={handleStudentSubmit} className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="student-school-code">学校コード</Label>
                    <Input
                      id="student-school-code"
                      value={studentForm.school_code}
                      onChange={updateStudentField('school_code')}
                      placeholder="例: ABC123"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-class-code">クラスコード</Label>
                    <Input
                      id="student-class-code"
                      value={studentForm.class_code}
                      onChange={updateStudentField('class_code')}
                      placeholder="例: 3-A"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-number">出席番号</Label>
                    <Input
                      id="student-number"
                      value={studentForm.number}
                      onChange={updateStudentField('number')}
                      placeholder="例: 12"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-pin">PIN（6桁）</Label>
                    <Input
                      id="student-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={studentForm.pin}
                      onChange={updateStudentField('pin')}
                      invalid={studentForm.pin.length > 0 && !isSixDigitPin(studentForm.pin)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" loading={isSubmitting}>
                    <LogIn size={16} aria-hidden />
                    ログイン
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="teacher">
                <StaffLoginFormFields
                  form={staffForm}
                  onFieldChange={updateStaffField}
                  idPrefix="teacher"
                />
              </TabsContent>

              <TabsContent value="school_admin">
                <StaffLoginFormFields
                  form={staffForm}
                  onFieldChange={updateStaffField}
                  idPrefix="admin"
                />
              </TabsContent>
            </Tabs>

            {/* 教師・管理者タブは共通フォームのため、タブ外に送信ボタンを置く */}
            {activeRole !== 'student' && (
              <Button
                type="button"
                className="mt-4 w-full"
                loading={isSubmitting}
                onClick={() => void submitLogin()}
              >
                <LogIn size={16} aria-hidden />
                ログイン
              </Button>
            )}

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              <Link to="/register" className="font-medium text-primary hover:underline">
                学校を新規登録する
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StaffLoginFormFieldsProps {
  form: LoginStaffRequest;
  onFieldChange: (field: keyof LoginStaffRequest) => (event: ChangeEvent<HTMLInputElement>) => void;
  idPrefix: string;
}

function StaffLoginFormFields({ form, onFieldChange, idPrefix }: StaffLoginFormFieldsProps) {
  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label htmlFor={`${idPrefix}-school-code`}>学校コード</Label>
        <Input
          id={`${idPrefix}-school-code`}
          value={form.school_code}
          onChange={onFieldChange('school_code')}
          placeholder="例: ABC123"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-login-id`}>ログインID</Label>
        <Input
          id={`${idPrefix}-login-id`}
          value={form.login_id}
          onChange={onFieldChange('login_id')}
          placeholder="例: taniguchi"
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-pin`}>PIN（6桁）</Label>
        <Input
          id={`${idPrefix}-pin`}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={form.pin}
          onChange={onFieldChange('pin')}
          invalid={form.pin.length > 0 && !isSixDigitPin(form.pin)}
        />
      </div>
    </div>
  );
}
