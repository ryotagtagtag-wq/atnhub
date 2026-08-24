// API Response Types based on Worker spec

export type UserRole = 'student' | 'teacher' | 'school_admin';

export interface User {
  id: number;
  login_id: string;
  name: string;
  role: UserRole;
  class_id?: number;
  number?: string;
  school_id?: number;
}

export interface School {
  id: number;
  name: string;
  code: string;
  slug: string;
}

export interface Class {
  id: number;
  name: string;
  grade?: number;
  school_id: number;
  teacher_id?: number;
}

export interface Teacher {
  id: number;
  login_id: string;
  name: string;
  class_id?: number;
  school_id: number;
}

export interface Student {
  id: number;
  number: string;
  name: string;
  class_id: number;
  school_id: number;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  student_number: string;
  class_id: number;
  date: string;
  status: boolean; // true = present, false = absent
  recorded_at: string;
  teacher_name?: string;
}

export interface AttendanceResponse {
  student_id: number;
  student_name: string;
  student_number: string;
  status: boolean;
  recorded_at: string;
  teacher_name?: string;
}

// Auth

export interface LoginStudentRequest {
  school_code: string;
  class_code: string;
  number: string;
  pin: string;
}

export interface LoginStaffRequest {
  school_code: string;
  login_id: string;
  pin: string;
}

export type LoginRequest = LoginStudentRequest | LoginStaffRequest;

export interface LoginResponse {
  token: string;
  user: User;
}

// Bootstrap

export interface BootstrapRequest {
  name: string;
  slug: string;
  admin_login_id: string;
  admin_pin: string;
  admin_name: string;
}

export interface BootstrapResponse {
  token: string;
  user: User;
  school: {
    code: string;
  };
}

// API Error

export interface ApiError {
  message: string;
  code?: string;
}

// Pagination

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
