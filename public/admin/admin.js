// 管理者ダッシュボード
import { api } from '../shared/api.js';

// 状態管理
let currentTab = 'bootstrap';
let classes = [];
let teachers = [];
let students = [];

// DOM要素
const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupTabs();
  setupForms();
  setupModals();
  await loadInitialData();
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
    userInfo.textContent = `${me.name} (${me.role})`;
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

function switchTab(tabName) {
  currentTab = tabName;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
  tabPanels.forEach(p => p.classList.toggle('hidden', p.id !== `tab-${tabName}`));
}

// フォーム設定
function setupForms() {
  // 学校登録
  document.getElementById('bootstrapForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      school_name: form.schoolName.value.trim(),
      admin_name: form.adminName.value.trim(),
      admin_pin: form.adminPin.value
    };
    try {
      const result = await api.bootstrap(payload);
      showResult('bootstrapResult', `学校登録完了！学校コード: <strong>${result.school_code}</strong>`, true);
      form.reset();
      await loadClasses();
      await loadTeachers();
      updateClassSelects();
    } catch (err) {
      showResult('bootstrapResult', `エラー: ${err.message}`, false);
    }
  });

  // クラス追加モーダル
  document.getElementById('addClassBtn').addEventListener('click', () => openClassModal());
  document.getElementById('classModalCancel').addEventListener('click', () => closeModal('classModal'));
  document.querySelector('#classModal form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      code: form.code.value.trim().toUpperCase()
    };
    const id = form.id.value;
    try {
      if (id) {
        // 編集の場合はAPIにPUTエンドポイントが必要（未実装のためスキップ）
        alert('編集機能は未実装です');
      } else {
        await api.createClass(payload);
      }
      closeModal('classModal');
      form.reset();
      await loadClasses();
      updateClassSelects();
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  });

  // 教師追加モーダル
  document.getElementById('addTeacherBtn').addEventListener('click', () => openTeacherModal());
  document.getElementById('teacherModalCancel').addEventListener('click', () => closeModal('teacherModal'));
  document.querySelector('#teacherModal form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      class_id: form.class_id.value,
      pin: form.pin.value
    };
    try {
      await api.createTeacher(payload);
      closeModal('teacherModal');
      form.reset();
      await loadTeachers();
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  });

  // 生徒追加モーダル
  document.getElementById('addStudentBtn').addEventListener('click', () => {
    const classId = document.getElementById('studentClassFilter').value;
    if (!classId) return alert('クラスを選択してください');
    openStudentModal(classId);
  });
  document.getElementById('studentModalCancel').addEventListener('click', () => closeModal('studentModal'));
  document.querySelector('#studentModal form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      class_id: form.class_id.value,
      number: parseInt(form.number.value, 10),
      pin: form.pin.value
    };
    try {
      await api.createStudent(payload);
      closeModal('studentModal');
      form.reset();
      await loadStudents(document.getElementById('studentClassFilter').value);
    } catch (err) {
      alert(`エラー: ${err.message}`);
    }
  });

  // クラスフィルタ変更
  document.getElementById('studentClassFilter').addEventListener('change', (e) => {
    document.getElementById('addStudentBtn').disabled = !e.target.value;
    loadStudents(e.target.value);
  });

  // 出席フィルタ変更
  document.getElementById('attendanceClassFilter').addEventListener('change', (e) => {
    loadAttendance(e.target.value, document.getElementById('attendanceDate').value);
  });
  document.getElementById('attendanceDate').addEventListener('change', (e) => {
    loadAttendance(document.getElementById('attendanceClassFilter').value, e.target.value);
  });

  // ログアウト
  logoutBtn.addEventListener('click', async () => {
    try {
      await api.logout();
    } catch (e) {
      // 無視
    }
    api.clearToken();
    location.href = '/login.html';
  });
}

// モーダル操作
function setupModals() {
  document.getElementById('classModalCancel').addEventListener('click', () => closeModal('classModal'));
  document.getElementById('teacherModalCancel').addEventListener('click', () => closeModal('teacherModal'));
  document.getElementById('studentModalCancel').addEventListener('click', () => closeModal('studentModal'));
}

function openClassModal(classData = null) {
  const modal = document.getElementById('classModal');
  const title = document.getElementById('classModalTitle');
  const form = modal.querySelector('form');
  form.reset();
  if (classData) {
    title.textContent = 'クラス編集';
    document.getElementById('classModalId').value = classData.id;
    document.getElementById('classModalName').value = classData.name;
    document.getElementById('classModalCode').value = classData.code;
  } else {
    title.textContent = 'クラス追加';
    document.getElementById('classModalId').value = '';
  }
  modal.showModal();
}

function openTeacherModal(teacherData = null) {
  const modal = document.getElementById('teacherModal');
  const title = document.getElementById('teacherModalTitle');
  const form = modal.querySelector('form');
  form.reset();
  if (teacherData) {
    title.textContent = '教師編集';
    document.getElementById('teacherModalId').value = teacherData.id;
    document.getElementById('teacherModalName').value = teacherData.name;
    document.getElementById('teacherModalClass').value = teacherData.class_id;
    document.getElementById('teacherModalPin').value = '';
  } else {
    title.textContent = '教師追加';
    document.getElementById('teacherModalId').value = '';
  }
  modal.showModal();
}

function openStudentModal(classId, studentData = null) {
  const modal = document.getElementById('studentModal');
  const title = document.getElementById('studentModalTitle');
  const form = modal.querySelector('form');
  form.reset();
  document.getElementById('studentModalClassId').value = classId;
  if (studentData) {
    title.textContent = '生徒編集';
    document.getElementById('studentModalId').value = studentData.id;
    document.getElementById('studentModalName').value = studentData.name;
    document.getElementById('studentModalNumber').value = studentData.number;
    document.getElementById('studentModalPin').value = '';
  } else {
    title.textContent = '生徒追加';
    document.getElementById('studentModalId').value = '';
  }
  modal.showModal();
}

