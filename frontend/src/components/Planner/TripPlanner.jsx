import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TripPlanner = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [churches, setChurches] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    church_id: '',
    visit_date: '',
    visit_time: '10:00',
    duration_minutes: 120,
    message: ''
  });

  useEffect(() => {
    loadTrip();
    loadChurches();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const response = await api.get(`/planner/trips/${tripId}`);
      setTrip(response.data.trip);
    } catch (error) {
      console.error('Failed to load trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChurches = async () => {
    try {
      const response = await api.get('/churches');
      setChurches(response.data.churches);
    } catch (error) {
      console.error('Failed to load churches:', error);
    }
  };

  const addItineraryItem = async () => {
    try {
      await api.post(`/planner/trips/${tripId}/itinerary`, newItem);
      setShowAddItem(false);
      setNewItem({
        church_id: '',
        visit_date: '',
        visit_time: '10:00',
        duration_minutes: 120,
        message: ''
      });
      loadTrip();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add itinerary item');
    }
  };

  const sendRequests = async () => {
    if (!window.confirm(`Send visit requests to ${trip.itinerary.length} churches?`)) {
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/planner/trips/${tripId}/send-requests`);
      alert(`Sent ${response.data.requests_sent} requests successfully!`);
      if (response.data.errors.length > 0) {
        console.error('Errors:', response.data.errors);
      }
      loadTrip();
    } catch (error) {
      console.error('Failed to send requests:', error);
      alert('Failed to send requests');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      not_sent: { color: 'gray', icon: '○', text: 'Not Sent' },
      pending: { color: 'yellow', icon: '●', text: 'Request Sent' },
      confirmed: { color: 'green', icon: '✓', text: 'Confirmed' },
      declined: { color: 'red', icon: '✗', text: 'Declined' },
      alternative: { color: 'blue', icon: '↻', text: 'Alternative Offered' }
    };
    const badge = badges[status] || badges.not_sent;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${badge.color}-100 text-${badge.color}-800`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const getChurchName = (churchId) => {
    const church = churches.find(c => c._id === churchId);
    return church?.name || 'Unknown Church';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button onClick={() => navigate('/planner')} className="text-blue-600 hover:text-blue-800 mb-4">
          ← Back to Trips
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Visitor</p>
            <p className="font-medium">{trip.visitor_name}</p>
            <p className="text-sm text-gray-600">{trip.visitor_role} from {trip.visitor_from}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Coordinator</p>
            <p className="font-medium">{trip.coordinator_name}</p>
            <p className="text-sm text-gray-600">{trip.coordinator_email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Trip Dates</p>
            <p className="font-medium">{trip.start_date} to {trip.end_date}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-medium capitalize">{trip.status.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Itinerary</h2>
          <div className="space-x-2">
            <button
              onClick={() => setShowAddItem(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Church Visit
            </button>
            {trip.itinerary.length > 0 && trip.status === 'draft' && (
              <button
                onClick={sendRequests}
                disabled={sending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {sending ? 'Sending...' : `📧 Send ${trip.itinerary.length} Requests`}
              </button>
            )}
          </div>
        </div>

        {trip.itinerary.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No visits scheduled yet. Add your first church visit above.</p>
        ) : (
          <div className="space-y-4">
            {trip.itinerary.map((item, index) => (
              <div key={item.item_id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {index + 1}. {getChurchName(item.church_id)}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      📅 {new Date(item.visit_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-gray-600">
                      🕒 {item.visit_time} ({item.duration_minutes} minutes)
                    </p>
                    {item.message && (
                      <p className="text-gray-700 mt-2 bg-blue-50 p-2 rounded">
                        💬 {item.message}
                      </p>
                    )}
                    {item.alternative_date && (
                      <p className="text-blue-600 mt-2">
                        ↻ Alternative suggested: {item.alternative_date} at {item.alternative_time}
                      </p>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(item.request_status || 'not_sent')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Add Church Visit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Church</label>
                <select
                  value={newItem.church_id}
                  onChange={(e) => setNewItem({ ...newItem, church_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a church...</option>
                  {churches.map(church => (
                    <option key={church._id} value={church._id}>{church.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
                <input
                  type="date"
                  value={newItem.visit_date}
                  onChange={(e) => setNewItem({ ...newItem, visit_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Time</label>
                <input
                  type="time"
                  value={newItem.visit_time}
                  onChange={(e) => setNewItem({ ...newItem, visit_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={newItem.duration_minutes}
                  onChange={(e) => setNewItem({ ...newItem, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
                <textarea
                  value={newItem.message}
                  onChange={(e) => setNewItem({ ...newItem, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Special requests or notes for the church..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={addItineraryItem}
                  disabled={!newItem.church_id || !newItem.visit_date}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Add Visit
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlanner;
