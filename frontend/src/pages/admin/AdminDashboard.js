import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Users, 
  Church, 
  User, 
  Clock, 
  TrendingUp, 
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getAnalyticsOverview();
      setStats(res.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-600">Welcome to the admin dashboard</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Users</p>
              <p className="text-4xl font-bold">{stats?.total_users || 0}</p>
            </div>
            <Users className="h-12 w-12 text-blue-200" />
          </div>
          <Link to="/admin/users" className="text-sm text-blue-100 hover:text-white mt-4 inline-block">
            View all users →
          </Link>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Total Churches</p>
              <p className="text-4xl font-bold">{stats?.total_churches || 0}</p>
            </div>
            <Church className="h-12 w-12 text-emerald-200" />
          </div>
          <Link to="/admin/churches" className="text-sm text-emerald-100 hover:text-white mt-4 inline-block">
            Manage churches →
          </Link>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Pastors</p>
              <p className="text-4xl font-bold">{stats?.total_pastors || 0}</p>
            </div>
            <User className="h-12 w-12 text-purple-200" />
          </div>
          <Link to="/admin/pastors" className="text-sm text-purple-100 hover:text-white mt-4 inline-block">
            Manage pastors →
          </Link>
        </Card>
      </div>

      {/* Church Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Church className="h-5 w-5 text-brand" />
            Church Listing Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Published</span>
              </div>
              <Badge variant="secondary">{stats?.churches?.published || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span>Pending Verification</span>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                {stats?.churches?.pending || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-slate-400" />
                <span>Draft</span>
              </div>
              <Badge variant="outline">{stats?.churches?.draft || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>Rejected</span>
              </div>
              <Badge variant="destructive">{stats?.churches?.rejected || 0}</Badge>
            </div>
          </div>
          
          <hr className="my-4" />
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Featured
              </span>
              <span className="font-semibold">{stats?.churches?.featured || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Recommended
              </span>
              <span className="font-semibold">{stats?.churches?.recommended || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            Recent Activity (7 days)
          </h3>
          <div className="space-y-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{stats?.recent_activity?.new_users || 0}</p>
              <p className="text-sm text-slate-600">New Users</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">{stats?.recent_activity?.new_churches || 0}</p>
              <p className="text-sm text-slate-600">New Churches</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{stats?.recent_activity?.new_pastors || 0}</p>
              <p className="text-sm text-slate-600">New Pastors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            to="/admin/verification"
            className="p-4 border rounded-lg hover:border-brand hover:bg-brand/5 transition-colors text-center"
          >
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-brand" />
            <p className="font-medium">Review Pending</p>
            <p className="text-sm text-slate-500">{stats?.churches?.pending || 0} awaiting</p>
          </Link>
          
          <Link 
            to="/admin/users"
            className="p-4 border rounded-lg hover:border-brand hover:bg-brand/5 transition-colors text-center"
          >
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="font-medium">Manage Users</p>
            <p className="text-sm text-slate-500">{stats?.total_users || 0} total</p>
          </Link>
          
          <Link 
            to="/admin/taxonomies"
            className="p-4 border rounded-lg hover:border-brand hover:bg-brand/5 transition-colors text-center"
          >
            <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="font-medium">Taxonomies</p>
            <p className="text-sm text-slate-500">Manage categories</p>
          </Link>
          
          <Link 
            to="/admin/announcements"
            className="p-4 border rounded-lg hover:border-brand hover:bg-brand/5 transition-colors text-center"
          >
            <Bell className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="font-medium">Announcements</p>
            <p className="text-sm text-slate-500">Send notifications</p>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
