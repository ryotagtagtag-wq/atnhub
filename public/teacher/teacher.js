// 教師ダッシュボード
import { api } from '../shared/api.js';

// 状態管理
let currentTab = 'attendance';
let myClasses = [];
let attendanceData = [];

// DOM要素
const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');
const classFilter = document.getElementById('classFilter');
const dateFilter = document.getElementById('dateFilter');
const studentClassFilter = document.getElementById('studentClassFilter');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupTabs();
  setupFilters();
  await loadMyClasses();
  dateFilter.valueAsDate = new Date();
  await loadAttendance();
  await loadStudents();
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
    if (me.role !== 'teacher') {
      alert('教師権限が必要です');
      location.href = '/login.html';
      return;
    }
    userInfo.textContent = `${me.name} (教師)`;
  } catch (e) {
    api.clearToken();
    location.href = '/login.html';
  }
}

// タブ切り替え
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

async function switchTab(tabName) {
  currentTab = tabName;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
  tabPanels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${tabName}`));
  
  if (tabName === 'attendance') await loadAttendance();
  if (tabName === 'students') await loadStudents();
}

// フィルタ設定
function setupFilters() {
  classFilter.addEventListener('change', () => loadAttendance());
  dateFilter.addEventListener('change', () => loadAttendance());
  studentClassFilter.addEventListener('change', () => loadStudents());
}

// データ読み込み
async function loadMyClasses() {
  try {
    const allClasses = await api.listClasses();
    // 教師の担当クラスのみフィルタ（API側でフィルタされる想定だが、念のためクライアントでも）
    myClasses = allClasses;
    updateClassSelects();
  } catch (err) {
    console.error('クラス読み込みエラー:', err);
  }
}

async function loadAttendance() {
  const classId = classFilter.value;
  const date = dateFilter.value;
  if (!classId || !date) {
    document.getElementById('attendanceList').innerHTML = '<p class="empty">クラスと日付を選択してください</p>';
    return;
  }
  try {
    attendanceData = await api.getAttendance(classId, date);
    renderAttendance();
  } catch (err) {
    console.error('出席読み込みエラー:', err);
    document.getElementById('attendanceList').innerHTML = `<p class="error">エラー: ${err.message}</p>`;
  }
}

async function loadStudents() {
  const classId = studentClassFilter.value;
  if (!classId) {
    document.getElementById('studentsList').innerHTML = '<p class="empty">クラスを選択してください</p>';
    return;
  }
  try {
    const students = await api.listStudents(classId);
    renderStudents(students);
  } catch (err) {
    console.error('生徒読み込みエラー:', err);
    document.getElementById('studentsList').innerHTML = `<p class="error">エラー: ${err.message}</p>`;
  }
}

// 描画関数
function renderAttendance() {
  const container = document.getElementById('attendanceList');
  if (attendanceData.length === 0) {
    container.innerHTML = '<p class="empty">出席データがありません。出席を記録してください。</p>';
    return;
  }
  container.innerHTML = attendanceData.map(a => `
    <div class="list-item attendance-row ${a.status ? 'present' : 'absent'}">
      <div class="item-info">
        <strong>${escapeHtml(a.student_name)}</strong>
        <span class="number">出席番号: ${a.student_number}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm ${a.status ? 'btn-secondary' : 'btn-primary'}" 
                data-student-id="${a.student_id}" 
                data-status="${a.status ? '0' : '1'}"
                onclick="recordAttendance(this)">
          ${a.status ? '出席済み → 欠席に変更' : '出席を記録'}
        </button>
      </div>
    </div>
  `).join('');
}

function renderStudents(students) {
  const container = document.getElementById('studentsList');
  if (students.length === 0) {
    container.innerHTML = '<p class="empty">このクラスに生徒がいません</p>';
    return;
  }
  container.innerHTML = students.map(s => `
    <div class="list-item">
      <div class="item-info">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="number">出席番号: ${s.number}</span>
      </div>
    </div>
  `).join('');
}

function updateClassSelects() {
  const options = myClasses.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join('');
  classFilter.innerHTML = '<option value="">クラスを選択</option>' + options;
  studentClassFilter.innerHTML = '<option value="">クラスを選択</option>' + options;
}

// 出席記録（グローバル関数として定義してonclickから呼べるようにする）
window.recordAttendance = async function(btn) {
  const studentId = btn.dataset.studentId;
  const status = btn.dataset.status === '1' ? 'present' : 'absent';
  const classId = classFilter.value;
  const date = dateFilter.value;
  
  try {
    await api.recordAttendance({ 
      class_id: parseInt(classId, 10), 
      date, 
      records: [{ student_id: parseInt(studentId, 10), status }] 
    });
    btn.textContent = status === 'present' ? '出席済み → 欠席に変更' : '出席を記録';
    btn.classList.toggle('btn-primary', status !== 'present');
    btn.classList.toggle('btn-secondary', status === 'present');
    btn.dataset.status = status === 'present' ? '1' : '0';
    // 行のスタイルも更新
    const row = btn.closest('.attendance-row');
    row.classList.toggle('present', status === 'present');
    row.classList.toggle('absent', status !== 'present');
    row.querySelector('.status-badge').textContent = status === 'present' ? '出席' : '欠席';
    row.querySelector('.status-badge').className = `status-badge ${status === 'present' ? 'present' : 'absent'}`;
  } catch (err) {
    alert(`エラー: ${err.message}`);
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