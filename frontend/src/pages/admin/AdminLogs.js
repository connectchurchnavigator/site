import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  FileText, 
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const actionColors = {
  update_user: 'bg-blue-100 text-blue-700',
  delete_user: 'bg-red-100 text-red-700',
  change_role: 'bg-purple-100 text-purple-700',
  suspend_user: 'bg-orange-100 text-orange-700',
  reset_password: 'bg-yellow-100 text-yellow-700',
  update_church: 'bg-green-100 text-green-700',
  delete_church: 'bg-red-100 text-red-700',
  update_pastor: 'bg-green-100 text-green-700',
  delete_pastor: 'bg-red-100 text-red-700',
  approve_listing: 'bg-emerald-100 text-emerald-700',
  reject_listing: 'bg-red-100 text-red-700',
  feature_listing: 'bg-yellow-100 text-yellow-700',
  recommend_listing: 'bg-blue-100 text-blue-700',
  create_taxonomy: 'bg-green-100 text-green-700',
  update_taxonomy: 'bg-blue-100 text-blue-700',
  delete_taxonomy: 'bg-red-100 text-red-700',
  update_settings: 'bg-purple-100 text-purple-700',
  create_announcement: 'bg-blue-100 text-blue-700',
  delete_announcement: 'bg-red-100 text-red-700',
  resolve_report: 'bg-green-100 text-green-700',
  bulk_delete: 'bg-red-100 text-red-700',
  bulk_publish: 'bg-green-100 text-green-700'
};

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 25;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (actionFilter) params.action = actionFilter;
      
      const res = await adminAPI.getLogs(params);
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-600">Track all admin actions</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {total} Records
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="update_user">Update User</SelectItem>
              <SelectItem value="delete_user">Delete User</SelectItem>
              <SelectItem value="change_role">Change Role</SelectItem>
              <SelectItem value="suspend_user">Suspend User</SelectItem>
              <SelectItem value="approve_listing">Approve Listing</SelectItem>
              <SelectItem value="reject_listing">Reject Listing</SelectItem>
              <SelectItem value="feature_listing">Feature Listing</SelectItem>
              <SelectItem value="delete_church">Delete Church</SelectItem>
              <SelectItem value="delete_pastor">Delete Pastor</SelectItem>
              <SelectItem value="update_settings">Update Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Logs Found</h3>
            <p className="text-slate-600">Admin actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.admin_name || log.admin_email || 'Admin'}</span>
                        <Badge className={actionColors[log.action] || 'bg-slate-100'}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{log.details}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-slate-50">
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

export default AdminLogs;
