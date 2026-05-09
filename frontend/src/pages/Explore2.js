import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Search, MapPin, X, Map as MapIcon, Filter, ChevronDown, 
  ArrowUp, Church, Users, Globe, Shield, Heart,
  Zap, Calendar, Star, Navigation, Plus, List, Check
} from 'lucide-react';
import { NavbarPremium } from '../components/NavbarPremium';
import { CitySelect } from '../components/CitySelect';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Checkbox } from '../components/ui/checkbox';
import { churchAPI, pastorAPI, taxonomyAPI } from '../lib/api';
import { toast } from 'sonner';
import { ChurchCard } from '../components/ChurchCard';
import { PastorCard } from '../components/PastorCard';
import { Slider } from '../components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import MapboxExploreMap from '../components/MapboxExploreMap';

const FilterMultiSelect = ({ icon: Icon, label, options, selected, onUpdate, placeholder }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full border-b border-slate-200 py-4 text-sm font-medium text-slate-500 hover:border-brand transition-colors outline-none text-left">
          <Icon className="h-5 w-5 text-slate-400" />
          <div className="flex-1 flex flex-wrap gap-1 items-center overflow-hidden">
            {selected.length === 0 ? (
              <span className="text-slate-400">{placeholder}</span>
            ) : (
              <>
                <span className="text-slate-900">{label}: {selected.length}</span>
                <div className="flex flex-wrap gap-1">
                  {selected.slice(0, 1).map(s => (
                    <Badge key={s} variant="secondary" className="text-[9px] h-4 px-1 bg-slate-100 text-slate-600 border-none">{s}</Badge>
                  ))}
                  {selected.length > 1 && <span className="text-[10px] text-slate-400">+{selected.length - 1}</span>}
                </div>
              </>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 rounded-2xl shadow-2xl border-slate-100 z-[150]" align="start">
        <div className="p-2 border-b border-slate-50 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">{label}</span>
          {selected.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdate([]); }}
              className="text-[10px] font-bold text-brand hover:underline"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          {(options || []).map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <div 
                key={opt}
                className="flex items-center space-x-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newSelected = isSelected 
                    ? selected.filter(s => s !== opt)
                    : [...selected, opt];
                  onUpdate(newSelected);
                }}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => {}} // Handled by div onClick
                  className="rounded-md border-slate-200 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                />
                <span className={`text-sm ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>{opt}</span>
              </div>
            );
          })}
        </div>
        <div className="p-2 border-t border-slate-50 bg-slate-50/30 rounded-b-2xl">
          <Button 
            onClick={() => setOpen(false)}
            className="w-full bg-brand hover:bg-brand/90 text-white rounded-xl h-9 text-xs font-bold uppercase tracking-wider shadow-md"
          >
            Apply Selection
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default function Explore2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeType, setActiveType] = useState(searchParams.get('type') || 'church');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [taxonomies, setTaxonomies] = useState({});

  // Filters
  const [viewport, setViewport] = useState({
    latitude: 20,
    longitude: 0,
    zoom: 2 // Wide World View initially
  });
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || searchParams.get('q') || '',
    location: searchParams.get('location') || searchParams.get('city') || '',
    denomination: searchParams.get('denomination') ? [searchParams.get('denomination')] : [],
    language: [],
    worshipStyle: [],
    ministry: [],
    qualification: '',
    designation: '',
    experience: 0,
    openNow: searchParams.get('open_now') === 'true' || searchParams.get('openNow') === 'true',
    useCustomTime: false,
    customDate: new Date().toISOString().split('T')[0], // Default to today's date
    startTime: '14:00',
    endTime: '15:00',
    orderBy: 'a-z',
    userCoords: null
  });
  const [mapBounds, setMapBounds] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'map'
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchTaxonomies();
    // Only detect location if no coordinates were passed in URL
    if (!searchParams.get('lat') && !searchParams.get('latitude')) {
      detectLocation();
    }
  }, []);

  const detectLocation = () => {
    // Only detect if location is not already set via search params
    if (filters.location || filters.userCoords) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFilters(prev => ({ 
            ...prev, 
            userCoords: { lat: latitude, lng: longitude },
            location: 'Current Location',
            orderBy: 'a-z'
          }));
          toast.success("Location detected!");
        },
        (error) => {
          console.warn("Geolocation failed or denied, staying in Global view:", error.message);
          // Default to Global if denied or failed
          setFilters(prev => ({ 
            ...prev, 
            location: 'Global',
            userCoords: null,
            orderBy: 'a-z' 
          }));
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
       // Fallback to Global if geolocation not supported
       setFilters(prev => ({ 
          ...prev, 
          location: 'Global',
          userCoords: null
       }));
    }
  };

  // Consolidated search effect with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 400);

    return () => clearTimeout(timer);
  }, [activeType, filters, mapBounds]);

  const fetchTaxonomies = async () => {
    try {
      const res = await taxonomyAPI.getAll();
      setTaxonomies(res.data);
    } catch (error) {
      console.error('Error fetching taxonomies:', error);
    }
  };

  const getDayName = (dateStr) => {
     if (!dateStr) return undefined;
     const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
     const d = new Date(dateStr);
     return days[d.getDay()];
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      let params = {
        search: filters.search || undefined,
        denomination: filters.denomination.length > 0 ? filters.denomination : undefined,
        language: filters.language.length > 0 ? filters.language : undefined,
        order_by: filters.orderBy,
        skip: 0,
        limit: 100, // Increased limit for better map experience
        min_lat: mapBounds?.minLat,
        max_lat: mapBounds?.maxLat,
        min_lng: mapBounds?.minLng,
        max_lng: mapBounds?.maxLng,
        open_now: filters.openNow || undefined,
        start_time: filters.useCustomTime ? filters.startTime : undefined,
        end_time: filters.useCustomTime ? filters.endTime : undefined,
        day: filters.useCustomTime ? getDayName(filters.customDate) : undefined
      };

      if (activeType === 'pastor') {
        params = {
            ...params,
            qualification: filters.qualification || undefined,
            designation: filters.designation || undefined,
            min_experience: filters.experience > 0 ? filters.experience : undefined
        };
      } else {
        params = {
            ...params,
            worship_style: filters.worshipStyle.length > 0 ? filters.worshipStyle : undefined,
            ministry: filters.ministry.length > 0 ? filters.ministry : undefined
        };
      }

      const res = activeType === 'church' 
        ? await churchAPI.getAll(params)
        : await pastorAPI.getAll(params);
      
      setResults(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      location: '',
      denomination: [],
      language: [],
      worshipStyle: [],
      ministry: [],
      qualification: '',
      designation: '',
      experience: 0,
      openNow: false,
      useCustomTime: false,
      customDate: new Date().toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '15:00',
      orderBy: 'a-z',
      userCoords: filters.userCoords // Keep user coordinates if detected
    });
  };

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: '' }));
  };

  const showAllGlobally = () => {
    resetFilters();
    setMapBounds(null);
    setViewport({
      latitude: 20,
      longitude: 0,
      zoom: 2
    });
    toast.info(`Showing all ${activeType === 'church' ? 'churches' : 'pastors'} globally`);
  };

  const renderFilters = () => (
    <div className="space-y-4">
      {/* 1. Search (Universal) */}
      <div className="relative group">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
        <Input 
          placeholder={activeType === 'church' ? "Church name..." : "Pastor name..."} 
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="pl-8 border-0 border-b border-slate-200 bg-transparent rounded-none h-14 text-sm font-medium text-slate-500 focus-visible:ring-0 focus-visible:border-brand transition-all placeholder:text-slate-400" 
        />
      </div>

      {/* 2. Location (Universal) */}
      <div className="relative group flex items-center gap-2">
        <div className="relative flex-1">
          <CitySelect 
            placeholder="Search City or Pincode" 
            value={filters.location}
            onChange={(cityName, cityData) => {
              setFilters(prev => ({
                ...prev, 
                location: cityName,
                userCoords: cityData ? { lat: cityData.lat, lng: cityData.lng } : null
              }));
              
              if (cityData) {
                // Manually trigger map move for city selection
                setViewport({
                  latitude: cityData.lat,
                  longitude: cityData.lng,
                  zoom: 12,
                  transitionDuration: 1000
                });
              }
            }}
          />
        </div>
      </div>

      {/* 3. Opening Status (Church Only) */}
      {activeType === 'church' && (
        <div className="space-y-4">
          <label className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-2 block">Opening Status</label>
          <div className="p-1 rounded-xl border border-slate-100 flex shadow-sm bg-white">
            <button 
              onClick={() => setFilters({...filters, openNow: false, useCustomTime: false})}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-wider ${!filters.openNow && !filters.useCustomTime ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilters({...filters, openNow: true, useCustomTime: false})}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-wider ${filters.openNow && !filters.useCustomTime ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Open Now
            </button>
            <button 
              onClick={() => setFilters({...filters, openNow: false, useCustomTime: true})}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-wider ${filters.useCustomTime ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Custom
            </button>
          </div>

          {filters.useCustomTime && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Date</label>
                <input 
                  type="date" 
                  value={filters.customDate}
                  onChange={(e) => setFilters({...filters, customDate: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-100 text-xs font-medium outline-none focus:border-brand bg-slate-50/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                   <input 
                     type="time" 
                     value={filters.startTime}
                     onChange={(e) => setFilters({...filters, startTime: e.target.value})}
                     className="w-full px-2 py-2 rounded-lg border border-slate-100 text-xs font-medium outline-none focus:border-brand bg-slate-50/50"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                   <input 
                     type="time" 
                     value={filters.endTime}
                     onChange={(e) => setFilters({...filters, endTime: e.target.value})}
                     className="w-full px-2 py-2 rounded-lg border border-slate-100 text-xs font-medium outline-none focus:border-brand bg-slate-50/50"
                   />
                 </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Denomination */}
      <FilterMultiSelect 
        icon={Filter}
        label="Denomination"
        placeholder="All Denominations"
        options={taxonomies.denomination || []}
        selected={filters.denomination}
        onUpdate={(v) => setFilters({ ...filters, denomination: v })}
      />

      {/* Languages */}
      <FilterMultiSelect 
        icon={Globe}
        label="Languages"
        placeholder="All Languages"
        options={taxonomies.language || taxonomies.languages_known || []}
        selected={filters.language}
        onUpdate={(v) => setFilters({ ...filters, language: v })}
      />

      {/* CHURCH SPECIFIC FILTERS */}
      {activeType === 'church' && (
        <>
          <FilterMultiSelect 
            icon={Zap}
            label="Worship Styles"
            placeholder="All Worship Styles"
            options={taxonomies.worship_style || []}
            selected={filters.worshipStyle}
            onUpdate={(v) => setFilters({ ...filters, worshipStyle: v })}
          />
          <FilterMultiSelect 
            icon={Heart}
            label="Ministries"
            placeholder="All Ministries"
            options={taxonomies.ministry || []}
            selected={filters.ministry}
            onUpdate={(v) => setFilters({ ...filters, ministry: v })}
          />
        </>
      )}

      {/* PASTOR SPECIFIC FILTERS */}
      {activeType === 'pastor' && (
        <>
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Experience</label>
              <div className="flex items-center gap-1">
                <Input 
                  type="number" 
                  min="0" max="50"
                  value={filters.experience}
                  onChange={(e) => setFilters({...filters, experience: Math.min(50, Math.max(0, parseInt(e.target.value) || 0))})}
                  className="w-[52px] h-7 px-2 border border-slate-200 rounded-lg bg-slate-50/50 text-right text-sm font-bold text-brand focus-visible:ring-1 focus-visible:ring-brand" 
                />
                <span className="text-xs font-bold text-brand">Years</span>
              </div>
            </div>
            <Slider
              value={[filters.experience]}
              max={50}
              step={1}
              onValueChange={(v) => setFilters({...filters, experience: v[0]})}
              className="py-2"
            />
          </div>

          <div className="relative">
            <Select
              value={filters.qualification || 'all'}
              onValueChange={(v) => setFilters({ ...filters, qualification: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="border-0 border-b border-slate-200 rounded-none bg-transparent h-14 px-0 focus:ring-0 focus:border-brand shadow-none text-sm font-medium text-slate-500">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <SelectValue placeholder="Qualification" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl z-[150]">
                <SelectItem value="all">Qualification</SelectItem>
                {(taxonomies.qualification || []).map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Select
              value={filters.designation || 'all'}
              onValueChange={(v) => setFilters({ ...filters, designation: v === 'all' ? '' : v })}
            >
              <SelectTrigger className="border-0 border-b border-slate-200 rounded-none bg-transparent h-14 px-0 focus:ring-0 focus:border-brand shadow-none text-sm font-medium text-slate-500">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-slate-400" />
                  <SelectValue placeholder="Designation" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-2xl z-[150]">
                <SelectItem value="all">Designation</SelectItem>
                {(taxonomies.designation || taxonomies.current_designation || []).map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* 5. Sort By (Universal) */}
      <div className="relative">
        <Select
          value={filters.orderBy || 'nearby'}
          onValueChange={(v) => setFilters({...filters, orderBy: v})}
        >
          <SelectTrigger className="border-0 border-b border-slate-200 rounded-none bg-transparent h-14 px-0 focus:ring-0 focus:border-brand shadow-none text-sm font-medium text-slate-500">
            <div className="flex items-center gap-3">
              <List className="h-5 w-5 text-slate-400" />
              <SelectValue placeholder="Sort By" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100 shadow-2xl z-[150]">
             {[
               { label: 'Name A-Z', value: 'a-z' },
               { label: 'Name Z-A', value: 'z-a' },
               { label: 'Nearby', value: 'nearby' },
               { label: 'Latest', value: 'latest' }
             ].map(sort => (
                <SelectItem key={sort.value} value={sort.value}>{sort.label}</SelectItem>
             ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-[52px]">
      <NavbarPremium variant="light" />

      {/* Type Selection Strip - Premium Icons */}
      <div className="pt-0 bg-white sticky top-[52px] z-40 border-b border-slate-100">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 pt-0 pb-0 flex items-start justify-center relative z-50">
          <div className="flex items-center gap-12">
            <span className="text-slate-900 font-semibold text-sm tracking-tight hidden md:block">
              What are you looking for?
            </span>
            
            <div className="flex items-center gap-10">
              <button 
                onClick={() => setActiveType('church')}
                className={`flex items-center gap-3 px-8 py-5 text-sm font-medium transition-all relative group ${activeType === 'church' ? 'text-brand' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Church className={`h-6 w-6 ${activeType === 'church' ? 'text-brand' : 'text-slate-400 group-hover:text-slate-900'}`} />
                <span>Churches</span>
                {activeType === 'church' && (
                  <motion.div layoutId="activeUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />
                )}
              </button>

              <button 
                onClick={() => setActiveType('pastor')}
                className={`flex items-center gap-3 px-8 py-5 text-sm font-medium transition-all relative group ${activeType === 'pastor' ? 'text-brand' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Users className={`h-6 w-6 ${activeType === 'pastor' ? 'text-brand' : 'text-slate-400 group-hover:text-slate-900'}`} />
                <span>Pastors</span>
                {activeType === 'pastor' && (
                  <motion.div layoutId="activeUnderline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Width Expansion */}
      <section className="bg-white relative">
        <div className="w-full">
          <div className="flex flex-col lg:flex-row gap-0 bg-white overflow-hidden h-[calc(100vh-104px)] relative">
            
            {/* Mobile Filter Toggle (Visible only on mobile) */}
            <div className="lg:hidden flex items-center gap-2 p-4 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-30">
                <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl h-10 text-xs font-bold border-slate-200"
                    onClick={() => setShowMobileFilters(true)}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters {Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v).length > 2 && <Badge className="ml-1 bg-brand h-4 w-4 p-0 flex items-center justify-center text-[8px]">{Object.values(filters).filter(v => Array.isArray(v) ? v.length > 0 : v).length - 2}</Badge>}
                </Button>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setMobileView('list')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mobileView === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}
                    >
                        List
                    </button>
                    <button 
                        onClick={() => setMobileView('map')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mobileView === 'map' ? 'bg-white text-brand shadow-sm' : 'text-slate-400'}`}
                    >
                        Map
                    </button>
                </div>
            </div>

            {/* 1. Sidebar - Filters (Left) */}
            <AnimatePresence>
                {showMobileFilters && (
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[100] flex"
                    >
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMobileFilters(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        
                        {/* Drawer Content */}
                        <div className="relative w-[85%] max-w-[320px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-slate-950">Filters</h3>
                                    <div className="flex items-center gap-4">
                                        <button onClick={resetFilters} className="text-brand text-xs font-medium uppercase tracking-widest hover:opacity-70">Reset</button>
                                        <button onClick={() => setShowMobileFilters(false)} className="text-slate-400 p-1"><X className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {renderFilters()}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <Button onClick={() => setShowMobileFilters(false)} className="w-full bg-brand h-12 rounded-2xl font-bold">Apply Filters</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar (Visible only on LG+) */}
            <div className="hidden lg:flex lg:w-[320px] border-r border-slate-100 bg-white overflow-y-auto custom-scrollbar flex-col">
              <div className="p-6 space-y-6 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-950">Filters</h3>
                  <button onClick={resetFilters} className="text-brand text-xs font-medium uppercase tracking-widest hover:opacity-70">Reset</button>
                </div>

                {renderFilters()}
              </div>
            </div>

            {/* 2. Results Column (Middle) */}
            <div className={`
                ${mobileView === 'list' ? 'flex' : 'hidden'} 
                lg:flex lg:w-[500px] border-r border-slate-100 bg-white overflow-y-auto custom-scrollbar flex-col
            `}>
              <div className="p-6 space-y-6">
                {/* Stats Bar */}
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-white/95 backdrop-blur-md py-4 z-10 border-b border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand animate-pulse"></div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                      Showing {results.length} of {total} {activeType === 'church' ? 'Churches' : 'Pastors'}
                    </span>
                  </div>
                  <button 
                    onClick={showAllGlobally}
                    className="text-[10px] font-bold text-brand hover:text-white hover:bg-brand transition-all border border-brand/20 px-4 py-2 rounded-full uppercase tracking-widest bg-brand/5 whitespace-nowrap"
                  >
                    Show all {activeType === 'church' ? 'churches' : 'pastors'}
                  </button>
                </div>

                {/* Results List */}
                <div className="space-y-6">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 shimmer"></div>
                    ))
                  ) : results.length > 0 ? (
                    results.map((item) => (
                      <div 
                        key={item.id} 
                        className={`transition-all duration-300 ${hoveredId === item.id ? 'ring-2 ring-brand ring-offset-4 rounded-2xl' : ''}`}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {activeType === 'church' ? (
                          <ChurchCard church={item} />
                        ) : (
                          <PastorCard pastor={item} />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-24 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                      <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                         <MapPin className="text-slate-300 w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-bold text-slate-900">No results in this area</h4>
                        <p className="text-sm text-slate-500 max-w-[250px] mx-auto italic">
                          Try zooming out or clearing your location filters to see more results.
                        </p>
                      </div>
                      <Button 
                        onClick={showAllGlobally}
                        variant="outline" 
                        className="rounded-full px-8 border-brand/20 text-brand font-bold hover:bg-brand hover:text-white transition-all shadow-lg shadow-brand/10"
                      >
                         Show All {activeType === 'church' ? 'Churches' : 'Pastors'} Globally
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Map View (Right) */}
            <div className={`
                ${mobileView === 'map' ? 'block' : 'hidden'} 
                lg:block flex-1 bg-slate-100 relative overflow-hidden h-full
            `}>
                <MapboxExploreMap 
                  results={results} 
                  type={activeType} 
                  hoveredId={hoveredId} 
                  onMarkerHover={setHoveredId}
                  center={filters.userCoords}
                  onBoundsChange={(bounds) => {
                    setFilters(prev => ({ 
                      ...prev, 
                      location: 'Current Map View'
                    }));
                    setMapBounds(bounds);
                  }}
                />
            </div>
          </div>

          {/* Mobile Floating Toggle Button (Visible only on mobile) */}
          <div className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
             <Button 
                onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
                className="rounded-full h-12 px-6 bg-slate-900 text-white shadow-2xl hover:bg-slate-800 transition-all border border-white/20 backdrop-blur-md"
             >
                {mobileView === 'list' ? (
                    <><MapIcon className="w-4 h-4 mr-2" /> Show Map</>
                ) : (
                    <><List className="w-4 h-4 mr-2" /> Show List</>
                )}
             </Button>
          </div>
        </div>
      </section>


    </div>
  );
}
