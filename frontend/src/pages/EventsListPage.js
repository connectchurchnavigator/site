import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, Grid3X3, Filter, X, Search } from 'lucide-react';
import EventCard from '../components/EventCard';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const EventsListPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({
    city: '',
    event_type: '',
    start_date: '',
    end_date: '',
    is_free: '',
    is_online: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    fetchEvents();
    fetchCities();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });
      const response = await fetch(`${API_URL}/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cities`);
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
      }
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchEvents();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      event_type: '',
      start_date: '',
      end_date: '',
      is_free: '',
      is_online: '',
      search: ''
    });
    setTimeout(() => fetchEvents(), 0);
  };

  const groupEventsByMonth = () => {
    const grouped = {};
    events.forEach(event => {
      const date = new Date(event.start_date);
      const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(event);
    });
    return grouped;
  };

  const eventTypes = [
    { value: 'conference', label: 'Conference' },
    { value: 'concert', label: 'Concert' },
    { value: 'prayer_meeting', label: 'Prayer Meeting' },
    { value: 'worship_night', label: 'Worship Night' },
    { value: 'youth_event', label: 'Youth Event' },
    { value: 'bible_study', label: 'Bible Study' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'social', label: 'Social' },
    { value: 'other', label: 'Other' }
  ];

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <>
      <Helmet>
        <title>Church Events in the UK | ChurchNavigator</title>
        <meta name="description" content="Discover upcoming church events, conferences, concerts, prayer meetings, and more across the UK. Find Christian events near you." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">Church Events</h1>
            <p className="text-xl text-blue-100">Discover upcoming Christian events across the UK</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" placeholder="Search events..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} onKeyPress={(e) => e.key === 'Enter' && applyFilters()} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              <Filter className="w-5 h-5" />
              Filters {activeFiltersCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFiltersCount}</span>}
            </button>
            <div className="flex gap-2 bg-white border border-gray-300 rounded-lg p-1">
              <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Grid3X3 className="w-5 h-5" /> Grid
              </button>
              <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                <Calendar className="w-5 h-5" /> Calendar
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Filter Events</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <select value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Cities</option>
                    {cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select value={filters.event_type} onChange={(e) => handleFilterChange('event_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Types</option>
                    {eventTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input type="date" value={filters.start_date} onChange={(e) => handleFilterChange('start_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input type="date" value={filters.end_date} onChange={(e) => handleFilterChange('end_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.is_free === 'true'} onChange={(e) => handleFilterChange('is_free', e.target.checked ? 'true' : '')} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Free Events Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filters.is_online === 'true'} onChange={(e) => handleFilterChange('is_online', e.target.checked ? 'true' : '')} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Online Events Only</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button onClick={applyFilters} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Apply Filters</button>
                <button onClick={clearFilters} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg">Clear All</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No events found. Try adjusting your filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => <EventCard key={event._id} event={event} />)}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupEventsByMonth()).map(([monthYear, monthEvents]) => (
                <div key={monthYear}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{monthYear}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {monthEvents.map(event => <EventCard key={event._id} event={event} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EventsListPage;