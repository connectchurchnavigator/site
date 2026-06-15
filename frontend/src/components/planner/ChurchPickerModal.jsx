import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, MapPin, Users, Calendar, Filter, Map as MapIcon, List, Globe } from 'lucide-react';
import { debounce } from 'lodash';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LANGUAGE_GROUPS = {
  'African': ['Yoruba', 'Igbo', 'Twi', 'Akan', 'Ga', 'Ewe', 'Hausa', 'Amharic', 'Tigrinya', 'Somali', 'Swahili', 'Zulu', 'Xhosa', 'Shona', 'Ndebele', 'Lingala', 'Wolof'],
  'South Asian': ['Telugu', 'Tamil', 'Malayalam', 'Hindi', 'Urdu', 'Punjabi', 'Gujarati', 'Sinhala', 'Bengali'],
  'East/Southeast Asian': ['Mandarin', 'Cantonese', 'Korean', 'Filipino', 'Tagalog', 'Vietnamese', 'Indonesian'],
  'European': ['Portuguese', 'Spanish', 'Polish', 'Romanian', 'French'],
  'Middle Eastern': ['Arabic', 'Persian', 'Farsi', 'Aramaic']
};

const CULTURAL_CONTEXT = {
  'Telugu': 'Telugu congregations typically appreciate extended worship and prophetic ministry. Consider preparing in Telugu if possible -- even a greeting or scripture will be deeply appreciated.',
  'Yoruba': 'Yoruba services often feature vibrant praise and worship with drums. Respectful greetings in Yoruba ("E kaaro" - good morning) are highly valued.',
  'Tamil': 'Tamil congregations value theological depth and traditional hymns alongside contemporary worship. Family-oriented messages resonate well.',
  'Malayalam': 'Keralite Christian community is deeply rooted in faith. Services blend liturgical elements with charismatic worship.',
  'Igbo': 'Igbo churches emphasize prosperity teaching and spiritual warfare. High-energy worship with testimony sharing is common.',
  'Twi': 'Ghanaian churches value punctuality and formal respect. Traditional kente cloth worn for special services.',
  'Mandarin': 'Chinese congregations appreciate structured teaching and practical application. Services typically bilingual with English.',
  'Polish': 'Polish Catholic/Protestant communities value Marian devotion and traditional European liturgy.',
  'Portuguese': 'Brazilian and Portuguese communities bring passionate worship. Messages on hope and breakthrough resonate.',
  'Filipino': 'Filipino congregations are known for hospitality and love of singing. Family and community themes are central.'
};

