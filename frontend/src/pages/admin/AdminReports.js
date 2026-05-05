import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [resolving, setResolving] = useState(null);
  const [resolution, setResolution] = useState('');
  const limit = 15;

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (statusFilter) params.status = statusFilter;
      
      const res = await adminAPI.getReports(params);
      setReports(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId) => {
    if (!resolution.trim()) {
      toast.error('Please enter a resolution');
      return;
    }
    
    try {
      await adminAPI.resolveReport(reportId, resolution, '');
      toast.success('Report resolved');
      setResolving(null);
      setResolution('');
      fetchReports();
    } catch (error) {
      toast.error('Failed to resolve report');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Reports</h1>
          <p className="text-slate-600">Review reported listings and content</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {total} Reports
        </Badge>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Flag className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reports List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Reports</h3>
          <p className="text-slate-600">No content reports to review</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <Card key={report.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className={`h-5 w-5 ${report.status === 'pending' ? 'text-yellow-500' : 'text-green-500'}`} />
                    <span className="font-medium capitalize">{report.listing_type} Report</span>
                    <Badge variant={report.status === 'pending' ? 'secondary' : 'outline'}>
                      {report.status === 'pending' ? (
                        <><Clock className="h-3 w-3 mr-1" /> Pending</>
                      ) : (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Resolved</>
                      )}
                    </Badge>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-slate-500">Reason: <span className="text-slate-700 font-medium">{report.reason}</span></p>
                    {report.description && (
                      <p className="text-sm text-slate-600 mt-1">{report.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Reported: {new Date(report.created_at).toLocaleString()}
                  </p>
                  {report.resolution && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700"><strong>Resolution:</strong> {report.resolution}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/${report.listing_type}/${report.listing_id}`} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                  {report.status === 'pending' && (
                    <Button size="sm" onClick={() => setResolving(report.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              {resolving === report.id && (
                <div className="mt-4 pt-4 border-t">
                  <label className="text-sm font-medium mb-2 block">Resolution Notes</label>
                  <Textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    placeholder="Describe the action taken..."
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="ghost" onClick={() => { setResolving(null); setResolution(''); }}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleResolve(report.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
    </div>
  );
};

export default AdminReports;
