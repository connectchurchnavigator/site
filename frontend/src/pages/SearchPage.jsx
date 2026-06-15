import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, MapPin, Filter, Sparkles, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState(searchParams.get('type') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    denomination: searchParams.get('denomination') || ''
  });

  const types = [
    { key: '', label: 'All' },
    { key: 'church', label: 'Churches' },
    { key: 'event', label: 'Events' },
    { key: 'pastor', label: 'Pastors' },
    { key: 'worship-leader', label: 'Worship Leaders' },
    { key: 'media-team', label: 'Media Teams' },
    { key: 'bible-college', label: 'Bible Colleges' }
  ];

  const denominations = [
    'Pentecostal', 'Baptist', 'Anglican', 'Methodist', 'Presbyterian',
    'Catholic', 'Evangelical', 'Charismatic', 'Reformed', 'Independent'
  ];

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [page, activeType, filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: '20'
      });
      
      if (activeType) params.append('type', activeType);
      if (filters.city) params.append('city', filters.city);
      if (filters.denomination) params.append('denomination', filters.denomination);

      const response = await axios.get(`${API_BASE}/api/search?${params.toString()}`);
      setResults(response.data.results || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    performSearch();
    
    const params = new URLSearchParams({ q: query });
    if (activeType) params.append('type', activeType);
    if (filters.city) params.append('city', filters.city);
    if (filters.denomination) params.append('denomination', filters.denomination);
    setSearchParams(params);
  };

  const handleAISearch = async () => {
    if (!query) return;
    setAiLoading(true);
    setShowAI(true);
    try {
      const response = await axios.get(`${API_BASE}/api/search/conversational?q=${encodeURIComponent(query)}`);
      setAiResponse(response.data.results);
    } catch (error) {
      if (error.response?.status === 429) {
        setAiResponse('Daily AI search limit reached. Please try standard search.');
      } else {
        setAiResponse('AI search unavailable. Please use standard search.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const getImageUrl = (result) => {
    if (result.image) return result.image;
    if (result.images && result.images.length > 0) return result.images[0];
    return '/placeholder-church.jpg';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search churches, events, pastors..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter size={20} />
            </button>
            <button
              type="button"
              onClick={handleAISearch}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              title="Ask AI (limited availability)"
            >
              <Sparkles size={20} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  placeholder="e.g. London"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Denomination</label>
                <select
                  value={filters.denomination}
                  onChange={(e) => setFilters({ ...filters, denomination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Denominations</option>
                  {denominations.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {types.map(type => (
              <button
                key={type.key}
                onClick={() => { setActiveType(type.key); setPage(1); }}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  activeType === type.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showAI && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 relative">
            <button
              onClick={() => setShowAI(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-purple-600" size={24} />
              <h3 className="text-lg font-semibold text-purple-900">AI Assistant</h3>
            </div>
            {aiLoading ? (
              <p className="text-gray-600">Thinking...</p>
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap">{aiResponse}</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No results found. Try a different search.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-4">
              Found {total} result{total !== 1 ? 's' : ''} for "{query}"
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((result) => (
                <Link
                  key={result._id}
                  to={`/${result.type}/${result.slug}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={getImageUrl(result)}
                    alt={result.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.src = '/placeholder-church.jpg'; }}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-600 uppercase">
                        {result.type.replace('-', ' ')}
                      </span>
                      {result.is_verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {result.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin size={14} className="mr-1" />
                      {result.city}
                    </div>
                    {result.denomination && (
                      <p className="text-sm text-gray-500 mb-2">{result.denomination}</p>
                    )}
                    {result.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    {result.rating && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-700 ml-1">
                          {result.rating.toFixed(1)} ({result.total_reviews || 0} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
