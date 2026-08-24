import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User, UserRole } from '../types/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (role: UserRole, data: any) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await api.me();
        setUser(userData);
      } catch {
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (role: UserRole, data: any) => {
    let response;
    switch (role) {
      case 'student':
        response = await api.loginStudent(data);
        break;
      case 'teacher':
        response = await api.loginTeacher(data);
        break;
      case 'school_admin':
        response = await api.loginAdmin(data);
        break;
    }
    setUser(response.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const bootstrap = async (data: any) => {
    const response = await api.bootstrap(data);
    setUser(response.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, bootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
