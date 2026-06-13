import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Search, Filter, MapPin, Calendar, DollarSign,
  Sparkles, Church, Users, Music, Video, BookOpen,
  Star, CheckCircle, Navigation
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const TYPE_OPTIONS = [
  { value: '', label: 'All', icon: Search },
  { value: 'church', label: 'Churches', icon: Church },
  { value: 'event', label: 'Events', icon: Calendar },
  { value: 'pastor', label: 'Pastors', icon: Users },
  { value: 'worship_leader', label: 'Worship Leaders', icon: Music },
  { value: 'media_team', label: 'Media Teams', icon: Video },
  { value: 'bible_college', label: 'Bible Colleges', icon: BookOpen }
];

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Sheffield',
  'Liverpool', 'Edinburgh', 'Bristol', 'Cardiff', 'Belfast', 'Newcastle',
  'Nottingham', 'Leicester', 'Coventry', 'Bradford', 'Southampton'
];

const DENOMINATIONS = [
  'Pentecostal', 'Baptist', 'Anglican', 'Methodist', 'Catholic',
  'Presbyterian', 'Evangelical', 'Charismatic', 'Reformed', 'Independent'
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [denomination, setDenomination] = useState(searchParams.get('denomination') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  
  const [userLocation, setUserLocation] = useState(null);
  const [useLocation, setUseLocation] = useState(false);

  useEffect(() => {
    if (navigator.geolocation && useLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => setUseLocation(false)
      );
    }
  }, [useLocation]);

  useEffect(() => {
    performSearch();
  }, [searchParams, page]);

  const performSearch = async () => {
    setLoading(true);
    setAiAnswer(null);
    
    try {
      const params = {
        q: searchParams.get('q') || '',
        type: searchParams.get('type') || '',
        city: searchParams.get('city') || '',
        denomination: searchParams.get('denomination') || '',
        page,
        per_page: 20
      };
      
      if (useLocation && userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.distance_km = 50;
      }
      
      const endpoint = params.type 
        ? `${API_URL}/api/search/${params.type}s`
        : `${API_URL}/api/search`;
      
      const response = await axios.get(endpoint, { params });
      
      setResults(response.data.results);
      setTotal(response.data.total);
      setHasMore(response.data.has_more);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (type) params.set('type', type);
    if (city) params.set('city', city);
    if (denomination) params.set('denomination', denomination);
    setSearchParams(params);
    setPage(1);
  };

  const handleAISearch = async () => {
    if (!query || query.length < 10) {
      alert('Please enter a more detailed question for AI search.');
      return;
    }
    
    setAiLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/search/conversational`, {
        params: { q: query }
      });
      setAiAnswer(response.data.answer);
      setShowAI(true);
    } catch (error) {
      if (error.response?.status === 429) {
        alert('Daily AI search limit reached. Please use standard search.');
      } else {
        alert('AI search failed. Please try standard search.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const ResultCard = ({ item }) => (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 cursor-pointer"
      onClick={() => navigate(`/${item.listing_type}/${item.slug}`)}
    >
      <div className="flex gap-4">
        {item.image && (
          <img 
            src={item.image} 
            alt={item.name}
            className="w-24 h-24 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {item.name}
                {item.is_verified && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </h3>
              <p className="text-gray-600 text-sm">
                {item.city} {item.denomination && `• ${item.denomination}`}
              </p>
            </div>
            {item.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({item.total_reviews})</span>
              </div>
            )}
          </div>
          {item.description && (
            <p className="text-gray-700 text-sm mt-2 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.distance_km && (
            <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {item.distance_km.toFixed(1)} km away
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search churches, events, pastors..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`px-4 py-2 rounded-full border flex items-center gap-2 transition ${
                    type === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white hover:border-blue-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">All Cities</option>
                  {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Denomination</label>
                <select
                  value={denomination}
                  onChange={(e) => setDenomination(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">All Denominations</option>
                  {DENOMINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLocation}
                    onChange={(e) => setUseLocation(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Search near me</span>
                  <MapPin className="w-4 h-4 text-blue-600" />
                </label>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            {total > 0 ? `${total} results found` : 'No results'}
          </p>
          <button
            onClick={handleAISearch}
            disabled={aiLoading || !query}
            className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Asking AI...' : 'Ask AI Assistant'}
          </button>
        </div>

        {showAI && aiAnswer && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">AI Assistant Answer</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{aiAnswer}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {results.map((item) => (
            <ResultCard key={item._id || item.slug} item={item} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setPage(page + 1)}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
