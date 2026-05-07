import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Star,
  TrendingUp,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Upload,
  Download
} from 'lucide-react';
import { adminAPI, taxonomyAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminChurches = () => {
  const navigate = useNavigate();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [denominationFilter, setDenominationFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showActions, setShowActions] = useState(null);
  const [selected, setSelected] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const fileInputRef = React.useRef(null);
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    fetchChurches();
    fetchDenominations();
  }, [page, limit, statusFilter, denominationFilter]);

  const fetchDenominations = async () => {
    try {
      const res = await taxonomyAPI.getAll();
      setDenominations(res.data.denomination || []);
    } catch (error) {
      console.error('Error fetching denominations:', error);
    }
  };

  const fetchChurches = async () => {
    setLoading(true);
    try {
      const params = { skip: page * limit, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (denominationFilter) params.denomination = denominationFilter;
      
      const res = await adminAPI.getChurches(params);
      setChurches(res.data.data);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Failed to load churches');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminAPI.bulkExport('church');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `churches_export_${new Date().toISOString().split('T')[0]}.csv`);
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
      const res = await adminAPI.bulkUpload('church', file);
      toast.success(res.data.message, { id: 'bulk-upload' });
      if (res.data.errors?.length > 0) {
        console.warn('Import errors:', res.data.errors);
        toast.warning(`${res.data.errors.length} rows had errors. Check console.`);
      }
      fetchChurches();
    } catch (error) {
      toast.error('Bulk upload failed', { id: 'bulk-upload' });
    }
    e.target.value = null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchChurches();
  };

  const handleStatusChange = async (churchId, newStatus) => {
    try {
      await adminAPI.changeChurchStatus(churchId, newStatus);
      toast.success('Church status updated');
      fetchChurches();
    } catch (error) {
      toast.error('Failed to update status');
    }
    setShowActions(null);
  };

  const handleFeature = async (churchId, featured) => {
    try {
      await adminAPI.feature('church', churchId, featured);
      toast.success(featured ? 'Church featured' : 'Church unfeatured');
      fetchChurches();
    } catch (error) {
      toast.error('Failed to update');
    }
    setShowActions(null);
  };

  const handleRecommend = async (churchId, recommended) => {
    try {
      await adminAPI.recommend('church', churchId, recommended);
      toast.success(recommended ? 'Church recommended' : 'Church unrecommended');
      fetchChurches();
    } catch (error) {
      toast.error('Failed to update');
    }
    setShowActions(null);
  };

  const handleDelete = async (churchId) => {
    if (!window.confirm('Are you sure you want to delete this church?')) return;
    
    try {
      await adminAPI.deleteChurch(churchId);
      toast.success('Church deleted');
      fetchChurches();
    } catch (error) {
      toast.error('Failed to delete church');
    }
    setShowActions(null);
  };

  const handleBulkAction = async (action) => {
    if (selected.length === 0) {
      toast.error('Please select churches first');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to ${action} ${selected.length} churches?`)) return;
    
    try {
      await adminAPI.bulkChurchAction(action, selected);
      toast.success(`Successfully ${action}ed ${selected.length} churches`);
      setSelected([]);
      fetchChurches();
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === churches.length) {
      setSelected([]);
    } else {
      setSelected(churches.map(c => c.id));
    }
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Church Management</h1>
          <p className="text-slate-500">Manage and moderate all church listings across the platform</p>
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
            {total} Churches
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64 relative">
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
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={denominationFilter} onValueChange={(v) => { setDenominationFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Denominations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Denominations</SelectItem>
              {denominations.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit">Search</Button>
        </form>
      </Card>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <Card className="p-4 bg-brand/5 border-brand">
          <div className="flex items-center justify-between">
            <p className="font-medium">{selected.length} churches selected</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleBulkAction('publish')}>
                Publish All
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction('feature')}>
                Feature All
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                Delete All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Churches Table */}
      <Card className="border-x-0 sm:border-x rounded-none sm:rounded-xl overflow-visible">
        <div className="overflow-x-auto pb-48">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 w-12">
                  <Checkbox
                    checked={selected.length === churches.length && churches.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-4 font-medium text-slate-600">Church</th>
                <th className="text-left p-4 font-medium text-slate-600">Location</th>
                <th className="text-left p-4 font-medium text-slate-600">Denomination</th>
                <th className="text-left p-4 font-medium text-slate-600">Status</th>
                <th className="text-left p-4 font-medium text-slate-600">Badges</th>
                <th className="text-right p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading churches...
                  </td>
                </tr>
              ) : churches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No churches found
                  </td>
                </tr>
              ) : (
                churches.map((church) => (
                  <tr key={church.id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <Checkbox
                        checked={selected.includes(church.id)}
                        onCheckedChange={() => toggleSelect(church.id)}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                          {church.logo ? (
                            <img 
                              src={church.logo.startsWith('http') ? church.logo : `${process.env.REACT_APP_BACKEND_URL}${church.logo}`}
                              alt={church.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '';
                                e.target.parentElement.innerHTML = '<span class="text-xl">⛪</span>';
                              }}
                            />
                          ) : (
                            <span className="text-xl">⛪</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{church.name}</p>
                          <p className="text-xs text-slate-500">{church.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-3 w-3" />
                        {church.city}, {church.state}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{church.denomination || '-'}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(church.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {church.is_featured && (
                          <Badge variant="outline" className="bg-yellow-50">
                            <Star className="h-3 w-3 mr-1 text-yellow-500" />
                            Featured
                          </Badge>
                        )}
                        {church.is_recommended && (
                          <Badge variant="outline" className="bg-blue-50">
                            <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowActions(showActions === church.id ? null : church.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {showActions === church.id && (
                        <div className="absolute right-4 top-12 bg-white border rounded-lg shadow-lg z-10 py-2 min-w-48">
                          <a
                            href={`/church/${church.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View Listing
                          </a>
                          <button
                            onClick={() => navigate(`/listing/church/edit/${church.id}`)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Listing
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleStatusChange(church.id, 'published')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Publish
                          </button>
                          <button
                            onClick={() => handleStatusChange(church.id, 'draft')}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Set to Draft
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleFeature(church.id, !church.is_featured)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Star className="h-4 w-4 text-yellow-500" />
                            {church.is_featured ? 'Remove Featured' : 'Feature'}
                          </button>
                          <button
                            onClick={() => handleRecommend(church.id, !church.is_recommended)}
                            className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
                          >
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            {church.is_recommended ? 'Remove Recommended' : 'Recommend'}
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDelete(church.id)}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Church
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

export default AdminChurches;
