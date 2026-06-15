import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ChurchPickerModal = ({ isOpen, onClose, tripId, onChurchAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(true);
  const [culturalContext, setCulturalContext] = useState(null);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [slotPicker, setSlotPicker] = useState({ day: 1, timeSlot: 'morning', visitType: 'Sunday Service', notes: '' });
  
  const [filters, setFilters] = useState({
    city: '',
    denomination: '',
    size: '',
    language: '',
    openToVisits: null,
    serviceDays: []
  });

  const fetchChurches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.city) params.append('city', filters.city);
      if (filters.denomination) params.append('denomination', filters.denomination);
      if (filters.size) params.append('size', filters.size);
      if (filters.language) params.append('language', filters.language);
      if (filters.openToVisits !== null) params.append('open_to_visits', filters.openToVisits);
      if (filters.serviceDays.length) params.append('service_days', filters.serviceDays.join(','));
      if (tripId) params.append('trip_id', tripId);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/planner/church-picker?${params.toString()}`);
      setChurches(response.data.churches);
      setCulturalContext(response.data.cultural_context);
    } catch (error) {
      console.error('Error fetching churches:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, tripId]);

  const debouncedFetch = useCallback(debounce(fetchChurches, 300), [fetchChurches]);

  useEffect(() => {
    if (isOpen) {
      debouncedFetch();
    }
  }, [searchQuery, filters, isOpen, debouncedFetch]);

  const handleAddToTrip = (church) => {
    setSelectedChurch(church);
  };

  const handleConfirmAdd = async () => {
    if (!selectedChurch) return;
    
    const visit = {
      churchId: selectedChurch._id,
      churchName: selectedChurch.name,
      dayNumber: slotPicker.day,
      timeSlot: slotPicker.timeSlot,
      visitType: slotPicker.visitType,
      notes: slotPicker.notes
    };
    
    onChurchAdded(visit);
    setSelectedChurch(null);
    setSlotPicker({ day: 1, timeSlot: 'morning', visitType: 'Sunday Service', notes: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Add Church to Trip</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="p-6 border-b">
          <input
            type="text"
            placeholder="Search church name, city, or pastor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >List View</button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >Map View</button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-200 rounded"
            >{showFilters ? 'Hide Filters' : 'Show Filters'}</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {showFilters && (
            <div className="w-64 p-6 border-r overflow-y-auto">
              <h3 className="font-bold mb-4">Filters</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">City/Region</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All UK</option>
                  <option value="London">London</option>
                  <option value="Birmingham">Birmingham</option>
                  <option value="Manchester">Manchester</option>
                  <option value="Leeds">Leeds</option>
                  <option value="Bristol">Bristol</option>
                  <option value="Glasgow">Glasgow</option>
                  <option value="Cardiff">Cardiff</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Denomination</label>
                <select
                  value={filters.denomination}
                  onChange={(e) => setFilters({...filters, denomination: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All</option>
                  <option value="Pentecostal">Pentecostal</option>
                  <option value="Baptist">Baptist</option>
                  <option value="Anglican">Anglican</option>
                  <option value="RCCG">RCCG</option>
                  <option value="Methodist">Methodist</option>
                  <option value="Non-Denominational">Non-Denominational</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Size</label>
                <select
                  value={filters.size}
                  onChange={(e) => setFilters({...filters, size: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Sizes</option>
                  <option value="small">Small (&lt;100)</option>
                  <option value="medium">Medium (100-500)</option>
                  <option value="large">Large (500-1000)</option>
                  <option value="mega">Mega (1000+)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Language</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters({...filters, language: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">All Languages</option>
                  <option value="Yoruba">Yoruba</option>
                  <option value="Igbo">Igbo</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Twi">Twi</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Polish">Polish</option>
                  <option value="Mandarin">Mandarin</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.openToVisits === true}
                    onChange={(e) => setFilters({...filters, openToVisits: e.target.checked ? true : null})}
                    className="mr-2"
                  />
                  <span className="text-sm">Open to Visits</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
            {culturalContext && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold mb-2">Cultural Context: {filters.language}</h4>
                <p className="text-sm mb-2"><strong>Preferences:</strong> {culturalContext.preferences}</p>
                <p className="text-sm mb-2"><strong>Service Length:</strong> {culturalContext.service_length}</p>
                <p className="text-sm mb-2"><strong>Topics:</strong> {culturalContext.topics}</p>
                <p className="text-sm mb-2"><strong>Tips:</strong> {culturalContext.tips}</p>
                <p className="text-sm italic">{culturalContext.note}</p>
              </div>
            )}

            {viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <p>Loading churches...</p>
                ) : churches.length === 0 ? (
                  <p>No churches found matching your criteria.</p>
                ) : (
                  churches.map(church => (
                    <div key={church._id} className="border rounded-lg p-4 hover:shadow-lg transition">
                      {church.photo && (
                        <img src={church.photo} alt={church.name} className="w-full h-40 object-cover rounded mb-3" />
                      )}
                      <h3 className="font-bold text-lg mb-1">{church.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{church.city} • {church.denomination}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {church.congregation_size && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{church.congregation_size} members</span>
                        )}
                        {church.open_to_visits && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Open to Visits</span>
                        )}
                        {church.languages && church.languages.length > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{church.languages.join(', ')}</span>
                        )}
                      </div>
                      {church.match_score && (
                        <p className="text-sm mb-2"><strong>Match Score:</strong> {church.match_score}%</p>
                      )}
                      <button
                        onClick={() => handleAddToTrip(church)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >Add to Trip</button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <MapContainer center={[52.4862, -1.8904]} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {churches.map(church => (
                  church.location?.coordinates && (
                    <Marker key={church._id} position={[church.location.coordinates[1], church.location.coordinates[0]]}>
                      <Popup>
                        <div>
                          <h4 className="font-bold">{church.name}</h4>
                          <p className="text-sm">{church.city}</p>
                          <button
                            onClick={() => handleAddToTrip(church)}
                            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          >Add to Trip</button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {selectedChurch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Add Visit Slot</h3>
              <p className="mb-4">Adding: <strong>{selectedChurch.name}</strong></p>
              
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Which day?</label>
                <input
                  type="number"
                  min="1"
                  value={slotPicker.day}
                  onChange={(e) => setSlotPicker({...slotPicker, day: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">What time?</label>
                <select
                  value={slotPicker.timeSlot}
                  onChange={(e) => setSlotPicker({...slotPicker, timeSlot: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="morning">Morning (9-12)</option>
                  <option value="afternoon">Afternoon (12-5)</option>
                  <option value="evening">Evening (5-9)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Visit type?</label>
                <select
                  value={slotPicker.visitType}
                  onChange={(e) => setSlotPicker({...slotPicker, visitType: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Midweek Service">Midweek Service</option>
                  <option value="Prayer Meeting">Prayer Meeting</option>
                  <option value="Special Event">Special Event</option>
                  <option value="Informal Visit">Informal Visit</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Notes (optional)</label>
                <textarea
                  value={slotPicker.notes}
                  onChange={(e) => setSlotPicker({...slotPicker, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows="3"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedChurch(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >Cancel</button>
                <button
                  onClick={handleConfirmAdd}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >Add Visit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchPickerModal;