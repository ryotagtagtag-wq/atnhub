const pad2 = (value: number): string => String(value).padStart(2, '0');

/** 現在日をローカルタイムゾーン基準の YYYY-MM-DD で返す */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** 本日から n 日前の日付を YYYY-MM-DD で返す（n=0 で本日） */
export function isoDaysAgo(daysBack: number): string {
  const target = new Date();
  target.setDate(target.getDate() - daysBack);
  return `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(target.getDate())}`;
}

/** recorded_at などを日本語ロケールの時刻表現へ変換する（例: 2026/8/24 8:52:03） */
export function formatDateTimeJp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('ja-JP');
}

/** YYYY-MM-DD を「M月D日」形式の表示用ラベルへ変換する */
export function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return `${month}月${day}日`;
}
