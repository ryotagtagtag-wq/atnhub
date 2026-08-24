import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, LogOut, Plus } from 'lucide-react';
import { api } from '../../api/client';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Modal,
  Option,
  Select,
  Spinner,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceResponse } from '../../types/api';
import { formatDateTimeJp, todayISO } from '../../utils/date';

interface ErrorAlertProps {
  message: string;
}

function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger dark:bg-red-950 dark:text-red-300"
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-600">
      {message}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
      <Spinner size="sm" />
      読み込み中…
    </div>
  );
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span className={status ? 'badge badge-success' : 'badge badge-danger'}>
      {status ? '出席' : '欠席'}
    </span>
  );
}

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">管理者ダッシュボード</h1>

      {/* TanStack Query の Provider は main.tsx でアプリ全体に適用済み */}
      <Tabs defaultValue="attendance" className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="attendance">出席確認</TabsTrigger>
          <TabsTrigger value="classes">クラス管理</TabsTrigger>
          <TabsTrigger value="teachers">教師管理</TabsTrigger>
          <TabsTrigger value="students">生徒管理</TabsTrigger>
          <TabsTrigger value="settings">学校設定</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceCheckTab />
        </TabsContent>
        <TabsContent value="classes" className="mt-4">
          <ClassManagementTab />
        </TabsContent>
        <TabsContent value="teachers" className="mt-4">
          <TeacherManagementTab />
        </TabsContent>
        <TabsContent value="students" className="mt-4">
          <StudentManagementTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SchoolSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 出席確認                                                            */
/* ------------------------------------------------------------------ */