export default function ChurchPickerModal({ isOpen, onClose, tripId, onChurchAdded }) {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  
  const [filters, setFilters] = useState({
    city: '',
    denomination: '',
    size: '',
    language: '',
    openToVisits: null,
    serviceDay: ''
  });
  
  const [slotData, setSlotData] = useState({
    dayNumber: 1,
    timeSlot: 'morning',
    visitType: 'Sunday Service',
    notes: ''
  });

  const searchChurches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.city) params.append('city', filters.city);
      if (filters.denomination) params.append('denomination', filters.denomination);
      if (filters.size) params.append('size', filters.size);
      if (filters.language) params.append('language', filters.language);
      if (filters.openToVisits !== null) params.append('open_to_visits', filters.openToVisits);
      if (filters.serviceDay) params.append('service_day', filters.serviceDay);
      if (tripId) params.append('trip_id', tripId);
      
      const response = await fetch(`/api/planner/church-picker?${params}`);
      const data = await response.json();
      setChurches(data.churches || []);
    } catch (error) {
      console.error('Error searching churches:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, tripId]);

  const debouncedSearch = useCallback(debounce(searchChurches, 300), [searchChurches]);

  useEffect(() => {
    if (isOpen) {
      debouncedSearch();
    }
  }, [isOpen, debouncedSearch]);

  const handleAddChurch = (church) => {
    setSelectedChurch(church);
    setShowSlotPicker(true);
  };

  const handleConfirmSlot = async () => {
    try {
      const response = await fetch(`/api/planner/trips/${tripId}/add-church`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_id: selectedChurch.id,
          slot: slotData
        })
      });
      
      if (response.ok) {
        onChurchAdded?.();
        setShowSlotPicker(false);
        setSelectedChurch(null);
        alert('Church added to trip! Send visit request?');
      }
    } catch (error) {
      console.error('Error adding church:', error);
    }
  };

  if (!isOpen) return null;

  const culturalNote = filters.language && CULTURAL_CONTEXT[filters.language] ? (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900 mb-1">Cultural Context: {filters.language}</p>
          <p className="text-sm text-blue-800">{CULTURAL_CONTEXT[filters.language]}</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-xl font-bold">Add Church to Trip</h2>
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search church name, city, or pastor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {viewMode === 'list' ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {showFilters && (
            <div className="w-64 border-r p-4 overflow-y-auto">
              <h3 className="font-semibold mb-3">Filters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City/Region</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    className="w-full border rounded p-2"
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

                <div>
                  <label className="block text-sm font-medium mb-1">Denomination</label>
                  <select
                    value={filters.denomination}
                    onChange={(e) => setFilters({...filters, denomination: e.target.value})}
                    className="w-full border rounded p-2"
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

                <div>
                  <label className="block text-sm font-medium mb-1">Congregation Size</label>
                  <select
                    value={filters.size}
                    onChange={(e) => setFilters({...filters, size: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    <option value="">All Sizes</option>
                    <option value="Small">Small (&lt;100)</option>
                    <option value="Medium">Medium (100-500)</option>
                    <option value="Large">Large (500-1000)</option>
                    <option value="Mega">Mega (1000+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <select
                    value={filters.language}
                    onChange={(e) => setFilters({...filters, language: e.target.value})}
                    className="w-full border rounded p-2"
                  >
                    <option value="">All Languages</option>
                    {Object.entries(LANGUAGE_GROUPS).map(([group, langs]) => (
                      <optgroup key={group} label={group}>
                        {langs.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.openToVisits === true}
                      onChange={(e) => setFilters({...filters, openToVisits: e.target.checked ? true : null})}
                      className="rounded"
                    />
                    <span className="text-sm">Open to Visits Only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {culturalNote}
            
            {loading ? (
              <div className="text-center py-8">Loading churches...</div>
            ) : viewMode === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {churches.map(church => (
                  <div key={church.id} className="border rounded-lg p-4 hover:shadow-lg transition">
                    <div className="flex gap-3">
                      {church.image_url && (
                        <img
                          src={church.image_url}
                          alt={church.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{church.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{church.city}</span>
                          {church.distance_miles && (
                            <span className="text-xs">• {church.distance_miles}mi</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {church.denomination && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {church.denomination}
                            </span>
                          )}
                          {church.congregation_size && (
                            <span className="text-xs bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {church.congregation_size}
                            </span>
                          )}
                          {church.open_to_visits && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Open to Visits
                            </span>
                          )}
                          {church.match_score && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              Match: {church.match_score}%
                            </span>
                          )}
                        </div>
                        {church.languages.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                            <Globe className="w-3 h-3" />
                            <span>{church.languages.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddChurch(church)}
                      className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Add to Trip
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <MapContainer
                center={[52.5, -1.5]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {churches.filter(c => c.lat && c.lng).map(church => (
                  <Marker key={church.id} position={[church.lat, church.lng]}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{church.name}</p>
                        <p className="text-gray-600">{church.city}</p>
                        {church.open_to_visits && (
                          <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mt-1">
                            Open to Visits
                          </span>
                        )}
                        <button
                          onClick={() => handleAddChurch(church)}
                          className="w-full mt-2 bg-blue-600 text-white py-1 px-2 rounded text-xs"
                        >
                          Add to Trip
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      </div>

      {showSlotPicker && selectedChurch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Add {selectedChurch.name} to Trip</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Which day?</label>
                <input
                  type="number"
                  min="1"
                  value={slotData.dayNumber}
                  onChange={(e) => setSlotData({...slotData, dayNumber: parseInt(e.target.value)})}
                  className="w-full border rounded p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">What time?</label>
                <select
                  value={slotData.timeSlot}
                  onChange={(e) => setSlotData({...slotData, timeSlot: e.target.value})}
                  className="w-full border rounded p-2"
                >
                  <option value="morning">Morning (9-12)</option>
                  <option value="afternoon">Afternoon (12-5)</option>
                  <option value="evening">Evening (5-9)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Visit type?</label>
                <select
                  value={slotData.visitType}
                  onChange={(e) => setSlotData({...slotData, visitType: e.target.value})}
                  className="w-full border rounded p-2"
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
                  onChange={(e) => setSlotData({...slotData, notes: e.target.value})}
                  className="w-full border rounded p-2 h-20"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSlotPicker(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSlot}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Add Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}