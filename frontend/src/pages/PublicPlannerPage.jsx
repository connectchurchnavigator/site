import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './PublicPlannerPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function PublicPlannerPage() {
  const { shareToken } = useParams();
  const [planner, setPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPublicPlanner();
  }, [shareToken]);

  const fetchPublicPlanner = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/planner/share/${shareToken}`);
      setPlanner(response.data);
    } catch (err) {
      setError('Planner not found or link expired');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCalendar = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/planner/${planner._id}/export/ical`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${planner.trip_name || 'itinerary'}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download calendar');
    }
  };

  if (loading) return <div className="public-planner-loading">Loading itinerary...</div>;
  if (error) return <div className="public-planner-error">{error}</div>;
  if (!planner) return <div className="public-planner-error">Itinerary not found</div>;

  const sortedItems = (planner.items || []).sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  return (
    <div className="public-planner-page">
      <div className="public-planner-header">
        <div className="brand">ChurchNavigator</div>
        <h1>{planner.trip_name || 'UK Trip Itinerary'}</h1>
        <p className="visitor-name">{planner.visitor_name}</p>
        <p className="trip-dates">
          {planner.start_date} to {planner.end_date} • Base: {planner.base_location}
        </p>
      </div>

      <div className="public-actions">
        <button onClick={handleDownloadCalendar} className="public-btn calendar-btn">
          📅 Add to My Calendar
        </button>
        {planner.coordinator_name && (
          <a href={`mailto:${planner.coordinator_email}`} className="public-btn contact-btn">
            ✉️ Contact Coordinator
          </a>
        )}
      </div>

      {planner.overview && (
        <div className="public-overview">
          <h2>Overview</h2>
          <p>{planner.overview}</p>
        </div>
      )}

      <div className="public-schedule">
        <h2>Schedule</h2>
        {sortedItems.length === 0 ? (
          <p className="no-items">No schedule items available.</p>
        ) : (
          <div className="public-schedule-list">
            {sortedItems.map((item, index) => {
              const prevItem = index > 0 ? sortedItems[index - 1] : null;
              const showDate = !prevItem || prevItem.date !== item.date;
              return (
                <div key={index}>
                  {showDate && <div className="public-schedule-date">{item.date}</div>}
                  <div className="public-schedule-item">
                    <div className="public-schedule-time">{item.time}</div>
                    <div className="public-schedule-details">
                      <h3>{item.title}</h3>
                      {item.church_name && <p className="church-name">{item.church_name}</p>}
                      {item.location && <p className="location">📍 {item.location}</p>}
                      {item.pastor_name && (
                        <p className="pastor">Pastor: {item.pastor_name}</p>
                      )}
                      {item.description && <p className="description">{item.description}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="public-footer">
        <p>Powered by <a href="https://churchnavigator.com" target="_blank" rel="noopener noreferrer">ChurchNavigator</a></p>
        <p>UK's Leading Church Directory</p>
      </div>
    </div>
  );
}

export default PublicPlannerPage;