import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Clock } from 'lucide-react';
import { api } from '../../api/client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceResponse, User } from '../../types/api';
import { formatDateLabel, isoDaysAgo, todayISO } from '../../utils/date';

/** 履歴1日分。status === null は「記録なし」または「取得失敗」 */
interface HistoryEntry {
  date: string;
  status: boolean | null;
}

function ErrorAlert({ message }: { message: string }) {
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

export default function StudentDashboard() {
  const { user } = useAuth();

  // ガードはフックを呼ぶ内側コンポーネントの前に完了させる
  if (!user || user.class_id === undefined) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>こんにちは</CardHeader>
        <CardContent>
          <ErrorAlert
            message={
              user === null
                ? 'ユーザー情報を読み込めませんでした。再度ログインしてください。'
                : '所属クラスが登録されていません。管理者にお問い合わせください。'
            }
          />
        </CardContent>
      </Card>
    );
  }

  return <StudentHome user={user} classId={user.class_id} />;
}

interface StudentHomeProps {
  user: User;
  classId: number;
}

function StudentHome({ user, classId }: StudentHomeProps) {
  const queryClient = useQueryClient();
  const today = todayISO();

  const todayAttendanceQuery = useQuery({
    queryKey: ['attendance', classId, today],
    queryFn: () => api.getAttendance(classId, today),
  });

  // 直近30日分を古い日から順に取得（個別の失敗は無視して続行）
  const historyQuery = useQuery({
    queryKey: ['student-history', classId, today],
    queryFn: async (): Promise<HistoryEntry[]> => {
      const entries: HistoryEntry[] = [];
      for (let daysBack = 29; daysBack >= 0; daysBack--) {
        const date = isoDaysAgo(daysBack);
        try {
          const records = await api.getAttendance(classId, date);
          entries.push({ date, status: findOwnStatus(records, user.id) });
        } catch {
          entries.push({ date, status: null });
        }
      }
      return entries;
    },
    staleTime: Infinity,
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      api.recordAttendance({
        class_id: classId,
        student_id: user.id,
        date: today,
        status: true,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance', classId] });
      void queryClient.invalidateQueries({ queryKey: ['student-history', classId] });
    },
  });

  const myRecord = (todayAttendanceQuery.data ?? []).find(
    (record) => record.student_id === user.id,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 挨拶カード */}
      <Card>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              こんにちは、{user.name} さん
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{today}</p>
          </div>
          <Clock className="text-primary-light" size={40} aria-hidden />
        </CardContent>
      </Card>

      {/* 今日の出席 */}
      <Card>
        <CardHeader>今日の出席</CardHeader>
        <CardContent>
          {todayAttendanceQuery.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : todayAttendanceQuery.isError ? (
            <>
              <ErrorAlert message="今日の出席状況の取得に失敗しました。" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void todayAttendanceQuery.refetch()}
              >
                再読み込み
              </Button>
            </>
          ) : myRecord === undefined ? (
            <div className="text-center">
              <p className="text-4xl" aria-hidden>
                ⏳
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">未出席</p>
              <p className="mb-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                まだ今日の出席が記録されていません。
              </p>
              <Button
                className="w-full py-3 text-lg"
                loading={recordMutation.isPending}
                onClick={() => recordMutation.mutate()}
              >
                出席する
              </Button>
            </div>
          ) : myRecord.status ? (
            <StatusPanel emoji="✅" label="出席済み" tone="text-success" recordedAt={myRecord.recorded_at} />
          ) : (
            <StatusPanel emoji="❌" label="欠席" tone="text-danger" recordedAt={myRecord.recorded_at} />
          )}

          {recordMutation.isError && (
            <div className="mt-4">
              <ErrorAlert message={`出席の記録に失敗しました: ${recordMutation.error.message}`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 過去30日間の履歴 */}
      <Card>
        <CardHeader>過去30日間の履歴</CardHeader>
        <CardContent>
          {historyQuery.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <ErrorAlert message="履歴の取得に失敗しました。" />
          ) : (
            /* data は古い順で生成しているため、新しい順に並べ替えて表示 */
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...(historyQuery.data ?? [])].reverse().map((entry) => (
                <li key={entry.date} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatDateLabel(entry.date)}
                  </span>
                  <HistoryBadge status={entry.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** 自分のレコードの状態を探す（見つからなければ null） */
function findOwnStatus(records: AttendanceResponse[], studentId: number): boolean | null {
  const ownRecord = records.find((record) => record.student_id === studentId);
  return ownRecord ? ownRecord.status : null;
}

interface StatusPanelProps {
  emoji: string;
  label: string;
  tone: string;
  recordedAt: string;
}

function StatusPanel({ emoji, label, tone, recordedAt }: StatusPanelProps) {
  return (
    <div className="text-center">
      <p className="text-4xl" aria-hidden>
        {emoji}
      </p>
      <p className={`mt-2 text-xl font-bold ${tone}`}>{label}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">記録時刻: {recordedAt}</p>
    </div>
  );
}

function HistoryBadge({ status }: { status: boolean | null }) {
  if (status === true) return <Badge variant="success">出席</Badge>;
  if (status === false) return <Badge variant="destructive">欠席</Badge>;
  return <Badge variant="secondary">記録なし</Badge>;
}