function AttendanceCheckTab() {
  const [classIdText, setClassIdText] = useState('');
  const [date, setDate] = useState(todayISO());

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  const classId = classIdText === '' ? null : Number(classIdText);

  const attendanceQuery = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => api.getAttendance(classId as number, date),
    enabled: classId !== null,
  });

  const records: AttendanceResponse[] = attendanceQuery.data ?? [];

  return (
    <Card>
      <CardHeader>出席確認</CardHeader>
      <CardContent>
        {classesQuery.isError && (
          <ErrorAlert message="クラス一覧の取得に失敗しました。" />
        )}
        {attendanceQuery.isError && (
          <ErrorAlert message="出席記録の取得に失敗しました。日付やクラスをご確認ください。" />
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-48">
            <Label htmlFor="attendance-class">クラス</Label>
            <Select
              id="attendance-class"
              value={classIdText}
              onChange={(event) => setClassIdText(event.target.value)}
            >
              <Option value="">クラスを選択…</Option>
              {(classesQuery.data ?? []).map((klass) => (
                <Option key={klass.id} value={String(klass.id)}>
                  {klass.name}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="attendance-date">日付</Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        </div>

        {classId === null ? (
          <EmptyState message="確認したいクラスを選択してください。" />
        ) : attendanceQuery.isPending || classesQuery.isPending ? (
          <LoadingBox />
        ) : records.length === 0 ? (
          <EmptyState message="この日の出席記録はありません。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>生徒名</Th>
                <Th>出席番号</Th>
                <Th>状態</Th>
                <Th>記録時刻</Th>
              </Tr>
            </Thead>
            <Tbody>
              {records.map((record) => (
                <Tr key={record.student_id}>
                  <Td className="font-medium text-gray-900 dark:text-white">{record.student_name}</Td>
                  <Td>{record.student_number}</Td>
                  <Td>
                    <StatusBadge status={record.status} />
                  </Td>
                  <Td>{formatDateTimeJp(record.recorded_at)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* クラス管理                                                          */
/* ------------------------------------------------------------------ */

interface ClassFormData {
  name: string;
  grade: string;
}

const emptyClassForm: ClassFormData = { name: '', grade: '' };

function ClassManagementTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<ClassFormData>(emptyClassForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; grade?: number }) => api.createClass(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const openCreateModal = (): void => {
    setForm(emptyClassForm);
    setErrorMessage(null);
    setIsCreateOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);

    // 境界で検証：名前は必須、学年は任意の正の整数
    if (form.name.trim() === '') {
      setErrorMessage('クラス名を入力してください。');
      return;
    }
    const grade = form.grade === '' ? undefined : Number(form.grade);
    if (grade !== undefined && (!Number.isInteger(grade) || grade < 1)) {
      setErrorMessage('学年は1以上の整数で入力してください。');
      return;
    }

    createMutation.mutate({ name: form.name.trim(), grade });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        クラス管理
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={14} aria-hidden />
          クラスを作成
        </Button>
      </CardHeader>
      <CardContent>
        {classesQuery.isPending ? (
          <LoadingBox />
        ) : classesQuery.isError ? (
          <>
            <ErrorAlert message="クラス一覧の取得に失敗しました。" />
            <Button variant="secondary" size="sm" onClick={() => void classesQuery.refetch()}>
              再読み込み
            </Button>
          </>
        ) : (classesQuery.data ?? []).length === 0 ? (
          <EmptyState message="クラスがありません。「クラスを作成」から追加してください。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>クラス名</Th>
                <Th>学年</Th>
                <Th>ID</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(classesQuery.data ?? []).map((klass) => (
                <Tr key={klass.id}>
                  <Td className="font-medium text-gray-900 dark:text-white">{klass.name}</Td>
                  <Td>{klass.grade ?? '—'}</Td>
                  <Td className="font-mono text-xs">{klass.id}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="クラスを作成">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div>
              <Label htmlFor="class-name">クラス名（必須）</Label>
              <Input
                id="class-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例: 3年A組"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="class-grade">学年（任意）</Label>
              <Input
                id="class-grade"
                type="number"
                min={1}
                value={form.grade}
                onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))}
                placeholder="例: 3"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                作成する
              </Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 教師管理                                                            */
/* ------------------------------------------------------------------ */

interface TeacherFormData {
  loginId: string;
  name: string;
  classId: string;
  pin: string;
}

const emptyTeacherForm: TeacherFormData = { loginId: '', name: '', classId: '', pin: '' };
const PIN_PATTERN = /^\d{6}$/;

function TeacherManagementTab() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<TeacherFormData>(emptyTeacherForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const teachersQuery = useQuery({ queryKey: ['teachers'], queryFn: () => api.listTeachers() });
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  const createMutation = useMutation({
    mutationFn: (payload: { login_id: string; name: string; class_id?: number; pin: string }) =>
      api.createTeacher(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const openCreateModal = (): void => {
    setForm(emptyTeacherForm);
    setErrorMessage(null);
    setIsCreateOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);

    if (form.loginId.trim() === '') return void setErrorMessage('ログインIDを入力してください。');
    if (form.name.trim() === '') return void setErrorMessage('教師名を入力してください。');
    if (!PIN_PATTERN.test(form.pin)) return void setErrorMessage('PINは6桁の数字で入力してください。');

    const classId = form.classId === '' ? undefined : Number(form.classId);
    createMutation.mutate({
      login_id: form.loginId.trim(),
      name: form.name.trim(),
      class_id: classId,
      pin: form.pin,
    });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        教師管理
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={14} aria-hidden />
          教師を追加
        </Button>
      </CardHeader>
      <CardContent>
        {teachersQuery.isPending ? (
          <LoadingBox />
        ) : teachersQuery.isError ? (
          <>
            <ErrorAlert message="教師一覧の取得に失敗しました。" />
            <Button variant="secondary" size="sm" onClick={() => void teachersQuery.refetch()}>
              再読み込み
            </Button>
          </>
        ) : (teachersQuery.data ?? []).length === 0 ? (
          <EmptyState message="教師がいません。「教師を追加」から登録してください。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>氏名</Th>
                <Th>ログインID</Th>
                <Th>担当クラス</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(teachersQuery.data ?? []).map((teacher) => {
                const assignedClass = (classesQuery.data ?? []).find(
                  (klass) => klass.id === teacher.class_id,
                );
                return (
                  <Tr key={teacher.id}>
                    <Td className="font-medium text-gray-900 dark:text-white">{teacher.name}</Td>
                    <Td className="font-mono text-xs">{teacher.login_id}</Td>
                    <Td>{assignedClass?.name ?? '—'}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}

        <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="教師を追加">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div>
              <Label htmlFor="teacher-name">氏名（必須）</Label>
              <Input
                id="teacher-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例: 山田 花子"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="teacher-login-id">ログインID（必須）</Label>
              <Input
                id="teacher-login-id"
                value={form.loginId}
                onChange={(event) => setForm((prev) => ({ ...prev, loginId: event.target.value }))}
                placeholder="例: yamada"
                required
              />
            </div>
            <div>
              <Label htmlFor="teacher-class">担当クラス（任意）</Label>
              <Select
                id="teacher-class"
                value={form.classId}
                onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
              >
                <Option value="">なし</Option>
                {(classesQuery.data ?? []).map((klass) => (
                  <Option key={klass.id} value={String(klass.id)}>
                    {klass.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="teacher-pin">PIN（6桁・必須）</Label>
              <Input
                id="teacher-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(event) => setForm((prev) => ({ ...prev, pin: event.target.value }))}
                invalid={form.pin.length > 0 && !PIN_PATTERN.test(form.pin)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                追加する
              </Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 生徒管理                                                            */
/* ------------------------------------------------------------------ */

interface StudentFormData {
  name: string;
  studentNumber: string;
  pin: string;
}

const emptyStudentForm: StudentFormData = { name: '', studentNumber: '', pin: '' };

function StudentManagementTab() {
  const queryClient = useQueryClient();
  const [classIdText, setClassIdText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<StudentFormData>(emptyStudentForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  const classId = classIdText === '' ? null : Number(classIdText);

  const studentsQuery = useQuery({
    queryKey: ['students', classId],
    queryFn: () => api.listStudents(classId as number),
    enabled: classId !== null,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { class_id: number; student_number: string; name: string; pin: string }) =>
      api.createStudent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['students', classId] });
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  const openCreateModal = (): void => {
    if (classId === null) return; // クラス未選択では作成できない

    setForm(emptyStudentForm);
    setErrorMessage(null);
    setIsCreateOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);

    if (classId === null) {
      setErrorMessage('先にクラスを選択してください。');
      return;
    }
    if (form.name.trim() === '') return void setErrorMessage('生徒名を入力してください。');
    if (form.studentNumber.trim() === '') {
      return void setErrorMessage('出席番号を入力してください。');
    }
    if (!PIN_PATTERN.test(form.pin)) return void setErrorMessage('PINは6桁の数字で入力してください。');

    createMutation.mutate({
      class_id: classId,
      student_number: form.studentNumber.trim(),
      name: form.name.trim(),
      pin: form.pin,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        生徒管理
        <div className="flex items-end gap-2">
          <div className="min-w-48">
            <Select
              aria-label="表示するクラス"
              value={classIdText}
              onChange={(event) => setClassIdText(event.target.value)}
            >
              <Option value="">クラスを選択…</Option>
              {(classesQuery.data ?? []).map((klass) => (
                <Option key={klass.id} value={String(klass.id)}>
                  {klass.name}
                </Option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            onClick={openCreateModal}
            disabled={classId === null}
            title={classId === null ? '先にクラスを選択してください' : undefined}
          >
            <Plus size={14} aria-hidden />
            生徒を追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {studentsQuery.isError && (
          <ErrorAlert message="生徒一覧の取得に失敗しました。クラスをご確認ください。" />
        )}

        {classId === null ? (
          <EmptyState message="生徒を表示するにはクラスを選択してください。" />
        ) : studentsQuery.isPending ? (
          <LoadingBox />
        ) : (studentsQuery.data ?? []).length === 0 ? (
          <EmptyState message="このクラスに生徒がいません。「生徒を追加」から登録してください。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>出席番号</Th>
                <Th>氏名</Th>
                <Th>ID</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(studentsQuery.data ?? []).map((student) => (
                <Tr key={student.id}>
                  <Td>{student.number}</Td>
                  <Td className="font-medium text-gray-900 dark:text-white">{student.name}</Td>
                  <Td className="font-mono text-xs">{student.id}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="生徒を追加">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && <ErrorAlert message={errorMessage} />}
            <div>
              <Label htmlFor="student-create-name">氏名（必須）</Label>
              <Input
                id="student-create-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="例: 田中 太郎"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="student-create-number">出席番号（必須）</Label>
              <Input
                id="student-create-number"
                value={form.studentNumber}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, studentNumber: event.target.value }))
                }
                placeholder="例: 12"
                required
              />
            </div>
            <div>
              <Label htmlFor="student-create-pin">PIN（6桁・必須）</Label>
              <Input
                id="student-create-pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(event) => setForm((prev) => ({ ...prev, pin: event.target.value }))}
                invalid={form.pin.length > 0 && !PIN_PATTERN.test(form.pin)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                追加する
              </Button>
            </div>
          </form>
        </Modal>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 学校設定                                                            */
/* ------------------------------------------------------------------ */

const ROLE_LABELS = {
  school_admin: '管理者',
  teacher: '教師',
  student: '生徒',
} as const;

function SchoolSettingsTab() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) {
    return <EmptyState message="ユーザー情報を読み込めませんでした。" />;
  }

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        学校設定
        <Button variant="secondary" size="sm" onClick={() => void handleLogout()}>
          <LogOut size={14} aria-hidden />
          ログアウト
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-gray-200 dark:divide-gray-700">
          {[
            ['お名前', user.name],
            ['ログインID', user.login_id],
            ['役割', ROLE_LABELS[user.role]],
            ['学校ID', String(user.school_id ?? '—')],
            ...(user.role === 'student' ? ([['所属クラスID', String(user.class_id ?? '—')]] as const) : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
