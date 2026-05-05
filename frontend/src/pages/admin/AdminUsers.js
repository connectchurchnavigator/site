import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Search, 
  MoreVertical, 
  UserCog, 
  Trash2, 
  Ban, 
  Shield, 
  Key,
  ChevronLeft,
  ChevronRight,
  Mail
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActions, setShowActions] = useState(null);
  const limit = 15;

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await adminAPI.changeUserRole(userId, newRole);
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
    setShowActions(null);
  };

  const handleSuspend = async (userId, suspend) => {
    try {
      await adminAPI.suspendUser(userId, suspend);
      toast.success(suspend ? 'User suspended' : 'User activated');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
    setShowActions(null);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
    setShowActions(null);
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt('Enter new password for this user:');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      await adminAPI.resetUserPassword(userId, newPassword);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
    setShowActions(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage all registered users</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {total} Users
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">User</th>
                <th className="text-left p-4 font-medium text-slate-600">Email</th>
                <th className="text-left p-4 font-medium text-slate-600">Role</th>
                <th className="text-left p-4 font-medium text-slate-600">Status</th>
                <th className="text-left p-4 font-medium text-slate-600">Joined</th>
                <th className="text-right p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center text-brand font-semibold">
                          {user.first_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.first_name || user.last_name 
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                              : 'No name'}
                          </p>
                          <p className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                        {user.role === 'super_admin' ? (
                          <><Shield className="h-3 w-3 mr-1" /> Admin</>
                        ) : 'Customer'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.status === 'suspended' ? 'destructive' : 'outline'}>
                        {user.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {showActions === user.id && (
                        <div className="absolute right-4 top-12 bg-white border rounded-lg shadow-lg z-10 py-2 min-w-48">
                          <button
                            onClick={() => handleChangeRole(user.id, user.role === 'super_admin' ? 'customer' : 'super_admin')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <UserCog className="h-4 w-4" />
                            {user.role === 'super_admin' ? 'Demote to Customer' : 'Promote to Admin'}
                          </button>
                          <button
                            onClick={() => handleSuspend(user.id, user.status !== 'suspended')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Ban className="h-4 w-4" />
                            {user.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Key className="h-4 w-4" />
                            Reset Password
                          </button>
                          <hr className="my-2" />
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete User
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-slate-600">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminUsers;
