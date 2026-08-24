import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { api } from '../../api/client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
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
import { todayISO } from '../../utils/date';

function ErrorAlert({ message }: { message: string }) {
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

export default function TeacherDashboard() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">教師ダッシュボード</h1>

      <Tabs defaultValue="attendance" className="mt-4">
        <TabsList>
          <TabsTrigger value="attendance">出席記録</TabsTrigger>
          <TabsTrigger value="students">生徒一覧</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceRecordTab />
        </TabsContent>
        <TabsContent value="students" className="mt-4">
          <StudentListTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 出席記録                                                            */
/* ------------------------------------------------------------------ */

interface ClassDateSelectorProps {
  classIdText: string;
  onClassChange: (value: string) => void;
  date: string;
  onDateChange: (value: string) => void;
  idPrefix: string;
}

/** クラス＋日付の共通セレクタ */
function ClassDateSelector({
  classIdText,
  onClassChange,
  date,
  onDateChange,
  idPrefix,
}: ClassDateSelectorProps) {
  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  return (
    <>
      <div className="min-w-48">
        <Label htmlFor={`${idPrefix}-class`}>クラス</Label>
        <Select
          id={`${idPrefix}-class`}
          value={classIdText}
          onChange={(event) => onClassChange(event.target.value)}
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
        <Label htmlFor={`${idPrefix}-date`}>日付</Label>
        <Input id={`${idPrefix}-date`} type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
      </div>
    </>
  );
}

function AttendanceStatusBadge({ status }: { status: boolean }) {
  return (
    <Badge variant={status ? 'success' : 'destructive'}>{status ? '出席' : '欠席'}</Badge>
  );
}

interface RecordAttendanceVariables {
  studentId: number;
  status: boolean;
}

function AttendanceRecordTab() {
  const queryClient = useQueryClient();
  const [classIdText, setClassIdText] = useState('');
  const [date, setDate] = useState(todayISO());

  const classId = classIdText === '' ? null : Number(classIdText);

  const studentsQuery = useQuery({
    queryKey: ['students', classId],
    queryFn: () => api.listStudents(classId as number),
    enabled: classId !== null,
  });

  const attendanceQuery = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => api.getAttendance(classId as number, date),
    enabled: classId !== null,
  });

  const recordMutation = useMutation({
    mutationFn: (variables: RecordAttendanceVariables) =>
      api.recordAttendance({
        class_id: classId as number,
        student_id: variables.studentId,
        date,
        status: variables.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance', classId, date] });
    },
  });

  // student_id → 出欠レスポンスの対応表
  const attendanceByStudentId = new Map(
    (attendanceQuery.data ?? []).map((record) => [record.student_id, record]),
  );

  const isRowPending = (studentId: number): boolean =>
    recordMutation.isPending && recordMutation.variables?.studentId === studentId;

  const handleRecord = (studentId: number, status: boolean): void => {
    recordMutation.mutate({ studentId, status });
  };

  return (
    <Card>
      <CardHeader>出席記録</CardHeader>
      <CardContent>
        {attendanceQuery.isError && (
          <ErrorAlert message="出席記録の取得に失敗しました。日付をご確認ください。" />
        )}
        {recordMutation.isError && (
          <ErrorAlert message={`出席の記録に失敗しました: ${recordMutation.error.message}`} />
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <ClassDateSelector
            idPrefix="teacher-attendance"
            classIdText={classIdText}
            onClassChange={(value) => {
              setClassIdText(value);
              recordMutation.reset();
            }}
            date={date}
            onDateChange={(value) => {
              setDate(value);
              recordMutation.reset();
            }}
          />
        </div>

        {classId === null ? (
          <EmptyState message="出席を記録するクラスを選択してください。" />
        ) : studentsQuery.isPending || attendanceQuery.isPending ? (
          <LoadingBox />
        ) : (studentsQuery.data ?? []).length === 0 ? (
          <EmptyState message="このクラスに生徒がいません。管理者に登録を依頼してください。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>出席番号</Th>
                <Th>氏名</Th>
                <Th>現在の状態</Th>
                <Th className="text-right">記録</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(studentsQuery.data ?? []).map((student) => {
                const record = attendanceByStudentId.get(student.id);
                return (
                  <Tr key={student.id}>
                    <Td>{student.number}</Td>
                    <Td className="font-medium text-gray-900 dark:text-white">{student.name}</Td>
                    <Td>
                      {isRowPending(student.id) ? (
                        <Spinner size="sm" label="記録中" />
                      ) : record ? (
                        <>
                          <AttendanceStatusBadge status={record.status} />
                          {record.teacher_name && (
                            <span className="ml-1 text-xs text-gray-400">
                              （{record.teacher_name}）
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary">未記録</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={record?.status === true ? 'primary' : 'secondary'}
                          disabled={isRowPending(student.id)}
                          onClick={() => handleRecord(student.id, true)}
                        >
                          出席
                        </Button>
                        <Button
                          size="sm"
                          variant={record?.status === false ? 'danger' : 'secondary'}
                          disabled={isRowPending(student.id)}
                          onClick={() => handleRecord(student.id, false)}
                        >
                          欠席
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 生徒一覧                                                            */
/* ------------------------------------------------------------------ */

function StudentListTab() {
  const [classIdText, setClassIdText] = useState('');
  const classId = classIdText === '' ? null : Number(classIdText);

  const classesQuery = useQuery({ queryKey: ['classes'], queryFn: () => api.listClasses() });

  const studentsQuery = useQuery({
    queryKey: ['students', classId],
    queryFn: () => api.listStudents(classId as number),
    enabled: classId !== null,
  });

  return (
    <Card>
      <CardHeader>生徒一覧</CardHeader>
      <CardContent>
        {studentsQuery.isError && (
          <ErrorAlert message="生徒一覧の取得に失敗しました。クラスをご確認ください。" />
        )}

        <div className="mb-4 max-w-xs">
          <Label htmlFor="student-list-class">クラス</Label>
          <Select
            id="student-list-class"
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

        {classId === null ? (
          <EmptyState message="生徒を表示するにはクラスを選択してください。" />
        ) : studentsQuery.isPending ? (
          <LoadingBox />
        ) : (studentsQuery.data ?? []).length === 0 ? (
          <EmptyState message="このクラスに生徒がいません。" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>出席番号</Th>
                <Th>氏名</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(studentsQuery.data ?? []).map((student) => (
                <Tr key={student.id}>
                  <Td>{student.number}</Td>
                  <Td className="font-medium text-gray-900 dark:text-white">{student.name}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
