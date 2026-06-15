import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Filter, X, Plus, Map, List, Star } from 'lucide-react';
import { debounce } from 'lodash';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ChurchPicker = ({ tripId, onClose, onChurchAdded }) => {
  const [view, setView] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    denomination: '',
    size: '',
    language: '',
    open_to_visits: null,
    service_day: ''
  });
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [slotData, setSlotData] = useState({
    day_number: 1,
    time_slot: 'morning',
    visit_type: 'Sunday Service',
    notes: ''
  });
  const [languages, setLanguages] = useState([]);
  const [languageContext, setLanguageContext] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    fetchChurches();
  }, [searchQuery, filters, page]);

  useEffect(() => {
    if (filters.language) {
      fetchLanguageContext(filters.language);
    } else {
      setLanguageContext(null);
    }
  }, [filters.language]);

  const fetchLanguages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/planner/languages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLanguages(response.data.languages);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    }
  };

  const fetchLanguageContext = async (language) => {
    try {
      const response = await axios.get(`${API_URL}/api/planner/languages/${language}/context`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLanguageContext(response.data.context);
    } catch (error) {
      console.error('Failed to fetch language context:', error);
    }
  };

  const fetchChurches = useCallback(
    debounce(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          ...(searchQuery && { q: searchQuery }),
          ...(filters.city && { city: filters.city }),
          ...(filters.denomination && { denomination: filters.denomination }),
          ...(filters.size && { size: filters.size }),
          ...(filters.language && { language: filters.language }),
          ...(filters.open_to_visits !== null && { open_to_visits: filters.open_to_visits }),
          ...(filters.service_day && { service_day: filters.service_day }),
          ...(tripId && { trip_id: tripId })
        });

        const response = await axios.get(`${API_URL}/api/planner/church-picker?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        setChurches(response.data.churches);
        setTotalPages(response.data.pages);
      } catch (error) {
        console.error('Failed to fetch churches:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [searchQuery, filters, page, tripId]
  );

  const handleAddChurch = async () => {
    try {
      await axios.post(
        `${API_URL}/api/planner/trips/${tripId}/add-church`,
        {
          church_id: selectedChurch.id,
          ...slotData
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      onChurchAdded?.();
      setSelectedChurch(null);
      setSlotData({ day_number: 1, time_slot: 'morning', visit_type: 'Sunday Service', notes: '' });
    } catch (error) {
      console.error('Failed to add church:', error);
      alert('Failed to add church to trip');
    }
  };

  const groupedLanguages = languages.reduce((acc, lang) => {
    const region = lang.region || 'Other';
    if (!acc[region]) acc[region] = [];
    acc[region].push(lang);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Church to Trip</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search church name, city, or pastor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  view === 'map' ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'
                }`}
              >
                <Map className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-4 gap-3">
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Cities</option>
                <option value="London">London</option>
                <option value="Birmingham">Birmingham</option>
                <option value="Manchester">Manchester</option>
                <option value="Leeds">Leeds</option>
                <option value="Bristol">Bristol</option>
                <option value="Glasgow">Glasgow</option>
                <option value="Cardiff">Cardiff</option>
              </select>

              <select
                value={filters.denomination}
                onChange={(e) => setFilters({ ...filters, denomination: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Denominations</option>
                <option value="Pentecostal">Pentecostal</option>
                <option value="Baptist">Baptist</option>
                <option value="Anglican">Anglican</option>
                <option value="RCCG">RCCG</option>
                <option value="Methodist">Methodist</option>
                <option value="Non-Denominational">Non-Denominational</option>
              </select>

              <select
                value={filters.size}
                onChange={(e) => setFilters({ ...filters, size: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Sizes</option>
                <option value="Small">Small (&lt;100)</option>
                <option value="Medium">Medium (100-500)</option>
                <option value="Large">Large (500-1000)</option>
                <option value="Mega">Mega (1000+)</option>
              </select>

              <select
                value={filters.language}
                onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Languages</option>
                {Object.entries(groupedLanguages).map(([region, langs]) => (
                  <optgroup key={region} label={region}>
                    {langs.map((lang) => (
                      <option key={lang.name} value={lang.name}>
                        {lang.name} ({lang.count})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {languageContext && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                {filters.language} Ministry Context
              </h3>
              <p className="text-sm text-blue-800 mb-2">{languageContext.context}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <strong>Worship Style:</strong> {languageContext.worship_style}
                </div>
                <div>
                  <strong>Service Length:</strong> {languageContext.service_length}
                </div>
                <div>
                  <strong>Key Topics:</strong> {languageContext.topics}
                </div>
                <div>
                  <strong>Etiquette:</strong> {languageContext.etiquette}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading churches...</div>
          ) : churches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No churches found</div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {churches.map((church) => (
                <div key={church.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex gap-3">
                    {church.photo_url && (
                      <img
                        src={church.photo_url}
                        alt={church.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{church.name}</h3>
                      <p className="text-sm text-gray-600">
                        <MapPin className="w-3 h-3 inline" /> {church.city}
                        {church.distance_miles && ` • ${church.distance_miles} miles`}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {church.denomination && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {church.denomination}
                          </span>
                        )}
                        {church.congregation_size && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {church.congregation_size} members
                          </span>
                        )}
                        {church.open_to_visits && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Open to Visits
                          </span>
                        )}
                        {church.match_score && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" /> {church.match_score}% match
                          </span>
                        )}
                      </div>
                      {church.languages.length > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Languages: {church.languages.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChurch(church)}
                    className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Trip
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedChurch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add {selectedChurch.name} to Trip</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Which day?</label>
                <input
                  type="number"
                  min="1"
                  value={slotData.day_number}
                  onChange={(e) => setSlotData({ ...slotData, day_number: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">What time?</label>
                <select
                  value={slotData.time_slot}
                  onChange={(e) => setSlotData({ ...slotData, time_slot: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="morning">Morning (9-12)</option>
                  <option value="afternoon">Afternoon (12-5)</option>
                  <option value="evening">Evening (5-9)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Visit type?</label>
                <select
                  value={slotData.visit_type}
                  onChange={(e) => setSlotData({ ...slotData, visit_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Midweek Service">Midweek Service</option>
                  <option value="Prayer Meeting">Prayer Meeting</option>
                  <option value="Special Event">Special Event</option>
                  <option value="Informal Visit">Informal Visit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={slotData.notes}
                  onChange={(e) => setSlotData({ ...slotData, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedChurch(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChurch}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchPicker;