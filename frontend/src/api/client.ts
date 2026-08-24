import type {
  User,
  Class,
  Teacher,
  Student,
  AttendanceRecord,
  AttendanceResponse,
  LoginStudentRequest,
  LoginStaffRequest,
  LoginResponse,
  BootstrapRequest,
  BootstrapResponse,
  ApiError,
} from '../types/api';

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const API_BASE = isLocalhost ? '/api' : 'https://atn-api.ryopc.org/api';

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Cookieを自動送信
    });

    if (!response.ok) {
      let error: ApiError = { message: '不明なエラー' };
      try {
        error = await response.json();
      } catch {
        error.message = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(error.message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Auth
  async loginStudent(data: LoginStudentRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginAdmin(data: LoginStaffRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginTeacher(data: LoginStaffRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login/teacher', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  async me(): Promise<User> {
    return this.request<User>('/me');
  }

  // Bootstrap
  async bootstrap(data: BootstrapRequest): Promise<BootstrapResponse> {
    return this.request<BootstrapResponse>('/schools/bootstrap', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Classes
  async listClasses(): Promise<Class[]> {
    return this.request<Class[]>('/classes');
  }

  async createClass(data: { name: string; grade?: number }): Promise<Class> {
    return this.request<Class>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Teachers
  async listTeachers(): Promise<Teacher[]> {
    return this.request<Teacher[]>('/teachers');
  }

  async createTeacher(data: {
    login_id: string;
    name: string;
    class_id?: number;
    pin: string;
  }): Promise<Teacher> {
    return this.request<Teacher>('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Students
  async listStudents(classId: number): Promise<Student[]> {
    return this.request<Student[]>(`/students?class_id=${classId}`);
  }

  async createStudent(data: {
    class_id: number;
    student_number: string;
    pin: string;
    name: string;
  }): Promise<Student> {
    return this.request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Attendance
  async getAttendance(classId: number, date: string): Promise<AttendanceResponse[]> {
    return this.request<AttendanceResponse[]>(`/attendance?class_id=${classId}&date=${date}`);
  }

  async recordAttendance(data: {
    class_id: number;
    student_id: number;
    date: string;
    status: boolean;
  }): Promise<AttendanceRecord> {
    return this.request<AttendanceRecord>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
