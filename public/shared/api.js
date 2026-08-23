// 共通APIクライアント
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = null;
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('atnhub_token');
    }
    return this.token;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('atnhub_token', token);
    } else {
      localStorage.removeItem('atnhub_token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('atnhub_token');
  }

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '不明なエラー' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // ヘルスチェック
  async health() {
    return this.request('/');
  }

  // 学校登録（初期セットアップ）
  async bootstrap(payload) {
    return this.request('/schools/bootstrap', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 生徒ログイン
  async loginStudent(payload) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result.token) this.setToken(result.token);
    return result;
  }

  // 管理者ログイン
  async loginAdmin(payload) {
    const result = await this.request('/auth/login/admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result.token) this.setToken(result.token);
    return result;
  }

  // 教師ログイン
  async loginTeacher(payload) {
    const result = await this.request('/auth/login/teacher', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result.token) this.setToken(result.token);
    return result;
  }

  // ログアウト
  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // 現在のユーザー情報
  async me() {
    return this.request('/auth/me');
  }

  // クラス一覧
  async listClasses() {
    return this.request('/classes');
  }

  // クラス作成
  async createClass(payload) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 教師一覧
  async listTeachers() {
    return this.request('/teachers');
  }

  // 教師作成
  async createTeacher(payload) {
    return this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 生徒一覧
  async listStudents(classId) {
    return this.request(`/students?class_id=${classId}`);
  }

  // 生徒作成
  async createStudent(payload) {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 出席記録
  async recordAttendance(payload) {
    return this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // 出席取得
  async getAttendance(classId, date) {
    return this.request(`/attendance?class_id=${classId}&date=${date}`);
  }
}

export const api = new ApiClient();