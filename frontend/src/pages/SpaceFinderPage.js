import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SpaceFinderPage = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const [spacesNeeded, setSpacesNeeded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    capacity: '',
    day: '',
    price_max: '',
    suitable_for: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'available') {
        const params = new URLSearchParams();
        if (filters.city) params.append('city', filters.city);
        if (filters.capacity) params.append('capacity', filters.capacity);
        if (filters.day) params.append('day', filters.day);
        if (filters.price_max) params.append('price_max', filters.price_max);
        if (filters.suitable_for) params.append('suitable_for', filters.suitable_for);
        
        const res = await fetch(`${API_URL}/api/spaces/available?${params}`);
        const data = await res.json();
        setAvailableSpaces(data.spaces || []);
      } else {
        const params = new URLSearchParams();
        if (filters.city) params.append('city', filters.city);
        if (filters.capacity) params.append('capacity', filters.capacity);
        
        const res = await fetch(`${API_URL}/api/spaces/needed?${params}`);
        const data = await res.json();
        setSpacesNeeded(data.spaces_needed || []);
      }
    } catch (error) {
      console.error('Error fetching spaces:', error);
    }
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ city: '', capacity: '', day: '', price_max: '', suitable_for: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Church Space Finder - Rent or Find Church Venues | ChurchNavigator</title>
        <meta name="description" content="Find church spaces available for rent or churches looking for venues. Book church halls, chapels, and meeting rooms across the UK." />
      </Helmet>

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Church Space Finder</h1>
          <p className="text-xl text-emerald-100">Connect churches with available spaces and those looking for venues</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'available'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ti ti-building mr-2"></i>
                Spaces Available ({availableSpaces.length})
              </button>
              <button
                onClick={() => setActiveTab('needed')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'needed'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className="ti ti-search mr-2"></i>
                Churches Looking ({spacesNeeded.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <input
                type="text"
                placeholder="City or area"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Min capacity"
                value={filters.capacity}
                onChange={(e) => handleFilterChange('capacity', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              {activeTab === 'available' && (
                <>
                  <select
                    value={filters.day}
                    onChange={(e) => handleFilterChange('day', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Any day</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Max price/hour"
                    value={filters.price_max}
                    onChange={(e) => handleFilterChange('price_max', e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </>
              )}
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="mt-4 text-gray-600">Loading spaces...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'available' ? (
                  availableSpaces.length > 0 ? (
                    availableSpaces.map(church => (
                      <SpaceAvailableCard key={church._id} church={church} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <i className="ti ti-building text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-600">No spaces available matching your criteria</p>
                    </div>
                  )
                ) : (
                  spacesNeeded.length > 0 ? (
                    spacesNeeded.map(church => (
                      <SpaceNeededCard key={church._id} church={church} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <i className="ti ti-search text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-600">No churches looking for space matching your criteria</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SpaceAvailableCard = ({ church }) => {
  const rental = church.space_rental || {};
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <i className="ti ti-building text-lg"></i>
          <span className="font-semibold">Space Available</span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{church.name}</h3>
        <p className="text-sm text-gray-600 mb-3">
          <i className="ti ti-map-pin mr-1"></i>
          {church.city}, {church.postcode}
        </p>
        
        <div className="space-y-2 mb-4">
          {rental.space_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Space:</span>
              <span className="font-medium">{rental.space_name}</span>
            </div>
          )}
          {rental.capacity && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Capacity:</span>
              <span className="font-medium">{rental.capacity} people</span>
            </div>
          )}
          {rental.price_per_hour && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Price:</span>
              <span className="font-semibold text-emerald-600">£{rental.price_per_hour}/hour</span>
            </div>
          )}
        </div>
        
        {rental.available_days && rental.available_days.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Available:</p>
            <div className="flex flex-wrap gap-1">
              {rental.available_days.slice(0, 3).map(day => (
                <span key={day} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {day.substring(0, 3)}
                </span>
              ))}
              {rental.available_days.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  +{rental.available_days.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        <Link
          to={`/church/${church._id}#space-rental`}
          className="block w-full text-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          View Details & Enquire
        </Link>
      </div>
    </div>
  );
};

const SpaceNeededCard = ({ church }) => {
  const needed = church.space_needed || {};
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
        <div className="flex items-center gap-2 text-blue-700">
          <i className="ti ti-search text-lg"></i>
          <span className="font-semibold">Looking for Space</span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{church.name}</h3>
        <p className="text-sm text-gray-600 mb-3">
          <i className="ti ti-map-pin mr-1"></i>
          {church.city}, {church.postcode}
        </p>
        
        <div className="space-y-2 mb-4">
          {needed.looking_for && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Need:</span>
              <span className="font-medium capitalize">{needed.looking_for}</span>
            </div>
          )}
          {needed.required_capacity && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Capacity:</span>
              <span className="font-medium">{needed.required_capacity} people</span>
            </div>
          )}
          {needed.budget_per_hour && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Budget:</span>
              <span className="font-semibold text-blue-600">£{needed.budget_per_hour}/hour</span>
            </div>
          )}
        </div>
        
        {needed.preferred_location && (
          <div className="mb-4">
            <p className="text-xs text-gray-500">Preferred location:</p>
            <p className="text-sm font-medium">{needed.preferred_location}</p>
          </div>
        )}
        
        <Link
          to={`/church/${church._id}#space-needed`}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Details & Contact
        </Link>
      </div>
    </div>
  );
};

export default SpaceFinderPage;