import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FiSearch, FiMapPin, FiFilter, FiStar, FiCheck } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const LISTING_TYPES = [
  { value: '', label: 'All' },
  { value: 'church', label: 'Churches' },
  { value: 'event', label: 'Events' },
  { value: 'pastor', label: 'Pastors' },
  { value: 'worship_leader', label: 'Worship Leaders' },
  { value: 'media_team', label: 'Media Teams' },
  { value: 'bible_college', label: 'Bible Colleges' }
];

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Leeds', 'Glasgow', 'Liverpool',
  'Edinburgh', 'Bristol', 'Sheffield', 'Newcastle', 'Cardiff', 'Leicester'
];

const DENOMINATIONS = [
  'Pentecostal', 'Baptist', 'Anglican', 'Methodist', 'Catholic',
  'Presbyterian', 'Evangelical', 'Independent', 'RCCG', 'Assemblies of God'
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    city: searchParams.get('city') || '',
    denomination: searchParams.get('denomination') || ''
  });

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const city = searchParams.get('city') || '';
    const denomination = searchParams.get('denomination') || '';
    
    setQuery(q);
    setFilters({ type, city, denomination });
    
    if (q || type || city || denomination) {
      performSearch(q, { type, city, denomination }, 1);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery, searchFilters, searchPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (searchFilters.type) params.append('type', searchFilters.type);
      if (searchFilters.city) params.append('city', searchFilters.city);
      if (searchFilters.denomination) params.append('denomination', searchFilters.denomination);
      params.append('page', searchPage);
      params.append('limit', '20');

      const response = await axios.get(`${API_URL}/api/search?${params.toString()}`);
      setResults(response.data.results || []);
      setTotal(response.data.total || 0);
      setPage(searchPage);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters.type) params.append('type', filters.type);
    if (filters.city) params.append('city', filters.city);
    if (filters.denomination) params.append('denomination', filters.denomination);
    setSearchParams(params);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (newFilters.type) params.append('type', newFilters.type);
    if (newFilters.city) params.append('city', newFilters.city);
    if (newFilters.denomination) params.append('denomination', newFilters.denomination);
    setSearchParams(params);
  };

  const handleAISearch = async () => {
    if (!query || query.length < 10) {
      alert('Please enter a detailed question (at least 10 characters)');
      return;
    }
    
    setAiLoading(true);
    setShowAI(true);
    try {
      const response = await axios.get(`${API_URL}/api/search/conversational?q=${encodeURIComponent(query)}`);
      setAiAnswer(response.data.answer || 'No AI response available');
    } catch (error) {
      if (error.response?.status === 429) {
        setAiAnswer('Daily AI search limit reached. Please use standard search or try again tomorrow.');
      } else {
        setAiAnswer('AI search failed. Please try standard search instead.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search churches, events, pastors..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <FiFilter /> Filters
            </button>
          </div>
        </form>

        {showFilters && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {LISTING_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Cities</option>
                  {UK_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Denomination</label>
                <select
                  value={filters.denomination}
                  onChange={(e) => handleFilterChange('denomination', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Denominations</option>
                  {DENOMINATIONS.map(denom => (
                    <option key={denom} value={denom}>{denom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600">
            {loading ? 'Searching...' : `${total} results found`}
          </p>
          <button
            onClick={handleAISearch}
            disabled={aiLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
          >
            {aiLoading ? 'AI Thinking...' : '🤖 Ask AI (Optional)'}
          </button>
        </div>

        {showAI && aiAnswer && (
          <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">AI Recommendation:</h3>
            <p className="text-gray-700">{aiAnswer}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No results found. Try different keywords or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((result) => (
              <Link
                key={result._id}
                to={`/listing/${result.slug}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200"
              >
                {result.image && (
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{result.name}</h3>
                    {result.is_verified && (
                      <FiCheck className="text-blue-600 bg-blue-100 rounded-full p-1" size={20} />
                    )}
                  </div>
                  {result.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{result.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {result.city && (
                      <span className="flex items-center gap-1">
                        <FiMapPin size={14} /> {result.city}
                      </span>
                    )}
                    {result.rating && (
                      <span className="flex items-center gap-1">
                        <FiStar size={14} /> {result.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {result.denomination && (
                    <span className="inline-block mt-3 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      {result.denomination}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <button
                onClick={() => performSearch(query, filters, page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            <span className="px-4 py-2 text-gray-600">Page {page}</span>
            {page * 20 < total && (
              <button
                onClick={() => performSearch(query, filters, page + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
