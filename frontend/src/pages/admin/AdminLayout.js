import React from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Church, 
  User, 
  CheckSquare, 
  Tags, 
  BarChart3, 
  Settings, 
  Bell, 
  FileText, 
  Shield,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const sidebarItems = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: Users, label: 'User Management' },
  { path: '/admin/churches', icon: Church, label: 'Churches' },
  { path: '/admin/pastors', icon: User, label: 'Pastors' },
  { path: '/admin/verification', icon: CheckSquare, label: 'Verification Queue' },
  { path: '/admin/taxonomies', icon: Tags, label: 'Taxonomies' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/reports', icon: Shield, label: 'Reports' },
  { path: '/admin/announcements', icon: Bell, label: 'Announcements' },
  { path: '/admin/logs', icon: FileText, label: 'Audit Logs' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

const AdminLayout = () => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  // Wait for auth to load
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  // Check if user is super admin
  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top Header */}
      <header className="bg-slate-900 text-white h-16 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-brand" />
          <div>
            <h1 className="font-bold text-lg">Church Navigator</h1>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            View Site
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-sm font-bold">
              {user.first_name?.[0] || user.email[0].toUpperCase()}
            </div>
            <span className="text-sm">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-300 hover:text-white">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 min-h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active 
                      ? 'bg-brand text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
