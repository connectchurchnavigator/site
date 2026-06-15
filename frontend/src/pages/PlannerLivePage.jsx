import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.churchnavigator.com';

const statusIcons = {
  confirmed: '✅',
  pending: '⏳',
  declined: '🔴'
};

const statusColors = {
  confirmed: 'bg-green-50 border-green-200',
  pending: 'bg-yellow-50 border-yellow-200',
  declined: 'bg-red-50 border-red-200'
};

function PlannerLivePage() {
  const { shareToken } = useParams();
  const [trip, setTrip] = useState(null);
  const [shareLevel, setShareLevel] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    loadTrip();
    connectSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [shareToken]);

  const loadTrip = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/planner/${shareToken}/live`, { headers });
      if (!res.ok) throw new Error('Failed to load trip');
      const data = await res.json();
      setTrip(data.trip);
      setShareLevel(data.share_level);
      setViewerCount(data.viewer_count);
      detectConflicts(data.trip.itinerary);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const connectSSE = () => {
    const token = localStorage.getItem('auth_token');
    const url = `${API_BASE}/api/planner/${shareToken}/stream${token ? `?token=${token}` : ''}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'status_update') {
        handleStatusUpdate(message);
      } else if (message.type === 'ping') {
        // Keep-alive
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setTimeout(connectSSE, 5000);
    };
  };

  const handleStatusUpdate = (message) => {
    setTrip(prev => {
      if (!prev) return prev;
      const newItinerary = [...prev.itinerary];
      newItinerary[message.item_index] = message.item;
      detectConflicts(newItinerary);
      return { ...prev, itinerary: newItinerary };
    });

    const item = message.item;
    if (item.status === 'confirmed') {
      toast.success(`${item.church_name} has confirmed your visit ✅`);
    } else if (item.status === 'declined') {
      toast.error(`${item.church_name} has declined the visit`);
    }
  };

  const detectConflicts = (itinerary) => {
    const conflicts = [];
    for (let i = 0; i < itinerary.length; i++) {
      const item = itinerary[i];
      if (item.alternative_time) {
        const altDate = new Date(item.alternative_time);
        for (let j = 0; j < itinerary.length; j++) {
          if (i === j) continue;
          const otherDate = new Date(itinerary[j].datetime);
          const diff = Math.abs(altDate - otherDate) / 60000;
          if (diff < itinerary[j].duration_minutes) {
            conflicts.push({
              itemIndex: i,
              conflictIndex: j,
              item: item,
              conflictItem: itinerary[j]
            });
          }
        }
      }
    }
    setConflicts(conflicts);
  };

  const updateStatus = async (itemIndex, status, options = {}) => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API_BASE}/api/planner/${shareToken}/items/${itemIndex}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, ...options })
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (datetime) => {
    const now = new Date();
    const then = new Date(datetime);
    const diff = Math.abs(now - then) / 3600000;
    if (diff < 1) return `${Math.floor(diff * 60)}m ago`;
    if (diff < 24) return `${Math.floor(diff)}hr ago`;
    return `${Math.floor(diff / 24)}d ago`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-red-600">Error: {error}</div></div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center"><div>Trip not found</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-blue-600 text-white rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{trip.title}</h1>
              <p className="text-blue-100">👁 {trip.minister_name} + {viewerCount} viewing now</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Your access level</div>
              <div className="font-semibold capitalize">{shareLevel}</div>
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-orange-900 mb-2">⚠️ Schedule Conflicts Detected</h3>
            {conflicts.map((conflict, idx) => (
              <div key={idx} className="mb-3 p-3 bg-white rounded border border-orange-200">
                <p className="text-sm mb-2">
                  <strong>{conflict.item.church_name}</strong> proposes {formatDateTime(conflict.item.alternative_time)}
                  but conflicts with <strong>{conflict.conflictItem.church_name}</strong> at {formatDateTime(conflict.conflictItem.datetime)}
                </p>
                {shareLevel === 'coordinator' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(conflict.itemIndex, 'confirmed', { alternative_time: conflict.item.alternative_time })}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Accept (1hr buffer)
                    </button>
                    <button
                      onClick={() => updateStatus(conflict.itemIndex, 'declined', { declined_reason: 'Time conflict' })}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {trip.itinerary.map((item, idx) => (
            <div key={idx} className={`bg-white rounded-lg border-2 p-4 ${statusColors[item.status] || 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{statusIcons[item.status]}</span>
                    <h3 className="font-bold text-lg">{item.church_name}</h3>
                  </div>
                  <div className="text-gray-600 text-sm space-y-1">
                    <p>📅 {formatDateTime(item.datetime)}</p>
                    <p>⏱ {item.duration_minutes} minutes</p>
                    <p>🎯 {item.event_type}</p>
                    {item.notes && <p className="italic">💬 {item.notes}</p>}
                  </div>
                  {item.status === 'confirmed' && item.confirmed_by && (
                    <p className="text-green-700 text-sm mt-2">
                      Confirmed by {item.confirmed_by} {formatRelativeTime(item.confirmed_at)}
                    </p>
                  )}
                  {item.status === 'declined' && item.declined_reason && (
                    <p className="text-red-700 text-sm mt-2">
                      Declined: {item.declined_reason}
                    </p>
                  )}
                  {item.alternative_time && (
                    <p className="text-orange-700 text-sm mt-2">
                      Alternative proposed: {formatDateTime(item.alternative_time)}
                    </p>
                  )}
                </div>
                {shareLevel === 'host_church' && item.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(idx, 'confirmed')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for declining:');
                        if (reason) updateStatus(idx, 'declined', { declined_reason: reason });
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PlannerLivePage;
