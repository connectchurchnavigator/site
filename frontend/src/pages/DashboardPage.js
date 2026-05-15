import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { NavbarPremium } from '../components/NavbarPremium';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '../components/ui/dropdown-menu';
import { Checkbox } from '../components/ui/checkbox';
import { 
  LayoutDashboard, 
  ListChecks, 
  BookMarked, 
  Settings, 
  Eye, 
  TrendingUp, 
  Users, 
  Heart, 
  Zap, 
  BarChart3, 
  Globe, 
  Monitor, 
  MousePointer, 
  ChevronDown, 
  Search as SearchIcon, 
  Activity, 
  Clock, 
  MoreVertical, 
  Trash2, 
  FileText, 
  Undo2,
  Rocket,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronRight,
  X
} from 'lucide-react';
import { authAPI, churchAPI, pastorAPI, bookmarkAPI, analyticsAPI, adminAPI, claimAPI, visitorAPI } from '../lib/api';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn, getImageUrl, getFallbackImage } from '../lib/utils';

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <NavbarPremium variant="light" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sticky top-20">
              <nav className="space-y-2">
                <Link 
                  to="/dashboard" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard' || location.pathname === '/dashboard/'
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
                <Link 
                  to="/dashboard/my-listings" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/my-listings'
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <ListChecks className="h-5 w-5 mr-3" />
                  My Listings
                </Link>
                <Link 
                  to="/dashboard/bookmarks" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/bookmarks'
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <BookMarked className="h-5 w-5 mr-3" />
                  Bookmarks
                </Link>
                <Link 
                  to="/dashboard/account" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/account'
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Account Details
                </Link>
                <Link 
                  to="/dashboard/claim-requests" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/claim-requests'
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <ShieldCheck className="h-5 w-5 mr-3" />
                  Claim Requests
                </Link>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState(user?.role === 'super_admin' ? 'sitewide' : 'account');
  const [selectedListing, setSelectedListing] = useState('all');
  const [listingSearch, setListingSearch] = useState('');
  const [showListingDropdown, setShowListingDropdown] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('last_7d');
  const [data, setData] = useState(null);
  const [listingInsights, setListingInsights] = useState(null);

  useEffect(() => {
    fetchDashboard();
    if (selectedListing && selectedListing !== 'all') {
      fetchListingInsights(selectedListing);
    } else {
      setListingInsights(null);
    }
  }, [scope, selectedListing]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = { scope };
      if (selectedListing !== 'all') params.listing_id = selectedListing;
      const res = await analyticsAPI.getUserDashboard(params);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListingInsights = async (id) => {
    try {
      const res = await churchAPI.getListingInsights(id);
      setListingInsights(res.data);
    } catch (error) {
      console.error('Error fetching listing insights:', error);
    }
  };

  const overview = data?.overview || {};
  const views = data?.views || {};
  const uniqueViews = data?.unique_views || {};
  const allListings = data?.listings || [];
  const chartData = data?.chart?.[chartPeriod] || [];

  const filteredListings = allListings.filter(l =>
    l.name.toLowerCase().includes(listingSearch.toLowerCase())
  );

  const selectedListingName = selectedListing === 'all'
    ? 'All Listings'
    : allListings.find(l => l.id === selectedListing)?.name || 'All Listings';

  const overviewCards = [
    { label: 'Published Listings', value: overview.published, bg: 'bg-gradient-to-br from-violet-600 to-purple-600', icon: ListChecks },
    { label: 'Pending Listings', value: overview.pending, bg: 'bg-gradient-to-br from-purple-500 to-fuchsia-500', icon: TrendingUp },
    { label: 'Active Promotions', value: overview.promotions, bg: 'bg-gradient-to-br from-fuchsia-500 to-violet-500', icon: Zap },
    { label: 'Visits this week', value: overview.visits_week, bg: 'bg-gradient-to-br from-cyan-500 to-blue-500', icon: Activity },
  ];

  const StatBar = ({ value }) => (
    <div className="flex items-end gap-0.5 h-6">
      {[0.4, 0.7, 1, 0.6, 0.8].map((h, i) => (
        <div key={i} className="w-1 bg-slate-300 rounded-sm" style={{ height: `${h * 24}px` }} />
      ))}
    </div>
  );

  const TopList = ({ title, icon: Icon, items, color = 'text-brand' }) => (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {items && items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 truncate max-w-[70%]">{item.name || 'Unknown'}</span>
              <span className="font-medium text-slate-900">{item.count}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">No data recorded yet.</p>
      )}
    </Card>
  );

  const InsightCard = ({ title, value, label, icon: Icon, color = "text-brand" }) => (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">Insight</Badge>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium">{title}</div>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{label}</p>
    </Card>
  );

  return (
    <div data-testid="dashboard-analytics">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold" data-testid="dashboard-greeting">
          Hello, {user?.first_name || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Stats Type Dropdown - Admin Only */}
          {user?.role === 'super_admin' && (
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-44" data-testid="stats-type-filter">
                <SelectValue placeholder="Stats Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sitewide">Sitewide</SelectItem>
                <SelectItem value="account">Account</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Filter by Listing - searchable dropdown */}
          <div className="relative w-56">
            <button
              onClick={() => setShowListingDropdown(!showListingDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white text-sm h-10"
              data-testid="listing-filter"
            >
              <span className="truncate">{selectedListingName}</span>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
            {showListingDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
                <div className="p-2 border-b">
                  <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      placeholder="Search listings..."
                      className="w-full pl-7 pr-2 py-1.5 text-sm border rounded outline-none focus:border-brand"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-48">
                  <button
                    onClick={() => { setSelectedListing('all'); setShowListingDropdown(false); setListingSearch(''); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedListing === 'all' ? 'bg-brand/5 text-brand font-medium' : ''}`}
                  >
                    All Listings
                  </button>
                  {filteredListings.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedListing(l.id); setShowListingDropdown(false); setListingSearch(''); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${selectedListing === l.id ? 'bg-brand/5 text-brand font-medium' : ''}`}
                    >
                      <span>{l.name}</span>
                      <span className="text-xs text-slate-400 ml-1 capitalize">({l.type})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards/Insights */}
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, i) => (
            <div key={i} className={`${card.bg} rounded-2xl p-5 text-white shadow-sm`} data-testid={`overview-card-${i}`}>
              <div className="flex items-start justify-between">
                <p className="text-3xl font-bold">{loading ? '-' : (card.value ?? 0)}</p>
                <card.icon className="h-6 w-6 opacity-70" />
              </div>
              <p className="text-sm mt-2 opacity-90 font-medium">{card.label}</p>
            </div>
          ))}
        </div>

        {listingInsights && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-500">
            <InsightCard 
              title="Engagement Score" 
              value={`${listingInsights.engagement_score}%`} 
              label="Calculated based on average depth of scroll and time spent reading your listing details."
              icon={Zap}
              color="text-amber-500"
            />
            <InsightCard 
              title="Avg. Visit Duration" 
              value={listingInsights.avg_duration} 
              label="The average amount of time a visitor spends exploring your church profile."
              icon={Clock}
              color="text-blue-500"
            />
            <InsightCard 
              title="Content Clarity" 
              value="Excellent" 
              label="Your profile has low 'Bounce Rates', meaning visitors find the information they need."
              icon={Activity}
              color="text-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Main Grid: Left col + Right col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Views */}
          <Card className="p-5" data-testid="views-section">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-brand" />
              </div>
              <h3 className="font-semibold text-sm">Views</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Last 24 hours', value: views.last_24h },
                { label: 'Last 7 days', value: views.last_7d },
                { label: 'Last 30 days', value: views.last_30d },
              ].map((v, i) => (
                <div key={i}>
                  <div className="flex justify-center mb-1"><StatBar value={v.value} /></div>
                  <p className="text-xl font-bold">{loading ? '-' : (v.value ?? 0)}</p>
                  <p className="text-xs text-slate-500">{v.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Unique Views */}
          <Card className="p-5" data-testid="unique-views-section">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-brand" />
              </div>
              <h3 className="font-semibold text-sm">Unique views</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Last 24 hours', value: uniqueViews.last_24h },
                { label: 'Last 7 days', value: uniqueViews.last_7d },
                { label: 'Last 30 days', value: uniqueViews.last_30d },
              ].map((v, i) => (
                <div key={i}>
                  <div className="flex justify-center mb-1"><StatBar value={v.value} /></div>
                  <p className="text-xl font-bold">{loading ? '-' : (v.value ?? 0)}</p>
                  <p className="text-xs text-slate-500">{v.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Button Clicks */}
          <TopList title="Button clicks" icon={MousePointer} items={data?.button_clicks} />

          {/* Devices */}
          <TopList title="Devices" icon={Monitor} items={data?.top_devices} />

          {/* Top Countries */}
          <TopList title="Top Countries" icon={Globe} items={data?.top_countries} />
        </div>

        {/* Right Column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visits Chart */}
          <Card className="p-5" data-testid="visits-chart">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-brand" />
                </div>
                <h3 className="font-semibold text-sm">Visits</h3>
              </div>
              <div className="flex gap-1">
                {[
                  { key: 'last_24h', label: 'Last 24 hours' },
                  { key: 'last_7d', label: 'Last 7 days' },
                  { key: 'last_30d', label: 'Last 30 days' },
                  { key: 'last_6m', label: 'Last 6 months' },
                  { key: 'last_12m', label: 'Last 12 months' },
                ].map(p => (
                  <button
                    key={p.key}
                    onClick={() => setChartPeriod(p.key)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      chartPeriod === p.key
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="views" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} name="Views" />
                    <Area type="monotone" dataKey="unique_views" stroke="#d946ef" fill="#d946ef" fillOpacity={0.1} name="Unique Views" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex justify-center gap-4 mb-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span> Views
                      </span>
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500 inline-block"></span> Unique views
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">No visit data for this period.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Top Referrers */}
          <TopList title="Top Referrers" icon={Globe} items={data?.top_referrers} />

          {/* Top Platforms & Browsers side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TopList title="Top Platforms" icon={Monitor} items={data?.top_platforms} />
            <TopList title="Top Browsers" icon={Globe} items={data?.top_browsers} />
          </div>
        </div>
      </div>
    </div>
  );
};

const MyListings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [viewType, setViewType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    if (!user) return;
    setLoading(true);
    setSelected([]); // Clear selection on refresh
    try {
      const params = { page: 1, limit: 100, status: 'all' };
      if (user.role !== 'super_admin') params.owner_id = user.id;
      const [churchRes, pastorRes] = await Promise.all([
        churchAPI.getAll(params),
        pastorAPI.getAll(params)
      ]);
      const churchesData = churchRes.data?.data || [];
      const pastorsData = pastorRes.data?.data || [];
      setListings([
        ...churchesData.map(c => ({ ...c, type: 'church' })),
        ...pastorsData.map(p => ({ ...p, type: 'pastor' }))
      ]);
    } catch (err) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredAndSortedListings.length) {
      setSelected([]);
    } else {
      setSelected(filteredAndSortedListings.map(l => l.id));
    }
  };

  const handleBulkAction = async (status) => {
    const isTrash = status === 'trash';
    if (isTrash && !window.confirm(`Are you sure you want to move ${selected.length} listings to trash?`)) return;

    setIsBulkProcessing(true);
    let successCount = 0;
    try {
      for (const id of selected) {
        const listing = listings.find(l => l.id === id);
        if (!listing) continue;
        const api = listing.type === 'church' ? churchAPI : pastorAPI;
        await api.update(id, { status });
        successCount++;
      }
      toast.success(`${successCount} listings updated successfully`);
      fetchListings();
    } catch (error) {
      toast.error('Failed to update some listings');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleUpdateStatus = async (type, id, status) => {
    try {
      const api = type === 'church' ? churchAPI : pastorAPI;
      await api.update(id, { status });
      toast.success(`Listing moved to ${status}`);
      fetchListings();
    } catch (error) {
      toast.error('Failed to update listing');
    }
  };

  const handleDelete = async (listing) => {
    const isTrash = listing.status === 'trash';
    const confirmMsg = isTrash 
      ? 'Are you sure you want to PERMANENTLY delete this listing? This action cannot be undone.' 
      : 'Move this listing to Trash? You can recover it later if needed.';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const api = listing.type === 'church' ? churchAPI : pastorAPI;
      if (isTrash) {
        await api.delete(listing.id);
        toast.success('Listing permanently deleted');
      } else {
        await api.update(listing.id, { status: 'trash' });
        toast.success('Listing moved to trash');
      }
      fetchListings();
    } catch (error) {
      toast.error(`Failed to ${isTrash ? 'delete' : 'move to trash'}`);
    }
  };

  const handleSubmit = async (type, id) => {
    try {
      const api = type === 'church' ? churchAPI : pastorAPI;
      await api.submit(id);
      toast.success('Listing submitted for review');
      fetchListings();
    } catch (error) {
      toast.error('Failed to submit listing');
    }
  };

  const filteredAndSortedListings = listings
    .filter(l => {
      // View Type filter
      if (viewType === 'churches' && l.type !== 'church') return false;
      if (viewType === 'pastors' && l.type !== 'pastor') return false;

      // Status filter
      if (filter === 'all') return true;
      if (filter === 'published') return l.status === 'published';
      if (filter === 'pending') return l.status === 'pending_verification';
      if (filter === 'rejected') return l.status === 'rejected';
      if (filter === 'draft') return l.status === 'draft';
      if (filter === 'trash') return l.status === 'trash';
      return true;
    })
    .filter(l => {
      if (!searchQuery) return true;
      const name = l.name?.toLowerCase() || '';
      return name.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'latest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'az') return a.name?.localeCompare(b.name);
      if (sortBy === 'za') return b.name?.localeCompare(a.name);
      return 0;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mb-4"></div>
        <p className="text-slate-500 font-medium tracking-wide">Loading your listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-900/50 rounded-2xl border border-red-500/20 p-8">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load listings</h3>
        <p className="text-slate-400 text-center max-w-md mb-6">{error}</p>
        <button 
          onClick={fetchListings}
          className="px-6 py-2 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <div className="mt-8 p-4 bg-black/40 rounded-lg w-full max-w-lg">
          <p className="text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider">Debug Trace Info:</p>
          <p className="text-xs font-mono text-red-400 break-all text-[10px]">
            URL: {process.env.REACT_APP_BACKEND_URL}/api/churches<br/>
            Check console for "LISTING_TRACE" messages for backend errors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Listings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card 
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${filter === 'published' ? 'border-brand ring-1 ring-brand/20 bg-brand/5' : 'border-slate-100 hover:border-brand/50'}`}
          onClick={() => setFilter(filter === 'published' ? 'all' : 'published')}
        >
          <h3 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Published</h3>
          <p className="text-2xl font-black text-brand">{listings.filter(l => l.status === 'published').length}</p>
        </Card>
        <Card 
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${filter === 'pending' ? 'border-orange-500 ring-1 ring-orange-500/20 bg-orange-50/50' : 'border-slate-100 hover:border-orange-500/50'}`}
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
        >
          <h3 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Pending</h3>
          <p className="text-2xl font-black text-orange-500">{listings.filter(l => l.status === 'pending_verification').length}</p>
        </Card>
        <Card 
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${filter === 'draft' ? 'border-slate-400 ring-1 ring-slate-400/20 bg-slate-50' : 'border-slate-100 hover:border-slate-400/50'}`}
          onClick={() => setFilter(filter === 'draft' ? 'all' : 'draft')}
        >
          <h3 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Draft</h3>
          <p className="text-2xl font-black text-slate-500">{listings.filter(l => l.status === 'draft').length}</p>
        </Card>
        <Card 
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${filter === 'rejected' ? 'border-red-400 ring-1 ring-red-400/20 bg-red-50/30' : 'border-slate-100 hover:border-red-400/50'}`}
          onClick={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
        >
          <h3 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Rejected</h3>
          <p className="text-2xl font-black text-red-400">{listings.filter(l => l.status === 'rejected').length}</p>
        </Card>
        <Card 
          className={`p-5 cursor-pointer transition-all hover:shadow-md ${filter === 'trash' ? 'border-slate-900 ring-1 ring-slate-900/20 bg-slate-900/5' : 'border-slate-100 hover:border-slate-900/50'}`}
          onClick={() => setFilter(filter === 'trash' ? 'all' : 'trash')}
        >
          <h3 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Trash</h3>
          <p className="text-2xl font-black text-slate-900">{listings.filter(l => l.status === 'trash').length}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-3 mr-4">
          <Checkbox 
            checked={selected.length === filteredAndSortedListings.length && filteredAndSortedListings.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select All</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">View:</span>
          <Select value={viewType} onValueChange={setViewType}>
            <SelectTrigger className="w-36 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="churches">Churches</SelectItem>
              <SelectItem value="pastors">Pastors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Listings</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-9 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="az">A-Z</SelectItem>
              <SelectItem value="za">Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[280px]">
          <div className="relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#6c1cff] transition-colors" />
            <Input 
              placeholder="Search churches or pastors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-[#6c1cff] focus:ring-4 focus:ring-purple-100 transition-all text-[14px] font-medium"
            />
          </div>
        </div>
      </div>

      {/* Listings */}
      {filteredAndSortedListings.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedListings.map(listing => {
            const displayImage = listing.type === 'church' ? (listing.logo || listing.cover_image) : listing.profile_picture;
            
            return (
              <Card key={listing.id} className={cn("p-5 hover:shadow-md transition-all border-l-4", selected.includes(listing.id) ? "border-l-brand bg-brand/5" : "border-l-transparent")}>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <Checkbox 
                      checked={selected.includes(listing.id)}
                      onCheckedChange={() => toggleSelect(listing.id)}
                      className="mr-2"
                    />
                    <div className="h-16 w-16 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {displayImage ? (
                        <img src={getImageUrl(displayImage)} alt={listing.name} className="h-full w-full object-cover" />
                      ) : (
                        <img src={getFallbackImage(listing.type)} alt={listing.name} className="h-full w-full object-cover opacity-80" />
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <h3 className="font-bold text-[16px] text-slate-800 truncate">{listing.name || 'Untitled Listing'}</h3>
                        <Badge className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                          listing.status === 'published' ? 'bg-green-500/10 text-green-600 border-green-200' : 
                          listing.status === 'draft' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                          'bg-orange-500/10 text-orange-600 border-orange-200'
                        )} variant="outline">
                          {listing.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border-none">
                          {listing.type}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium">Created: {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm" className="h-9 px-4 text-[#6c1cff] hover:bg-purple-50 font-bold text-xs uppercase tracking-widest">
                      <Link to={`/${listing.type}/${listing.slug || listing.id}`}>
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-9 px-4 border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest hover:border-[#6c1cff] hover:text-[#6c1cff]">
                      <Link to={`/listing/${listing.type}/edit/${listing.id}`}>
                        Edit
                      </Link>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-slate-600">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {(listing.status === 'draft' || listing.status === 'rejected' || listing.status === 'trash') && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(listing.type, listing.id, 'published')} className="gap-2 text-green-600 focus:text-green-600 focus:bg-green-50">
                            <Rocket className="h-4 w-4" />
                            <span className="font-semibold">Publish</span>
                          </DropdownMenuItem>
                        )}
                        {listing.status !== 'draft' && listing.status !== 'trash' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(listing.type, listing.id, 'draft')} className="gap-2">
                            <Undo2 className="h-4 w-4 text-orange-500" />
                            <span>Revert to Draft</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(listing)} className="text-red-600 gap-2 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                          <span>{listing.status === 'trash' ? 'Permanently Delete' : 'Move to Trash'}</span>
                        </DropdownMenuItem>
                        
                        {listing.type === 'church' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="gap-2 text-brand focus:text-brand focus:bg-brand/5">
                              <Link to={`/dashboard/visitors/${listing.id}`} className="flex items-center gap-2 w-full cursor-pointer">
                                <Users className="h-4 w-4" />
                                <span className="font-semibold">Visitor Log</span>
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-16 text-center border-dashed bg-slate-50/50 rounded-3xl">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No listings found</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">You haven't created any {filter !== 'all' ? filter : ''} listings yet. Start by creating your first profile.</p>
          <Button asChild className="h-12 px-8 bg-brand hover:shadow-lg hover:shadow-brand/25 text-white rounded-2xl transition-all font-bold group">
            <Link to="/add-listing">
              Create Listing
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </Card>
      )}
      <BulkActionBar 
        count={selected.length} 
        onAction={handleBulkAction} 
        isProcessing={isBulkProcessing} 
        onClear={() => setSelected([])} 
      />
    </div>
  );
};

const BulkActionBar = ({ count, onAction, isProcessing, onClear }) => {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] animate-in fade-in slide-in-from-bottom-8">
      <Card className="flex items-center gap-6 px-6 py-4 bg-slate-900 border-none shadow-2xl rounded-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
          <span className="bg-brand text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">{count}</span>
          <span className="text-white text-sm font-semibold whitespace-nowrap">Selected</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onAction('published')}
            disabled={isProcessing}
            className="text-green-400 hover:text-green-300 hover:bg-green-400/10 font-bold text-xs uppercase tracking-widest gap-2"
          >
            <Rocket className="h-4 w-4" />
            Publish
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onAction('draft')}
            disabled={isProcessing}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 font-bold text-xs uppercase tracking-widest gap-2"
          >
            <Undo2 className="h-4 w-4" />
            Draft
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onAction('trash')}
            disabled={isProcessing}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-bold text-xs uppercase tracking-widest gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </Button>
        </div>

        <button 
          onClick={onClear}
          className="ml-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </Card>
    </div>
  );
};

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const res = await bookmarkAPI.getAll();
      setBookmarks(res.data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Bookmarks</h1>
      {bookmarks.length > 0 ? (
        <div className="space-y-4">
          {bookmarks.map(bookmark => (
            <Card key={bookmark.bookmark_id} className="p-4">
              <h3 className="font-semibold">{bookmark.listing.name}</h3>
              <p className="text-sm text-slate-600">{bookmark.listing_type}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-slate-600">No bookmarks yet</p>
        </Card>
      )}
    </div>
  );
};

const AccountSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || ''
  });

  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authAPI.updateMe(formData);
      updateUser(res.data);
      toast.success('Account updated successfully!');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to update account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Account Details</h1>
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} disabled />
          </div>
          <Button type="submit" className="bg-brand hover:bg-brand-hover text-white" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

const ClaimRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const is_admin = user?.role === 'super_admin' || user?.role === UserRole.SUPER_ADMIN;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await claimAPI.getAll(); 
      setRequests(res.data || []);
    } catch (err) {
      console.error('Error fetching claim requests:', err);
      setError('Failed to load claim requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this claim? Ownership will be transferred immediately.')) return;
    try {
      setProcessingId(id);
      await adminAPI.approveClaim(id);
      toast.success('Claim approved successfully');
      fetchRequests();
    } catch (error) {
      console.error('Approve failed:', error);
      toast.error('Failed to approve claim');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      setProcessingId(id);
      await adminAPI.rejectClaim(id, reason);
      toast.success('Claim rejected');
      fetchRequests();
    } catch (error) {
      console.error('Reject failed:', error);
      toast.error('Failed to reject claim');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mb-4"></div>
        <p className="text-slate-500 font-medium">Loading claim requests...</p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            {is_admin ? 'Manage Claim Requests' : 'My Claim Requests'}
          </h1>
          <p className="text-slate-500">
            {is_admin 
              ? 'Review and process business ownership transfer requests.' 
              : 'Track the status of your ownership claim requests.'}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchRequests} 
          className="w-full md:w-auto gap-2 border-slate-200"
          disabled={loading}
        >
          <Activity className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {error && (
          <Card className="p-8 text-center bg-red-50/10 border-red-100 mb-6">
            <p className="text-red-500 font-medium">{error}</p>
            <Button variant="link" onClick={fetchRequests} className="text-brand p-0 h-auto mt-2">Try Again</Button>
          </Card>
        )}

        {requests.length === 0 ? (
          <Card className="p-16 text-center border-dashed border-slate-200 bg-slate-50/30">
            <ShieldCheck className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium tracking-wide">No claim requests found.</p>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} className="p-6 overflow-hidden border-slate-100 hover:shadow-md transition-shadow bg-white">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className={cn(
                      "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5",
                      req.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-200' :
                      req.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-200' :
                      'bg-brand/10 text-brand border-brand/20'
                    )} variant="outline">
                      {req.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Submitted on {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {req.listing_name}
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 border-none px-2 uppercase font-black tracking-tighter">
                        {req.listing_type}
                      </Badge>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Claimant: <span className="font-semibold text-slate-700">{req.claimant_name}</span> ({req.claimant_email})</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="block text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-wider">Contact Detail</span>
                      <p className="text-slate-700 font-medium truncate">{req.email}</p>
                      <p className="text-slate-700 font-medium">{req.phone}</p>
                    </div>
                    {req.message && (
                      <div>
                        <span className="block text-slate-400 text-[10px] font-bold uppercase mb-1 tracking-wider">Message</span>
                        <p className="text-slate-700 italic leading-relaxed truncate">"{req.message}"</p>
                      </div>
                    )}
                  </div>

                  {req.proof_documents?.length > 0 && (
                    <div>
                      <span className="block text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Proof of Authority</span>
                      <div className="flex flex-wrap gap-2">
                        {req.proof_documents.map((doc, idx) => (
                          <a 
                            key={idx} 
                            href={getImageUrl(doc)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-brand hover:bg-brand hover:text-white flex items-center gap-2 transition-all shadow-sm"
                          >
                            <FileText className="h-3 w-3" />
                            File {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {req.rejection_reason && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <span className="block text-red-600 text-[10px] font-bold uppercase mb-1">Rejection Reason</span>
                      <p className="text-red-700 text-sm font-medium leading-relaxed">{req.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {is_admin && req.status === 'pending' && (
                  <div className="flex md:flex-col gap-2 shrink-0 md:pt-4">
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white gap-2 px-6 shadow-sm shadow-green-200"
                      onClick={() => handleApprove(req.id)}
                      disabled={processingId === req.id}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2"
                      onClick={() => handleReject(req.id)}
                      disabled={processingId === req.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

const VisitorLog = () => {
  const { churchId } = useParams();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [churchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [churchRes, visitorRes] = await Promise.all([
        churchAPI.getById(churchId),
        visitorAPI.getChurchVisitors(churchId)
      ]);
      setChurch(churchRes.data);
      setVisitors(visitorRes.data);
    } catch (error) {
      console.error('Error fetching visitor log:', error);
      toast.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `${church?.slug || 'church'}-check-in-qr.png`;
    link.href = url;
    link.click();
  };

  const exportCSV = () => {
    if (visitors.length === 0) return;
    const headers = ['Name', 'Phone', 'Location', 'Email', 'Pastor Request', 'Date'];
    const rows = visitors.map(v => [
      v.name,
      v.phone,
      v.location || '',
      v.email || '',
      v.pastor_request ? 'Yes' : 'No',
      new Date(v.timestamp).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visitors-${church?.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  const checkInUrl = `${window.location.origin}/church/${church?.slug}/connect`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/my-listings')} className="h-10 w-10 p-0 rounded-full">
            <Undo2 className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Visitor Log</h1>
            <p className="text-slate-500 font-medium">{church?.name}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={exportCSV} variant="outline" className="h-11 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest gap-2">
            <FileText className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={downloadQR} className="h-11 rounded-xl bg-brand text-white font-bold text-xs uppercase tracking-widest gap-2 shadow-lg shadow-brand/20">
            <Rocket className="h-4 w-4" />
            Download QR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* QR Section */}
        <Card className="p-8 text-center bg-slate-50 border-dashed border-slate-200">
          <div className="bg-white p-6 rounded-3xl inline-block shadow-xl mb-6">
            <QRCodeCanvas 
              id="qr-canvas"
              value={checkInUrl}
              size={200}
              level={"H"}
              includeMargin={true}
            />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Check-in QR Code</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            Display this QR code in your church. Visitors can scan it to connect with you.
          </p>
          <div className="p-3 bg-white rounded-xl border border-slate-100 text-[10px] font-mono text-slate-400 break-all">
            {checkInUrl}
          </div>
        </Card>

        {/* Visitors Table */}
        <div className="lg:col-span-2">
          {visitors.length > 0 ? (
            <Card className="overflow-hidden border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visitor</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pastor Call?</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visitors.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{v.name}</div>
                          <div className="text-xs text-slate-400">{v.location || 'No location'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-600">{v.phone}</div>
                          <div className="text-[11px] text-slate-400">{v.email || 'No email'}</div>
                        </td>
                        <td className="px-6 py-4">
                          {v.pastor_request ? (
                            <Badge className="bg-orange-500/10 text-orange-600 border-orange-100">Yes, Please</Badge>
                          ) : (
                            <span className="text-xs text-slate-300 italic font-medium">No</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          {new Date(v.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-20 text-center border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-200" />
              </div>
              <h3 className="font-bold text-slate-800">No visitors yet</h3>
              <p className="text-sm text-slate-400">Share your QR code to start collecting visitor info.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="my-listings" element={<MyListings />} />
        <Route path="visitors/:churchId" element={<VisitorLog />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="claim-requests" element={<ClaimRequests />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardPage;