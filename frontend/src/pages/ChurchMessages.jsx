import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

export default function ChurchMessages() {
  const { churchId } = useParams();
  const [activeTab, setActiveTab] = useState('broadcast');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [devotionalSettings, setDevotionalSettings] = useState({
    enabled: false,
    send_time: '07:00',
    language: 'en'
  });

  useEffect(() => {
    loadStats();
  }, [churchId]);

  const loadStats = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/whatsapp/stats/${churchId}`);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const sendBroadcast = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/whatsapp/broadcast/${churchId}`, {
        church_id: churchId,
        message: message
      });
      alert(`Broadcast sent to ${data.sent_count} followers!`);
      setMessage('');
      loadStats();
    } catch (error) {
      alert('Failed to send broadcast: ' + error.message);
    }
    setLoading(false);
  };

  const updateDevotionalSettings = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/whatsapp/devotional/schedule`, {
        church_id: churchId,
        ...devotionalSettings
      });
      alert('Devotional settings updated!');
    } catch (error) {
      alert('Failed to update settings: ' + error.message);
    }
    setLoading(false);
  };

  const sendTestDevotional = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/whatsapp/devotional/send/${churchId}`);
      alert(`Devotional sent to ${data.sent_count} followers!`);
      loadStats();
    } catch (error) {
      alert('Failed to send devotional: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Messages</h1>
        <p className="text-gray-600 mb-6">Send broadcasts and manage daily devotionals</p>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.opted_in_followers}</div>
              <div className="text-sm text-gray-600">WhatsApp Subscribers</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{stats.total_broadcasts}</div>
              <div className="text-sm text-gray-600">Total Broadcasts</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{stats.total_devotionals}</div>
              <div className="text-sm text-gray-600">Devotionals Sent</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'broadcast'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Broadcast
              </button>
              <button
                onClick={() => setActiveTab('devotional')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'devotional'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Daily Devotional
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'broadcast' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your message here..."
                />
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-500">
                    {message.length} characters
                  </span>
                  <button
                    onClick={sendBroadcast}
                    disabled={loading || !message.trim()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send Broadcast'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'devotional' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="devotional-enabled"
                    checked={devotionalSettings.enabled}
                    onChange={(e) =>
                      setDevotionalSettings({ ...devotionalSettings, enabled: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600"
                  />
                  <label htmlFor="devotional-enabled" className="font-medium">
                    Enable Daily Devotional
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Send Time
                  </label>
                  <input
                    type="time"
                    value={devotionalSettings.send_time}
                    onChange={(e) =>
                      setDevotionalSettings({ ...devotionalSettings, send_time: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={devotionalSettings.language}
                    onChange={(e) =>
                      setDevotionalSettings({ ...devotionalSettings, language: e.target.value })
                    }
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={updateDevotionalSettings}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                  <button
                    onClick={sendTestDevotional}
                    disabled={loading}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                  >
                    Send Test Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {stats?.recent_broadcasts?.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Recent Broadcasts</h2>
              <div className="space-y-3">
                {stats.recent_broadcasts.map((broadcast, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="text-sm text-gray-600">{broadcast.phone}</div>
                      <div className="text-xs text-gray-500">{broadcast.message_preview}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          broadcast.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {broadcast.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(broadcast.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
