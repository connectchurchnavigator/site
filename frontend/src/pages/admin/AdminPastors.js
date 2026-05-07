import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Star,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  MapPin,
  Upload,
  Download
} from 'lucide-react';
import { adminAPI, taxonomyAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminPastors = () => {
  const navigate = useNavigate();
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showActions, setShowActions] = useState(null);
  const fileInputRef = React.useRef(null);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    fetchPastors();
  }, [page, limit, statusFilter]);

  const fetchPastors = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      
      const res = await adminAPI.getPastors(params);
      setPastors(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load pastors');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.bulkExport('pastor');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pastors_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export successful');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }

    try {
      toast.loading('Processing bulk upload...', { id: 'bulk-upload' });
      const res = await adminAPI.bulkUpload('pastor', file);
      toast.success(res.data.message, { id: 'bulk-upload' });
      if (res.data.errors?.length > 0) {
        console.warn('Import errors:', res.data.errors);
        toast.warning(`${res.data.errors.length} rows had errors. Check console.`);
      }
      fetchPastors();
    } catch (error) {
      toast.error('Bulk upload failed', { id: 'bulk-upload' });
    }
    e.target.value = null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchPastors();
  };

  const handleStatusChange = async (pastorId, newStatus) => {
    try {
      await adminAPI.changePastorStatus(pastorId, newStatus);
      toast.success('Pastor status updated');
      fetchPastors();
    } catch (error) {
      toast.error('Failed to update status');
    }
    setShowActions(null);
  };

  const handleFeature = async (pastorId, featured) => {
    try {
      await adminAPI.feature('pastor', pastorId, featured);
      toast.success(featured ? 'Pastor featured' : 'Pastor unfeatured');
      fetchPastors();
    } catch (error) {
      toast.error('Failed to update');
    }
    setShowActions(null);
  };

  const handleDelete = async (pastorId) => {
    if (!window.confirm('Are you sure you want to delete this pastor?')) return;
    
    try {
      await adminAPI.deletePastor(pastorId);
      toast.success('Pastor deleted');
      fetchPastors();
    } catch (error) {
      toast.error('Failed to delete pastor');
    }
    setShowActions(null);
  };

  const getStatusBadge = (status) => {
    const configs = {
      published: { variant: 'default', icon: CheckCircle, color: 'text-green-500' },
      pending_verification: { variant: 'secondary', icon: Clock, color: 'text-yellow-500' },
      draft: { variant: 'outline', icon: Edit, color: 'text-slate-400' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-500' }
    };
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
        {status?.replace('_', ' ')}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="px-6 py-4 border-b bg-white">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Pastor Management</h1>
          <p className="text-slate-500">Manage and moderate all pastor profiles across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".csv"
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {total} Pastors
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, city, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="pending_verification">Pending</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {/* Pastors Table */}
      <Card className="border-x-0 sm:border-x rounded-none sm:rounded-xl overflow-visible">
        <div className="overflow-x-auto pb-48">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">Pastor</th>
                <th className="text-left p-4 font-medium text-slate-600">Location</th>
                <th className="text-left p-4 font-medium text-slate-600">Contact</th>
                <th className="text-left p-4 font-medium text-slate-600">Status</th>
                <th className="text-left p-4 font-medium text-slate-600">Badges</th>
                <th className="text-right p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading pastors...
                  </td>
                </tr>
              ) : pastors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No pastors found
                  </td>
                </tr>
              ) : (
                pastors.map((pastor) => (
                  <tr key={pastor.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                          {pastor.profile_picture ? (
                            <img 
                              src={pastor.profile_picture.startsWith('http') ? pastor.profile_picture : `${process.env.REACT_APP_BACKEND_URL}${pastor.profile_picture}`}
                              alt={pastor.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.parentElement.innerHTML = '<span class="text-xl">👤</span>';
                              }}
                            />
                          ) : (
                            <span className="text-xl">👤</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{pastor.name}</p>
                          <p className="text-xs text-slate-500">{pastor.denomination || 'No denomination'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-3 w-3" />
                        {pastor.city || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {pastor.email || pastor.phone || 'N/A'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(pastor.status)}
                    </td>
                    <td className="p-4">
                      {pastor.is_featured && (
                        <Badge variant="outline" className="bg-yellow-50">
                          <Star className="h-3 w-3 mr-1 text-yellow-500" />
                          Featured
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(showActions === pastor.id ? null : pastor.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {showActions === pastor.id && (
                        <div className="absolute right-4 top-12 bg-white border rounded-lg shadow-lg z-10 py-2 min-w-48">
                          <a
                            href={`/pastor/${pastor.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Profile
                          </a>
                          <button
                            onClick={() => navigate(`/listing/pastor/edit/${pastor.id}`)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Profile
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleStatusChange(pastor.id, 'published')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Publish
                          </button>
                          <button
                            onClick={() => handleStatusChange(pastor.id, 'draft')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Set to Draft
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleFeature(pastor.id, !pastor.is_featured)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Star className="h-4 w-4 text-yellow-500" />
                            {pastor.is_featured ? 'Remove Featured' : 'Feature'}
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDelete(pastor.id)}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Pastor
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
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Rows per page:</span>
            <Select 
              value={limit.toString()} 
              onValueChange={(v) => {
                setLimit(v === 'all' ? total : parseInt(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600 ml-4">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1 px-4">
              <span className="text-sm font-medium">Page {page + 1}</span>
              <span className="text-sm text-slate-400">of {totalPages || 1}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden sm:block w-32" /> {/* Spacer for balance */}
        </div>
      </Card>
    </div>
  );
};

export default AdminPastors;
