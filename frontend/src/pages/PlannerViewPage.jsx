import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/PlannerView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function PlannerViewPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [optimising, setOptimising] = useState(false);
  const [optimisedData, setOptimisedData] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showOriginal, setShowOriginal] = useState(false);
  const [travelTimes, setTravelTimes] = useState({});
  const [loadingTimes, setLoadingTimes] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    if (trip?.itinerary?.length > 0) {
      loadTravelTimes();
    }
  }, [trip]);

  const fetchTrip = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/planner/${tripId}`);
      const data = await response.json();
      setTrip(data);
    } catch (error) {
      console.error('Failed to fetch trip:', error);
    }
  };

  const loadTravelTimes = async () => {
    if (!trip?.itinerary) return;
    setLoadingTimes(true);
    const times = {};
    
    for (let i = 0; i < trip.itinerary.length - 1; i++) {
      const from = trip.itinerary[i];
      const to = trip.itinerary[i + 1];
      
      try {
        const response = await fetch(
          `${API_BASE}/api/planner/travel-time?lat1=${from.lat}&lng1=${from.lng}&lat2=${to.lat}&lng2=${to.lng}`
        );
        const data = await response.json();
        times[`${i}-${i+1}`] = data;
      } catch (error) {
        times[`${i}-${i+1}`] = { duration_minutes: 0, distance_km: 0, maps_url: '' };
      }
    }
    
    setTravelTimes(times);
    setLoadingTimes(false);
  };

  const optimiseRoute = async () => {
    setOptimising(true);
    try {
      const locations = trip.itinerary.map((item, idx) => ({
        item_id: item.id || `item-${idx}`,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        start_time: item.start_time,
        end_time: item.end_time,
        is_flexible: item.is_flexible !== false,
        day: item.day || 1
      }));

      const response = await fetch(`${API_BASE}/api/planner/${tripId}/optimise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations })
      });

      const data = await response.json();
      setOptimisedData(data);
    } catch (error) {
      console.error('Optimisation failed:', error);
      alert('Failed to optimise route');
    } finally {
      setOptimising(false);
    }
  };

  const applyOptimisation = () => {
    const newItinerary = [];
    optimisedData.optimised_itinerary.forEach(day => {
      newItinerary.push(...day.items);
    });
    setTrip({ ...trip, itinerary: newItinerary });
    setOptimisedData(null);
    loadTravelTimes();
  };

  const renderTravelSegment = (fromIdx, toIdx) => {
    const key = `${fromIdx}-${toIdx}`;
    const travel = travelTimes[key];
    if (!travel) return null;

    return (
      <div className="travel-segment">
        <div className="travel-icon">🚗</div>
        <div className="travel-info">
          <span className="travel-time">{travel.duration_minutes} min drive</span>
          <span className="travel-distance">({travel.distance_km} km)</span>
          {travel.maps_url && (
            <a href={travel.maps_url} target="_blank" rel="noopener noreferrer" className="travel-link">
              Google Maps →
            </a>
          )}
        </div>
      </div>
    );
  };

  const renderMapView = () => {
    const itinerary = showOriginal && optimisedData 
      ? optimisedData.original_itinerary.flatMap(d => d.items)
      : optimisedData 
      ? optimisedData.optimised_itinerary.flatMap(d => d.items)
      : trip.itinerary;

    if (!itinerary?.length) return null;

    const bounds = itinerary.map(item => [item.lat, item.lng]);
    const center = [
      bounds.reduce((sum, b) => sum + b[0], 0) / bounds.length,
      bounds.reduce((sum, b) => sum + b[1], 0) / bounds.length
    ];

    return (
      <MapContainer center={center} zoom={10} style={{ height: '500px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {itinerary.map((item, idx) => (
          <Marker key={idx} position={[item.lat, item.lng]}>
            <Popup>
              <strong>{idx + 1}. {item.name}</strong>
              {item.start_time && <div>{item.start_time}</div>}
            </Popup>
          </Marker>
        ))}
        <Polyline positions={bounds} color={showOriginal ? "red" : "blue"} weight={3} />
      </MapContainer>
    );
  };

  if (!trip) return <div className="loading">Loading trip...</div>;

  return (
    <div className="planner-view-page">
      <header className="planner-header">
        <h1>{trip.name}</h1>
        <button onClick={optimiseRoute} disabled={optimising} className="btn-optimise">
          {optimising ? 'Optimising...' : '✨ Optimise My Route'}
        </button>
      </header>

      {optimisedData && (
        <div className="optimisation-result">
          <div className="comparison-card">
            <h2>Route Optimisation Complete!</h2>
            <p className="explanation">{optimisedData.explanation}</p>
            
            <div className="comparison-stats">
              <div className="stat">
                <span className="label">Before:</span>
                <span className="value">
                  {optimisedData.original_itinerary.reduce((sum, d) => sum + d.total_driving_minutes, 0)} min
                </span>
              </div>
              <div className="stat">
                <span className="label">After:</span>
                <span className="value">
                  {optimisedData.optimised_itinerary.reduce((sum, d) => sum + d.total_driving_minutes, 0)} min
                </span>
              </div>
              <div className="stat saved">
                <span className="label">Saved:</span>
                <span className="value">✅ {optimisedData.time_saved_minutes} min</span>
              </div>
            </div>

            <div className="changes-made">
              <h3>Changes Made:</h3>
              <ul>
                {optimisedData.changes_made.map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
            </div>

            <div className="action-buttons">
              <button onClick={applyOptimisation} className="btn-apply">Apply Changes</button>
              <button onClick={() => setOptimisedData(null)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="view-toggle">
        <button 
          className={viewMode === 'list' ? 'active' : ''} 
          onClick={() => setViewMode('list')}
        >
          📋 List View
        </button>
        <button 
          className={viewMode === 'map' ? 'active' : ''} 
          onClick={() => setViewMode('map')}
        >
          🗺️ Map View
        </button>
        {optimisedData && (
          <label className="show-original">
            <input 
              type="checkbox" 
              checked={showOriginal} 
              onChange={(e) => setShowOriginal(e.target.checked)} 
            />
            Show Original
          </label>
        )}
      </div>

      {viewMode === 'map' ? (
        renderMapView()
      ) : (
        <div className="itinerary-list">
          {trip.itinerary.map((item, idx) => (
            <React.Fragment key={idx}>
              <div className="itinerary-item">
                <div className="item-number">{idx + 1}</div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  {item.start_time && <p className="item-time">🕒 {item.start_time}</p>}
                  {!item.is_flexible && <span className="badge-fixed">Fixed Time</span>}
                </div>
              </div>
              {idx < trip.itinerary.length - 1 && renderTravelSegment(idx, idx + 1)}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlannerViewPage;
