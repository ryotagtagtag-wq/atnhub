import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui';
import { LogOut, Calendar, Users } from 'lucide-react';

const navigation = [
  { name: '出席記録', href: '/teacher', icon: Calendar, roles: ['teacher'] },
  { name: '担当生徒', href: '/teacher', icon: Users, roles: ['teacher'] },
  { name: '今日の出席', href: '/student', icon: Calendar, roles: ['student'] },
];

export function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Outlet />;
  }

  const userNav = navigation.filter((item) => item.roles.includes(user.role));
  const isAdmin = user.role === 'school_admin';
  const isTeacher = user.role === 'teacher';

  const basePath = isAdmin ? '/admin' : isTeacher ? '/teacher' : '/student';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to={basePath} className="text-xl font-bold text-primary">
                ATN Hub
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {userNav.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                {user.name} ({user.role === 'school_admin' ? '管理者' : user.role === 'teacher' ? '教師' : '生徒'})
              </span>
              <Button variant="secondary" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto px-4 pb-4 pt-5">
            <nav className="flex flex-1 flex-col">
              <ul className="flex flex-col gap-y-2" role="list" aria-label="メインナビゲーション">
                {userNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
