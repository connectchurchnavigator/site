import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const FollowupQueue = ({ churchId }) => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editedMessage, setEditedMessage] = useState('');

  const fetchFollowups = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.get(
        `${API_BASE}/api/visitors/${churchId}/followup-queue`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFollowups(response.data.followups);
    } catch (err) {
      console.error('Error fetching followups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (churchId) fetchFollowups();
  }, [churchId]);

  const handleSend = async (followupId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(
        `${API_BASE}/api/visitors/followup/${followupId}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Follow-up sent successfully!');
      fetchFollowups();
    } catch (err) {
      alert('Failed to send follow-up');
      console.error(err);
    }
  };

  const handleEdit = (followup) => {
    setEditingId(followup._id);
    setEditedMessage(followup.message);
  };

  const handleSaveEdit = async (followupId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.put(
        `${API_BASE}/api/visitors/followup/${followupId}`,
        { message: editedMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      fetchFollowups();
    } catch (err) {
      alert('Failed to update message');
      console.error(err);
    }
  };

  const handleDismiss = async (followupId) => {
    if (!window.confirm('Dismiss this follow-up?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(
        `${API_BASE}/api/visitors/followup/${followupId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchFollowups();
    } catch (err) {
      alert('Failed to dismiss');
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (followups.length === 0) return <div className="text-gray-500 py-8">No pending follow-ups</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Follow-up Needed</h2>
      {followups.map((followup) => (
        <div key={followup._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-800">{followup.visitor_name}</h3>
              <p className="text-sm text-gray-500">
                {new Date(followup.generated_at).toLocaleDateString('en-GB')}
              </p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              AI Generated
            </span>
          </div>
          {editingId === followup._id ? (
            <div>
              <textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="w-full border border-gray-300 rounded p-2 mb-2"
                rows="4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveEdit(followup._id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 mb-3">{followup.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSend(followup._id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                >
                  Send Now
                </button>
                <button
                  onClick={() => handleEdit(followup)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDismiss(followup._id)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FollowupQueue;
