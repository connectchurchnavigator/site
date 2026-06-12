import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlannerViewPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function PlannerViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [planner, setPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchPlanner();
  }, [id]);

  const fetchPlanner = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      const response = await axios.get(`${API_BASE}/api/planner/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanner(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load planner');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/planner/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${planner.trip_name || 'itinerary'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download PDF');
    }
  };

  const handleDownloadCalendar = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/planner/${id}/export/ical`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleShareWhatsApp = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/planner/${id}/export/whatsapp`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.open(response.data.whatsapp_url, '_blank');
    } catch (err) {
      alert('Failed to generate WhatsApp share');
    }
  };

  const handleCopyShareLink = () => {
    const shareUrl = `https://churchnavigator.com/planner/${planner.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleEdit = () => {
    navigate(`/planner/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this planner?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/api/planner/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete planner');
    }
  };

  if (loading) return <div className="planner-loading">Loading planner...</div>;
  if (error) return <div className="planner-error">{error}</div>;
  if (!planner) return <div className="planner-error">Planner not found</div>;

  const sortedItems = (planner.items || []).sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA - dateB;
  });

  return (
    <div className="planner-view-page">
      <div className="planner-header">
        <div className="planner-title-section">
          <h1>{planner.trip_name || 'Untitled Trip'}</h1>
          <p className="planner-visitor">{planner.visitor_name}</p>
          <p className="planner-dates">
            {planner.start_date} to {planner.end_date} • Base: {planner.base_location}
          </p>
        </div>
        <div className="planner-actions">
          <button onClick={handleEdit} className="btn-edit">Edit</button>
          <button onClick={handleDelete} className="btn-delete">Delete</button>
        </div>
      </div>

      <div className="planner-export-section">
        <button onClick={handleDownloadPDF} className="export-btn pdf-btn">
          📄 Download PDF
        </button>
        <button onClick={handleDownloadCalendar} className="export-btn calendar-btn">
          📅 Add to Calendar
        </button>
        <button onClick={handleShareWhatsApp} className="export-btn whatsapp-btn">
          💬 Share on WhatsApp
        </button>
        <button onClick={handleCopyShareLink} className="export-btn link-btn">
          {copySuccess ? '✓ Copied!' : '🔗 Copy Link'}
        </button>
      </div>

      {planner.overview && (
        <div className="planner-overview">
          <h2>Overview</h2>
          <p>{planner.overview}</p>
        </div>
      )}

      <div className="planner-schedule">
        <h2>Schedule</h2>
        {sortedItems.length === 0 ? (
          <p className="no-items">No items in this planner yet.</p>
        ) : (
          <div className="schedule-list">
            {sortedItems.map((item, index) => {
              const prevItem = index > 0 ? sortedItems[index - 1] : null;
              const showDate = !prevItem || prevItem.date !== item.date;
              return (
                <div key={index}>
                  {showDate && <div className="schedule-date">{item.date}</div>}
                  <div className="schedule-item">
                    <div className="schedule-time">{item.time}</div>
                    <div className="schedule-details">
                      <h3>{item.title}</h3>
                      {item.church_name && <p className="church-name">{item.church_name}</p>}
                      {item.location && <p className="location">📍 {item.location}</p>}
                      {item.pastor_name && (
                        <p className="pastor">Pastor: {item.pastor_name} {item.phone}</p>
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
    </div>
  );
}

export default PlannerViewPage;