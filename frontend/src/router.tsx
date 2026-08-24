import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/register/RegisterPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import type { UserRole } from './types/api';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectMap: Record<UserRole, string> = {
      student: '/student',
      teacher: '/teacher',
      school_admin: '/admin',
    };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <>{children}</>;
}

// Route components that use the protected wrapper
function AdminRoutes() {
  return (
    <ProtectedRoute allowedRoles={["school_admin"]}>
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function TeacherRoutes() {
  return (
    <ProtectedRoute allowedRoles={["teacher"]}>
      <TeacherDashboard />
    </ProtectedRoute>
  );
}

function StudentRoutes() {
  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <StudentDashboard />
    </ProtectedRoute>
  );
}

function PublicRoutes({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    const redirectMap: Record<UserRole, string> = {
      student: '/student',
      teacher: '/teacher',
      school_admin: '/admin',
    };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: 'login',
        element: <PublicRoutes><LoginPage /></PublicRoutes>,
      },
      {
        path: 'register',
        element: <PublicRoutes><RegisterPage /></PublicRoutes>,
      },
      { path: 'admin', element: <AdminRoutes /> },
      { path: 'teacher', element: <TeacherRoutes /> },
      { path: 'student', element: <StudentRoutes /> },
    ],
  },
]);
