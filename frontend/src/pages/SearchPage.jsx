import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, MapPin, Calendar, DollarSign, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.churchnavigator.com';

const LISTING_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'church', label: 'Churches' },
  { id: 'event', label: 'Events' },
  { id: 'pastor', label: 'Pastors' },
  { id: 'worship_leader', label: 'Worship Leaders' },
  { id: 'media_team', label: 'Media Teams' },
  { id: 'bible_college', label: 'Bible Colleges' }
];

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState(searchParams.get('type') || 'all');
  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    denomination: searchParams.get('denomination') || ''
  });
  const [showAI, setShowAI] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (query || Object.values(filters).some(v => v)) {
      performSearch();
    }
  }, [page, activeType]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: '20'
      });

      if (activeType !== 'all') params.append('type', activeType);
      if (filters.city) params.append('city', filters.city);
      if (filters.denomination) params.append('denomination', filters.denomination);

      const endpoint = activeType === 'all' ? '/api/search' : `/api/search/${activeType}s`;
      const response = await axios.get(`${API_BASE}${endpoint}?${params}`);

      setResults(response.data.results || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams({ q: query });
    if (activeType !== 'all') params.append('type', activeType);
    if (filters.city) params.append('city', filters.city);
    if (filters.denomination) params.append('denomination', filters.denomination);
    setSearchParams(params);
    performSearch();
  };

  const handleAISearch = async () => {
    if (!query || query.length < 10) {
      alert('Please enter a more detailed question for AI search (minimum 10 characters)');
      return;
    }

    setAiLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/search/conversational?q=${encodeURIComponent(query)}`);
      setAiAnswer(response.data.answer);
      setShowAI(true);
    } catch (error) {
      if (error.response?.status === 429) {
        alert('Daily AI search limit reached. Please try again tomorrow or use standard search.');
      } else {
        alert('AI search unavailable. Using standard search instead.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search ChurchNavigator</h1>
          
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search churches, events, pastors, worship leaders..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Search
              </button>
              <button
                type="button"
                onClick={handleAISearch}
                disabled={aiLoading || !query}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                title="Ask AI for personalized recommendations"
              >
                {aiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Ask AI
              </button>
            </div>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {LISTING_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => { setActiveType(type.id); setPage(1); }}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeType === type.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    City
                  </label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    placeholder="London, Manchester..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Denomination
                  </label>
                  <input
                    type="text"
                    value={filters.denomination}
                    onChange={(e) => setFilters({...filters, denomination: e.target.value})}
                    placeholder="Pentecostal, Baptist..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => { setPage(1); performSearch(); }}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {showAI && aiAnswer && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-2">AI Recommendation</h3>
                    <p className="text-gray-700 whitespace-pre-line">{aiAnswer}</p>
                    <button
                      onClick={() => setShowAI(false)}
                      className="mt-3 text-sm text-purple-600 hover:text-purple-800"
                    >
                      Show standard results instead
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="mb-4 text-gray-600">
                  Found {total.toLocaleString()} results
                </div>
                <div className="space-y-4">
                  {results.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                      <div className="flex gap-4">
                        {item.main_image && (
                          <img
                            src={item.main_image}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                                {item.name}
                                {item.is_verified && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Verified</span>
                                )}
                              </h3>
                              <div className="text-sm text-gray-600 space-y-1">
                                {item.city && <div><MapPin className="inline h-4 w-4 mr-1" />{item.city}</div>}
                                {item.denomination && <div>{item.denomination}</div>}
                              </div>
                            </div>
                            {item.rating > 0 && (
                              <div className="text-right">
                                <div className="text-lg font-semibold text-yellow-600">★ {item.rating.toFixed(1)}</div>
                                <div className="text-xs text-gray-500">{item.total_reviews || 0} reviews</div>
                              </div>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-2 text-gray-600 text-sm line-clamp-2">{item.description}</p>
                          )}
                          <div className="mt-3">
                            <a
                              href={`/${item.listing_type}/${item.slug || item.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              View Details →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {total > 20 && (
                  <div className="mt-6 flex justify-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">Page {page} of {Math.ceil(total / 20)}</span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / 20)}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="text-center py-12 text-gray-500">
                No results found for "{query}". Try different keywords or filters.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
