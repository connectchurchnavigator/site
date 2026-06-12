import React, { useState, useEffect } from 'react';
import { Search, MapPin, Users, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SpaceFinderPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [filters, setFilters] = useState({
    day: null,
    maxPrice: null,
    capacity: null,
    facilities: []
  });

  const quickFilters = [
    { label: 'Sunday', type: 'day', value: 'Sunday' },
    { label: 'Weekdays', type: 'day', value: 'weekday' },
    { label: 'Under £50/hr', type: 'maxPrice', value: 50 },
    { label: '100+ capacity', type: 'capacity', value: 100 },
    { label: 'Sound System', type: 'facility', value: 'Sound System' },
    { label: 'Parking', type: 'facility', value: 'Parking' },
    { label: 'Kitchen', type: 'facility', value: 'Kitchen' }
  ];

  useEffect(() => {
    loadSpaces();
  }, [filters]);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.day && filters.day !== 'weekday') params.append('day', filters.day);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.capacity) params.append('capacity', filters.capacity);
      
      const response = await fetch(`${API_BASE_URL}/api/spaces/available?${params}`);
      const data = await response.json();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      setAiMode(true);
      const response = await fetch(`${API_BASE_URL}/api/search/ai?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.search_type === 'spaces') {
        setSpaces(data.results.map(r => ({
          id: r.id,
          church_name: r.name,
          city: r.city,
          area: r.area,
          logo_url: r.logo_url,
          slug: r.slug,
          space: r.space
        })));
      }
    } catch (error) {
      console.error('AI search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilter = (filter) => {
    setAiMode(false);
    const newFilters = { ...filters };
    
    if (filter.type === 'day') {
      newFilters.day = filters.day === filter.value ? null : filter.value;
    } else if (filter.type === 'maxPrice') {
      newFilters.maxPrice = filters.maxPrice === filter.value ? null : filter.value;
    } else if (filter.type === 'capacity') {
      newFilters.capacity = filters.capacity === filter.value ? null : filter.value;
    } else if (filter.type === 'facility') {
      const facilities = filters.facilities || [];
      if (facilities.includes(filter.value)) {
        newFilters.facilities = facilities.filter(f => f !== filter.value);
      } else {
        newFilters.facilities = [...facilities, filter.value];
      }
    }
    
    setFilters(newFilters);
  };

  const isFilterActive = (filter) => {
    if (filter.type === 'day') return filters.day === filter.value;
    if (filter.type === 'maxPrice') return filters.maxPrice === filter.value;
    if (filter.type === 'capacity') return filters.capacity === filter.value;
    if (filter.type === 'facility') return filters.facilities?.includes(filter.value);
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Find Church Space to Rent</h1>
          <p className="text-xl text-blue-100 mb-8">Discover available church halls and venues across the UK</p>
          
          <div className="max-w-3xl">
            <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2">
              <input
                type="text"
                placeholder="Describe what you need... e.g. 'Sunday space for 100 people in East London'"
                className="flex-1 px-4 py-3 text-gray-900 focus:outline-none rounded"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
              />
              <button
                onClick={handleAISearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold flex items-center gap-2"
              >
                <Search size={20} />
                Search
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              {quickFilters.map((filter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    isFilterActive(filter)
                      ? 'bg-white text-blue-600'
                      : 'bg-blue-500 text-white hover:bg-blue-400'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching for available spaces...</p>
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No spaces found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {aiMode ? 'AI Search Results' : 'Available Spaces'} ({spaces.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <div key={space.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                  <div className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      {space.logo_url ? (
                        <img src={space.logo_url} alt={space.church_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {space.church_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{space.church_name}</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={14} />
                          {space.city}{space.area && `, ${space.area}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4 space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">{space.space?.name || 'Space Available'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-sm">Capacity: {space.space?.capacity || 'N/A'} people</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-700">
                        <DollarSign size={16} className="text-green-600" />
                        <span className="text-sm font-semibold">
                          £{space.space?.price_per_hour || 0}/hour · £{space.space?.price_per_day || 0}/day
                        </span>
                      </div>
                      
                      {space.space?.available_days && space.space.available_days.length > 0 && (
                        <div className="flex items-start gap-2 text-gray-700">
                          <Clock size={16} className="text-blue-600 mt-0.5" />
                          <span className="text-sm">{space.space.available_days.join(', ')}</span>
                        </div>
                      )}
                      
                      {space.space?.facilities && space.space.facilities.length > 0 && (
                        <div className="pt-2">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Facilities included:</p>
                          <div className="flex flex-wrap gap-1">
                            {space.space.facilities.slice(0, 3).map((facility, idx) => (
                              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <CheckCircle size={12} />
                                {facility}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <Link
                      to={`/church/${space.slug}`}
                      className="mt-4 block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded font-semibold transition"
                    >
                      Enquire Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpaceFinderPage;