import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FollowupQueue = ({ churchId }) => {
  const { user } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => {
    fetchFollowups();
  }, [churchId]);

  const fetchFollowups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/followups/church/${churchId}?status=pending`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      setFollowups(data);
    } catch (error) {
      console.error('Failed to fetch followups:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFollowup = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/followups/${id}/send`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      fetchFollowups();
    } catch (error) {
      alert('Failed to send followup');
    }
  };

  const updateFollowup = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/followups/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: editMessage })
        }
      );
      setEditingId(null);
      fetchFollowups();
    } catch (error) {
      alert('Failed to update followup');
    }
  };

  const dismissFollowup = async (id) => {
    if (!confirm('Dismiss this follow-up?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/followups/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      fetchFollowups();
    } catch (error) {
      alert('Failed to dismiss followup');
    }
  };

  if (loading) return <div>Loading follow-ups...</div>;
  if (followups.length === 0) return <div className="text-gray-500">No pending follow-ups</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Follow-up Needed</h3>
      {followups.map((followup) => (
        <div key={followup.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold">{followup.visitor_name}</p>
              <p className="text-sm text-gray-500">{followup.visitor_email}</p>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(followup.generated_at).toLocaleDateString()}
            </span>
          </div>
          {editingId === followup.id ? (
            <div>
              <textarea
                className="w-full border rounded p-2 mb-2"
                rows="3"
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updateFollowup(followup.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
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
                  onClick={() => sendFollowup(followup.id)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                >
                  Send Email
                </button>
                <button
                  onClick={() => {
                    setEditingId(followup.id);
                    setEditMessage(followup.message);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => dismissFollowup(followup.id)}
                  className="px-3 py-1 bg-gray-300 rounded text-sm"
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