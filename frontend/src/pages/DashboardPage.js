import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
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
  Pencil,
  FileText, 
  Undo2,
  Rocket,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Plus,
  ChevronRight,
  X,
  MessageSquare,
  Mail,
  MapPin,
  Share2,
  Phone
} from 'lucide-react';
import { authAPI, churchAPI, pastorAPI, bookmarkAPI, analyticsAPI, adminAPI, claimAPI, visitorAPI, messageAPI } from '../lib/api';
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
                  to="/dashboard/messages" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/messages' || location.pathname.startsWith('/dashboard/messages/')
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Contact Messages
                </Link>
                <Link 
                  to="/dashboard/visitors" 
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl transition-colors text-sm",
                    location.pathname === '/dashboard/visitors' || location.pathname.startsWith('/dashboard/visitors/')
                      ? "text-brand bg-brand/5 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Visitor Log
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
                            <DropdownMenuItem asChild className="gap-2 text-brand focus:text-brand focus:bg-brand/5">
                              <Link to={`/dashboard/messages/${listing.id}`} className="flex items-center gap-2 w-full cursor-pointer">
                                <MessageSquare className="h-4 w-4" />
                                <span className="font-semibold">Contact Messages</span>
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [church, setChurch] = useState(null);
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit / Delete modal states
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [deletingVisitor, setDeletingVisitor] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', location: '', email: '' });

  useEffect(() => {
    fetchData();
  }, [churchId, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch user's churches
      const params = { page: 1, limit: 100, status: 'all' };
      if (user.role !== 'super_admin') params.owner_id = user.id;
      const churchRes = await churchAPI.getAll(params);
      const churchesData = churchRes.data?.data || [];
      setChurches(churchesData);

      // 2. Fetch visitor records if specific churchId is set
      if (churchId) {
        const [churchResSingle, visitorRes] = await Promise.all([
          churchAPI.getById(churchId),
          visitorAPI.getChurchVisitors(churchId)
        ]);
        setChurch(churchResSingle.data);
        setVisitors(visitorRes.data);
      }
    } catch (error) {
      console.error('Error fetching visitor log:', error);
      toast.error('Failed to load visitor logs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (v) => {
    setEditingVisitor(v);
    setEditForm({
      name: v.name || '',
      phone: v.phone || '',
      location: v.location || '',
      email: v.email || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.phone) {
      toast.error("Name and Phone number are required");
      return;
    }

    const cleanPhone = editForm.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[0-9]{8,15}$/.test(cleanPhone)) {
      toast.error("Please enter a valid phone number (8 to 15 digits)");
      return;
    }

    try {
      await visitorAPI.update(editingVisitor.id, editForm);
      toast.success("Visitor details updated successfully");
      setEditingVisitor(null);
      fetchData();
    } catch (err) {
      console.error("Error updating visitor:", err);
      toast.error("Failed to update visitor details");
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      await visitorAPI.delete(deletingVisitor.id);
      toast.success("Visitor record deleted successfully");
      setDeletingVisitor(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting visitor:", err);
      toast.error("Failed to delete visitor record");
    }
  };

  const downloadQR = () => {
    const qrCanvas = document.getElementById('qr-canvas');
    if (!qrCanvas) return;

    // Create a high-res flyer canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    // Ensure roundRect is supported (compatibility fallback)
    if (!ctx.roundRect) {
      ctx.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') {
          r = { tl: r, tr: r, br: r, bl: r };
        } else {
          const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
          r = { ...defaultRadius, ...r };
        }
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
      };
    }

    // Load logo
    const logoImg = new Image();
    logoImg.src = '/logo.png';

    const renderAndDownload = () => {
      // 1. Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 800, 1100);

      // 2. Outer Gradient Border
      const borderGrad = ctx.createLinearGradient(0, 0, 800, 1100);
      borderGrad.addColorStop(0, '#6c1cff');
      borderGrad.addColorStop(1, '#4f10c5');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, 800 - 24, 1100 - 24);

      // 3. Header Band
      const headerGrad = ctx.createLinearGradient(12, 12, 800 - 12, 240);
      headerGrad.addColorStop(0, '#6c1cff');
      headerGrad.addColorStop(1, '#5b12df');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(12, 12, 800 - 24, 220);

      // 4. Draw Header Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Welcome/Tagline
      ctx.fillStyle = '#e0d4ff';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('W E L C O M E   T O', 400, 50);

      // Church Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Segoe UI", sans-serif';
      
      const churchName = church?.name || 'Our Church';
      
      // Word wrap helper
      const wrapText = (text, maxWidth) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line.trim());
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line.trim());
        return lines;
      };

      const nameLines = wrapText(churchName, 680);
      if (nameLines.length === 1) {
        ctx.fillText(nameLines[0], 400, 105);
      } else {
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.fillText(nameLines[0], 400, 90);
        ctx.fillText(nameLines[1], 400, 135);
      }

      // Check-in Badge/Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      const badgeY = nameLines.length === 1 ? 160 : 180;
      ctx.beginPath();
      ctx.roundRect(400 - 150, badgeY - 18, 300, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillText('SCAN HERE TO CONNECT', 400, badgeY);

      // 5. Draw QR Code Card (White Container)
      const cardX = 150;
      const cardY = 270;
      const cardW = 500;
      const cardH = 560;

      // Draw subtle shadow for the card
      ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 32);
      ctx.fill();

      // Reset shadow for other drawings
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Draw subtle card border
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Card Title / Call to Action
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.fillText('Visitor Check-in', 400, cardY + 50);

      // Instruction subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = '500 15px "Segoe UI", sans-serif';
      ctx.fillText('Point your camera at the QR code below', 400, cardY + 80);

      // Draw the QR Code image inside the card
      const qrSize = 360;
      const qrX = 400 - qrSize / 2;
      const qrY = cardY + 120;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Under QR helper text
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 14px "Segoe UI", sans-serif';
      ctx.fillText('Thank you for connecting with us today!', 400, cardY + qrSize + 155);

      // 6. Draw Footer Branding
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.fillText('POWERED BY', 400, 970);

      // Draw Logo or Fallback Text
      const drawLogoFallback = () => {
        ctx.fillStyle = '#4f10c5';
        ctx.font = 'black 22px "Segoe UI", sans-serif';
        ctx.fillText('C H U R C H   N A V I G A T O R', 400, 1005);
      };

      try {
        if (logoImg.complete && logoImg.naturalWidth !== 0) {
          const logoW = 200;
          const logoH = (logoImg.height / logoImg.width) * logoW;
          const logoX = 400 - logoW / 2;
          const logoY = 990;
          ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
        } else {
          drawLogoFallback();
        }
      } catch (e) {
        drawLogoFallback();
      }

      // 7. Trigger download
      const url = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `${church?.slug || 'church'}-check-in-poster.png`;
      link.href = url;
      link.click();
    };

    logoImg.onload = renderAndDownload;
    logoImg.onerror = () => {
      renderAndDownload();
    };

    // If logo was already cached, trigger manually
    if (logoImg.complete) {
      renderAndDownload();
    }
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `${church?.name} Connection Page`,
        text: `Connect and check-in with ${church?.name}`,
        url: checkInUrl,
      })
      .then(() => toast.success("Shared successfully!"))
      .catch((err) => {
        console.log(err);
        navigator.clipboard.writeText(checkInUrl);
        toast.success("Check-in link copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(checkInUrl);
      toast.success("Check-in link copied to clipboard!");
    }
  };

  const exportCSV = () => {
    if (visitors.length === 0) return;
    const headers = ['Name', 'Phone', 'Location', 'Email', 'Date'];
    const rows = visitors.map(v => [
      v.name,
      v.phone,
      v.location || '',
      v.email || '',
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

  // Render selection dashboard when no churchId is active
  if (!churchId) {
    return (
      <div className="space-y-6">
        <div className="text-left">
          <h1 className="text-3xl font-bold">Visitor Logs</h1>
          <p className="text-slate-500 font-medium">Select a church listing to view visitor check-ins, download posters, and export data.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {churches.length > 0 ? (
            churches.map((c) => (
              <Card 
                key={c.id} 
                className="p-5 hover:shadow-md transition-all cursor-pointer border border-slate-100 flex items-center justify-between group"
                onClick={() => navigate(`/dashboard/visitors/${c.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl border border-slate-100 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                    {c.logo ? (
                      <img src={getImageUrl(c.logo)} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getFallbackImage('church')} alt={c.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800 group-hover:text-brand transition-colors text-base leading-snug">{c.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {c.address_line1 || [c.city, c.state].filter(Boolean).join(', ') || 'No address specified'}
                      </span>
                    </p>
                  </div>
                </div>
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-full group-hover:bg-brand/5 group-hover:text-brand transition-colors shrink-0">
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Card>
            ))
          ) : (
            <Card className="p-20 text-center border-dashed border-slate-200 col-span-2">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-200" />
              </div>
              <h3 className="font-bold text-slate-800">No listings yet</h3>
              <p className="text-sm text-slate-400">You need to add a church listing before you can collect visitor check-ins.</p>
              <Button asChild className="mt-4 bg-brand text-white rounded-xl">
                <Link to="/add-listing">Add Church Listing</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  }

  const checkInUrl = `${window.location.origin}/church/${church?.slug}/connect`;

  return (
    <div className="space-y-6">
      
      {/* Hidden QR Code Canvas to support off-screen high-res flyer poster downloads */}
      <div className="hidden">
        <QRCodeCanvas 
          id="qr-canvas"
          value={checkInUrl}
          size={200}
          level={"H"}
          includeMargin={true}
        />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard/visitors')} className="h-10 w-10 p-0 rounded-full">
            <Undo2 className="h-5 w-5" />
          </Button>
          <div className="text-left">
            <h1 className="text-3xl font-bold">Visitor Log</h1>
            <p className="text-slate-500 font-medium">{church?.name}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={exportCSV} variant="outline" className="h-11 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest gap-2">
            <FileText className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={downloadQR} className="h-11 rounded-xl bg-brand text-white font-bold text-xs uppercase tracking-widest gap-2 shadow-lg shadow-brand/25">
            <Rocket className="h-4 w-4" />
            Download QR
          </Button>
          <Button onClick={shareLink} variant="outline" className="h-11 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest gap-2">
            <Share2 className="h-4 w-4" />
            Share Link
          </Button>
        </div>
      </div>

      {/* Visitors Details Table (Full Page width) */}
      <div className="w-full text-left">
          {visitors.length > 0 ? (
            <Card className="overflow-hidden border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visitors.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {v.name}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                          {v.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {v.location || <span className="text-slate-300 italic">None</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {v.email || <span className="text-slate-300 italic">None</span>}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                          {new Date(v.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              onClick={() => handleEditClick(v)} 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-brand/5 hover:text-brand text-slate-400 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              onClick={() => setDeletingVisitor(v)} 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Edit Visitor Modal */}
      {editingVisitor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Edit Visitor Details</h3>
              <Button 
                variant="ghost" 
                onClick={() => setEditingVisitor(null)} 
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitor-name" className="text-xs font-bold uppercase tracking-wider text-slate-400">Full Name</Label>
                <Input 
                  id="visitor-name" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                  className="rounded-xl border-slate-200 focus:ring-brand focus:border-brand"
                  placeholder="Visitor Name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-phone" className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</Label>
                <Input 
                  id="visitor-phone" 
                  value={editForm.phone} 
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} 
                  className="rounded-xl border-slate-200 focus:ring-brand focus:border-brand"
                  placeholder="Phone"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-location" className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</Label>
                <Input 
                  id="visitor-location" 
                  value={editForm.location} 
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} 
                  className="rounded-xl border-slate-200 focus:ring-brand focus:border-brand"
                  placeholder="Location (e.g. City or State)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-email" className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</Label>
                <Input 
                  id="visitor-email" 
                  type="email"
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                  className="rounded-xl border-slate-200 focus:ring-brand focus:border-brand"
                  placeholder="Email"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingVisitor(null)} 
                  className="w-full h-11 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest text-slate-600"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-xl bg-brand text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-brand/25"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVisitor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 text-left animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Visitor Entry</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-800">{deletingVisitor.name}</strong>'s check-in log entry? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => setDeletingVisitor(null)} 
                variant="outline" 
                className="w-full h-11 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest text-slate-600"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteSubmit} 
                className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/20"
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
      </div>
  );
};

const Messages = () => {
  const { churchId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [churches, setChurches] = useState([]);
  const [pastors, setPastors] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'church:ID', 'pastor:ID'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [churchId, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch user's churches & pastors
      const params = { page: 1, limit: 100, status: 'all' };
      if (user.role !== 'super_admin') params.owner_id = user.id;
      
      const [churchRes, pastorRes] = await Promise.all([
        churchAPI.getAll(params),
        pastorAPI.getAll(params)
      ]);
      const churchesData = churchRes.data?.data || [];
      const pastorsData = pastorRes.data?.data || [];
      setChurches(churchesData);
      setPastors(pastorsData);

      // 2. Fetch messages for all churches
      const churchMsgPromises = churchesData.map(c => 
        messageAPI.getChurchMessages(c.id)
          .then(res => res.data.map(m => ({ 
            ...m, 
            listingName: c.name, 
            listingType: 'church',
            listingSlug: c.slug, 
            listingId: c.id,
            listingLogo: c.logo || c.cover_image || ''
          })))
          .catch(() => [])
      );

      // 3. Fetch messages for all pastors
      const pastorMsgPromises = pastorsData.map(p => 
        messageAPI.getPastorMessages(p.id)
          .then(res => res.data.map(m => ({ 
            ...m, 
            listingName: p.name, 
            listingType: 'pastor',
            listingSlug: p.slug, 
            listingId: p.id,
            listingLogo: p.profile_picture || p.cover_image || ''
          })))
          .catch(() => [])
      );

      const [churchMsgResults, pastorMsgResults] = await Promise.all([
        Promise.all(churchMsgPromises),
        Promise.all(pastorMsgPromises)
      ]);

      const allMessages = [
        ...churchMsgResults.flat(),
        ...pastorMsgResults.flat()
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setMessages(allMessages);
      
      if (churchId) {
        setSelectedFilter(`church:${churchId}`);
      } else {
        setSelectedFilter('all');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (value) => {
    setSelectedFilter(value);
    if (value === 'all') {
      navigate('/dashboard/messages');
    } else {
      const [type, id] = value.split(':');
      if (type === 'church') {
        navigate(`/dashboard/messages/${id}`);
      } else {
        navigate('/dashboard/messages'); // Fallback to avoid breaking church-only router paths
      }
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-400 font-medium animate-pulse">Loading messages...</div>;

  const filteredMessages = messages.filter(msg => {
    if (selectedFilter === 'all') return true;
    const [type, id] = selectedFilter.split(':');
    return msg.listingType === type && msg.listingId === id;
  });

  const getActiveFilterLabel = () => {
    if (selectedFilter === 'all') return 'Inbox for all your listings';
    const [type, id] = selectedFilter.split(':');
    if (type === 'church') {
      return churches.find(c => c.id === id)?.name || 'Filtered Church Listing';
    }
    return pastors.find(p => p.id === id)?.name || 'Filtered Pastor Listing';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {selectedFilter !== 'all' && (
            <Button variant="ghost" onClick={() => handleFilterChange('all')} className="h-10 w-10 p-0 rounded-full">
              <Undo2 className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Contact Messages</h1>
            <p className="text-slate-500 font-medium">
              {getActiveFilterLabel()}
            </p>
          </div>
        </div>

        {/* Unified Filter Dropdown for Churches and Pastors */}
        {(churches.length > 0 || pastors.length > 0) && (
          <div className="w-72">
            <Select value={selectedFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full h-11 rounded-xl focus:ring-brand focus:border-brand border-slate-200 bg-white">
                <SelectValue placeholder="Filter by Listing" />
              </SelectTrigger>
              <SelectContent className="max-h-80 overflow-y-auto">
                <SelectItem value="all" className="font-semibold text-slate-800">
                  All Listings ({churches.length + pastors.length})
                </SelectItem>
                
                {churches.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-md my-1 select-none">
                      Churches ({churches.length})
                    </div>
                    {churches.map(c => (
                      <SelectItem key={c.id} value={`church:${c.id}`}>{c.name}</SelectItem>
                    ))}
                  </>
                )}

                {pastors.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-md my-1 select-none">
                      Pastors ({pastors.length})
                    </div>
                    {pastors.map(p => (
                      <SelectItem key={p.id} value={`pastor:${p.id}`}>{p.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((msg, i) => (
            <Card key={i} className="p-6 hover:shadow-lg transition-all duration-300 border border-slate-100 rounded-2xl bg-white relative overflow-hidden group">
              {/* Subtle top indicator bar */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${msg.listingType === 'pastor' ? 'bg-[#6c1cff]/80' : 'bg-brand/85'}`} />
              
              <div className="flex flex-col md:flex-row gap-5">
                {/* Left Side: Avatar/Logo of the related Church or Pastor */}
                <div className="shrink-0 flex md:flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 flex items-center justify-center font-bold text-xl shadow-inner transition-transform group-hover:scale-105 duration-300 ${
                    msg.listingType === 'pastor' ? 'border-[#6c1cff]/10 bg-[#6c1cff]/5' : 'border-brand/10 bg-brand/5'
                  }`}>
                    {msg.listingLogo ? (
                      <img 
                        src={getImageUrl(msg.listingLogo)} 
                        alt={msg.listingName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {/* Fallback Letter if image fails or not present */}
                    {!msg.listingLogo ? (
                      <span className={msg.listingType === 'pastor' ? 'text-[#6c1cff]' : 'text-brand'}>
                        {msg.listingName.charAt(0).toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  
                  {/* Category Type Indicator */}
                  <Badge className={`text-[9px] font-bold uppercase px-2 py-0.5 border-none select-none tracking-wider ${
                    msg.listingType === 'pastor' 
                      ? 'bg-[#6c1cff]/10 text-[#6c1cff] hover:bg-[#6c1cff]/20' 
                      : 'bg-brand/10 text-brand hover:bg-brand/20'
                  }`}>
                    {msg.listingType === 'pastor' ? 'Pastor' : 'Church'}
                  </Badge>
                </div>

                {/* Right Side: Message Details */}
                <div className="flex-1 space-y-4">
                  {/* Sender Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">{msg.name}</h3>
                        <span className="text-xs text-slate-400 font-medium">to</span>
                        <span className={`text-xs font-semibold hover:underline ${
                          msg.listingType === 'pastor' ? 'text-[#6c1cff]' : 'text-brand'
                        }`}>
                          <Link to={msg.listingType === 'pastor' ? `/pastor/${msg.listingSlug}` : `/church/${msg.listingSlug}`}>
                            {msg.listingName}
                          </Link>
                        </span>
                      </div>
                      
                      {/* Sender contact badges */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <a 
                          href={`mailto:${msg.email}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-500 hover:text-brand hover:border-brand/20 transition-all"
                        >
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {msg.email}
                        </a>
                        {msg.phone && (
                          <a 
                            href={`tel:${msg.phone}`} 
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-500 hover:text-[#6c1cff] hover:border-[#6c1cff]/20 transition-all"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {msg.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50 self-start sm:self-center">
                      {new Date(msg.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Message Body Container */}
                  <div className={`pl-4 py-1 text-sm text-slate-600 leading-relaxed font-normal border-l-2 bg-slate-50/20 rounded-r-xl ${
                    msg.listingType === 'pastor' ? 'border-[#6c1cff]' : 'border-brand'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 flex flex-wrap gap-2.5 justify-end">
                    <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50 font-bold px-4">
                      <a href={`mailto:${msg.email}`}>
                        <Mail className="h-3.5 w-3.5 text-slate-500" />
                        Reply Email
                      </a>
                    </Button>
                    {msg.phone && (
                      <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50 font-bold px-4">
                        <a href={`tel:${msg.phone}`}>
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          Call Phone
                        </a>
                      </Button>
                    )}
                    {msg.listingSlug && (
                      <Button asChild variant="ghost" size="sm" className={`h-9 text-xs gap-1.5 rounded-xl font-bold px-4 ${
                        msg.listingType === 'pastor' ? 'text-[#6c1cff] hover:bg-[#6c1cff]/5' : 'text-brand hover:bg-brand/5'
                      }`}>
                        <Link to={msg.listingType === 'pastor' ? `/pastor/${msg.listingSlug}` : `/church/${msg.listingSlug}`}>
                          View Listing
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-20 text-center border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-slate-200" />
            </div>
            <h3 className="font-bold text-slate-800">No messages yet</h3>
            <p className="text-sm text-slate-400">
              {churches.length === 0 && pastors.length === 0
                ? "You don't have any church or pastor listings to receive messages. Create a listing to get started!"
                : "Messages sent through your church or pastor profile contact form will appear here."}
            </p>
            {churches.length === 0 && pastors.length === 0 && (
              <Button asChild className="mt-4 bg-brand text-white rounded-xl">
                <Link to="/add-listing">Add Listing</Link>
              </Button>
            )}
          </Card>
        )}
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
        <Route path="visitors" element={<VisitorLog />} />
        <Route path="visitors/:churchId" element={<VisitorLog />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:churchId" element={<Messages />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="account" element={<AccountSettings />} />
        <Route path="claim-requests" element={<ClaimRequests />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardPage;