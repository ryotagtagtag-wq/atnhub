// 生徒ダッシュボード
import { api } from '../shared/api.js';

// 状態管理
let currentStudent = null;
let todayAttendance = null;
let attendanceHistory = [];

// DOM要素
const studentName = document.getElementById('studentName');
const studentClass = document.getElementById('studentClass');
const studentNumber = document.getElementById('studentNumber');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const checkInBtn = document.getElementById('checkInBtn');
const historyList = document.getElementById('historyList');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadStudentInfo();
  await loadTodayAttendance();
  await loadAttendanceHistory();
});

// 認証チェック
async function checkAuth() {
  const token = api.getToken();
  if (!token) {
    location.href = '/login.html';
    return;
  }
  try {
    const me = await api.me();
    if (me.role !== 'student') {
      alert('生徒権限が必要です');
      location.href = '/login.html';
      return;
    }
    currentStudent = me;
    userInfo.textContent = `${me.name} (生徒)`;
  } catch (e) {
    api.clearToken();
    location.href = '/login.html';
  }
}

// 生徒情報読み込み
async function loadStudentInfo() {
  if (!currentStudent) return;
  studentName.textContent = currentStudent.name;
  studentClass.textContent = `クラス: ${currentStudent.class_name || '未設定'}`;
  studentNumber.textContent = `出席番号: ${currentStudent.number || '未設定'}`;
}

// 今日の出席状況読み込み
async function loadTodayAttendance() {
  if (!currentStudent) return;
  
  const today = new Date().toISOString().split('T')[0];
  try {
    const data = await api.getAttendance(currentStudent.class_id, today);
    if (data && data.length > 0) {
      todayAttendance = data[0];
      updateTodayStatus(todayAttendance);
    } else {
      // まだ出席していない
      todayAttendance = null;
      updateTodayStatus(null);
    }
  } catch (err) {
    console.error('今日の出席読み込みエラー:', err);
    statusIcon.textContent = '⚠️';
    statusText.textContent = '読み込みエラー';
    checkInBtn.classList.add('hidden');
  }
}

// 今日の出席状況表示更新
function updateTodayStatus(attendance) {
  if (attendance) {
    if (attendance.status) {
      statusIcon.textContent = '✅';
      statusText.textContent = '出席済み';
      checkInBtn.classList.add('hidden');
    } else {
      statusIcon.textContent = '❌';
      statusText.textContent = '欠席記録あり';
      checkInBtn.classList.add('hidden');
    }
  } else {
    statusIcon.textContent = '⏳';
    statusText.textContent = '未出席';
    checkInBtn.classList.remove('hidden');
  }
}

// 出席履歴読み込み
async function loadAttendanceHistory() {
  if (!currentStudent) return;
  
  try {
    // 過去30日分の履歴を取得（日付ごとにAPIを呼び出す）
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const allAttendance = [];
    const currentDate = new Date(thirtyDaysAgo);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      try {
        const data = await api.getAttendance(currentStudent.class_id, dateStr);
        if (data && data.length > 0) {
          allAttendance.push(...data);
        }
      } catch (err) {
        // 個別の日付でエラーがあっても継続
        console.warn(`日付 ${dateStr} の出席取得エラー:`, err);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    attendanceHistory = allAttendance;
    renderHistory();
  } catch (err) {
    console.error('出席履歴読み込みエラー:', err);
    historyList.innerHTML = '<p class="error">履歴の読み込みに失敗しました</p>';
  }
}

// 履歴描画
function renderHistory() {
  if (attendanceHistory.length === 0) {
    historyList.innerHTML = '<p class="empty">出席履歴がありません</p>';
    return;
  }
  
  // 新しい順にソート
  const sorted = [...attendanceHistory].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  historyList.innerHTML = sorted.map(a => `
    <div class="list-item">
      <div class="item-info">
        <span class="date">${formatDate(a.date)}</span>
        <span class="status-badge ${a.status ? 'present' : 'absent'}">
          ${a.status ? '出席' : '欠席'}
        </span>
      </div>
      ${a.recorded_at ? `<span class="time">記録: ${new Date(a.recorded_at).toLocaleString('ja-JP')}</span>` : ''}
      ${a.teacher_name ? `<span class="teacher">記録者: ${escapeHtml(a.teacher_name)}</span>` : ''}
    </div>
  `).join('');
}

// 出席する（グローバル関数として定義してonclickから呼べるようにする）
window.checkIn = async function() {
  if (!currentStudent) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    checkInBtn.disabled = true;
    checkInBtn.textContent = '処理中...';
    
    await api.recordAttendance({
      class_id: currentStudent.class_id,
      date: today,
      records: [{ student_id: currentStudent.id, status: 'present' }]
    });
    
    // 成功時のUI更新
    statusIcon.textContent = '✅';
    statusText.textContent = '出席完了！';
    checkInBtn.classList.add('hidden');
    
    // 履歴も更新
    await loadAttendanceHistory();
    
  } catch (err) {
    alert(`エラー: ${err.message}`);
    checkInBtn.disabled = false;
    checkInBtn.textContent = '出席する';
  }
};

// ログアウト
logoutBtn.addEventListener('click', async () => {
  try {
    await api.logout();
  } catch (e) {}
  api.clearToken();
  location.href = '/login.html';
});

// ユーティリティ
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const A = '&';
  return String(str).replace(/[&<>"']/g, c =>
    c === '&' ? A + 'amp;'
    : c === '<' ? A + 'lt;'
    : c === '>' ? A + 'gt;'
    : c === '"' ? A + 'quot;'
    : A + '#39;');
}