function closeModal(id) {
  document.getElementById(id).close();
}

// データ読み込み
async function loadInitialData() {
  await Promise.all([loadClasses(), loadTeachers()]);
  updateClassSelects();
}

async function loadClasses() {
  try {
    classes = await api.listClasses();
    renderClasses();
  } catch (err) {
    console.error('クラス読み込みエラー:', err);
  }
}

async function loadTeachers() {
  try {
    teachers = await api.listTeachers?.() || [];
    renderTeachers();
  } catch (err) {
    console.error('教師読み込みエラー:', err);
  }
}

async function loadStudents(classId) {
  if (!classId) {
    document.getElementById('studentsList').innerHTML = '<p class="empty">クラスを選択してください</p>';
    return;
  }
  try {
    students = await api.listStudents(classId);
    renderStudents();
  } catch (err) {
    console.error('生徒読み込みエラー:', err);
  }
}

async function loadAttendance(classId, date) {
  if (!classId || !date) {
    document.getElementById('attendanceList').innerHTML = '<p class="empty">クラスと日付を選択してください</p>';
    return;
  }
  try {
    const data = await api.getAttendance(classId, date);
    renderAttendance(data);
  } catch (err) {
    console.error('出席読み込みエラー:', err);
  }
}

// 描画関数
function renderClasses() {
  const container = document.getElementById('classesList');
  if (classes.length === 0) {
    container.innerHTML = '<p class="empty">クラスがありません。「クラス追加」から作成してください</p>';
    return;
  }
  container.innerHTML = classes.map(c => `
    <div class="list-item">
      <div class="item-info">
        <strong>${escapeHtml(c.name)}</strong>
        <span class="code">コード: ${escapeHtml(c.code)}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-edit" data-id="${c.id}" data-name="${escapeHtml(c.name)}" data-code="${escapeHtml(c.code)}">編集</button>
        <button class="btn btn-sm btn-danger" data-id="${c.id}">削除</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openClassModal({
      id: btn.dataset.id,
      name: btn.dataset.name,
      code: btn.dataset.code
    }));
  });
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('このクラスを削除しますか？')) {
        // DELETE API未実装
        alert('削除機能は未実装です');
      }
    });
  });
}

function renderTeachers() {
  const container = document.getElementById('teachersList');
  if (teachers.length === 0) {
    container.innerHTML = '<p class="empty">教師がいません。「教師追加」から作成してください</p>';
    return;
  }
  container.innerHTML = teachers.map(t => {
    const cls = classes.find(c => c.id === t.class_id);
    return `
      <div class="list-item">
        <div class="item-info">
          <strong>${escapeHtml(t.name)}</strong>
          <span class="class">担当: ${cls ? escapeHtml(cls.name) : '不明'}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-sm btn-edit" data-id="${t.id}">編集</button>
          <button class="btn btn-sm btn-danger" data-id="${t.id}">削除</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = teachers.find(x => x.id === btn.dataset.id);
      if (t) openTeacherModal(t);
    });
  });
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この教師を削除しますか？')) {
        alert('削除機能は未実装です');
      }
    });
  });
}

function renderStudents() {
  const container = document.getElementById('studentsList');
  if (students.length === 0) {
    container.innerHTML = '<p class="empty">生徒がいません。「生徒追加」から作成してください</p>';
    return;
  }
  container.innerHTML = students.map(s => `
    <div class="list-item">
      <div class="item-info">
        <strong>${escapeHtml(s.name)}</strong>
        <span class="number">出席番号: ${s.number}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-edit" data-id="${s.id}">編集</button>
        <button class="btn btn-sm btn-danger" data-id="${s.id}">削除</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = students.find(x => x.id === btn.dataset.id);
      if (s) openStudentModal(s.class_id, s);
    });
  });
  container.querySelectorAll('.btn-danger').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この生徒を削除しますか？')) {
        alert('削除機能は未実装です');
      }
    });
  });
}

function renderAttendance(data) {
  const container = document.getElementById('attendanceList');
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty">出席データがありません</p>';
    return;
  }
  container.innerHTML = data.map(a => `
    <div class="list-item attendance-row ${a.status ? 'present' : 'absent'}">
      <div class="item-info">
        <strong>${escapeHtml(a.student_name)}</strong>
        <span class="number">出席番号: ${a.student_number}</span>
      </div>
      <div class="item-status">
        <span class="status-badge ${a.status ? 'present' : 'absent'}">
          ${a.status ? '出席' : '欠席'}
        </span>
        ${a.recorded_at ? `<span class="time">記録: ${new Date(a.recorded_at).toLocaleString('ja-JP')}</span>` : ''}
        ${a.teacher_name ? `<span class="teacher">記録者: ${escapeHtml(a.teacher_name)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ユーティリティ
function updateClassSelects() {
  const selects = [
    document.getElementById('teacherModalClass'),
    document.getElementById('studentClassFilter'),
    document.getElementById('attendanceClassFilter')
  ];
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">クラスを選択</option>' +
      classes.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</option>`).join('');
    select.value = currentValue;
  });
  document.getElementById('addStudentBtn').disabled = !document.getElementById('studentClassFilter').value;
}

function showResult(id, message, success) {
  const el = document.getElementById(id);
  el.innerHTML = message;
  el.className = `result ${success ? 'success' : 'error'}`;
  el.classList.remove('hidden');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&', '<': '<', '>': '>', '"': '"', "'": '''
  })[c]);
}

// 今日の日付をデフォルトに設定
document.getElementById('attendanceDate').valueAsDate = new Date();