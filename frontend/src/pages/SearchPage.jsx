import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import FilterSidebar from '../components/FilterSidebar';
import SearchResultCard from '../components/SearchResultCard';
import Pagination from '../components/Pagination';
import ConversationalSearch from '../components/ConversationalSearch';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});
  const [showConversational, setShowConversational] = useState(false);

  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const city = searchParams.get('city') || '';
  const denomination = searchParams.get('denomination') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 20;

  useEffect(() => {
    performSearch();
  }, [query, type, city, denomination, page]);

  const performSearch = async () => {
    if (!query && !type && !city && !denomination) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (type) params.append('type', type);
      if (city) params.append('city', city);
      if (denomination) params.append('denomination', denomination);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      if (navigator.geolocation && query.toLowerCase().includes('near me')) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            params.append('lat', position.coords.latitude.toString());
            params.append('lng', position.coords.longitude.toString());
            await fetchResults(params);
          },
          async () => {
            await fetchResults(params);
          }
        );
      } else {
        await fetchResults(params);
      }
    } catch (error) {
      console.error('Search error:', error);
      setLoading(false);
    }
  };

  const fetchResults = async (params) => {
    try {
      const response = await axios.get(`${API_BASE}/api/search?${params.toString()}`);
      setResults(response.data.results);
      setTotal(response.data.total);
      setFilters(response.data.filters_applied);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newQuery) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', newQuery);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleFilterChange = (filterKey, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(filterKey, value);
    } else {
      newParams.delete(filterKey);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTypeChange = (newType) => {
    const newParams = new URLSearchParams(searchParams);
    if (newType) {
      newParams.set('type', newType);
    } else {
      newParams.delete('type');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <SearchBar initialQuery={query} onSearch={handleSearch} />
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {['', 'church', 'event', 'pastor', 'worship-leader', 'media-team', 'bible-college'].map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t ? t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <FilterSidebar
            city={city}
            denomination={denomination}
            onCityChange={(v) => handleFilterChange('city', v)}
            onDenominationChange={(v) => handleFilterChange('denomination', v)}
          />

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                {loading ? 'Searching...' : `${total} results found`}
                {Object.keys(filters).length > 0 && (
                  <span className="ml-2 text-sm">
                    (filtered by: {Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ')})
                  </span>
                )}
              </p>
              <button
                onClick={() => setShowConversational(!showConversational)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                {showConversational ? 'Hide AI Search' : '🤖 Ask AI'}
              </button>
            </div>

            {showConversational && (
              <ConversationalSearch onClose={() => setShowConversational(false)} />
            )}

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {results.map(result => (
                    <SearchResultCard key={result.id} result={result} />
                  ))}
                </div>

                {results.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-600 text-lg">No results found. Try different search terms.</p>
                  </div>
                )}

                {total > pageSize && (
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(total / pageSize)}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
