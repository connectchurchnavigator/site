import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SocialSettings = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/churches/${slug}`);
      setChurch(response.data);
    } catch (error) {
      console.error('Error fetching church:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    window.location.href = `${API_BASE}/api/social/${platform}/connect/${slug}`;
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Disconnect ${platform}? Your posts will be removed from your church page.`)) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/social/disconnect/${slug}/${platform}`);
      fetchChurch();
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.get(`${API_BASE}/api/social/sync/${slug}`);
      alert('Social feeds synced successfully!');
      fetchChurch();
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Failed to sync. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const instagram = church?.social_connections?.instagram || {};
  const facebook = church?.social_connections?.facebook || {};

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Social Media Settings</h2>
      <p className="text-gray-600 mb-8">
        Connect your church's social media accounts to display recent posts on your church page.
        All posts are synced automatically every 6 hours.
      </p>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Instagram</h3>
              {instagram.connected && (
                <p className="text-sm text-gray-600 mt-1">@{instagram.username}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {instagram.connected ? (
                <>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect('instagram')}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect('instagram')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded hover:from-purple-700 hover:to-pink-700 transition"
                >
                  Connect Instagram
                </button>
              )}
            </div>
          </div>
          {instagram.connected && instagram.last_synced && (
            <p className="text-sm text-gray-500">
              Last synced: {new Date(instagram.last_synced).toLocaleString()}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Facebook</h3>
              {facebook.connected && (
                <p className="text-sm text-gray-600 mt-1">Page ID: {facebook.page_id}</p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {facebook.connected ? (
                <>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Connected
                  </span>
                  <button
                    onClick={() => handleDisconnect('facebook')}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect('facebook')}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Connect Facebook
                </button>
              )}
            </div>
          </div>
          {facebook.connected && facebook.last_synced && (
            <p className="text-sm text-gray-500">
              Last synced: {new Date(facebook.last_synced).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {(instagram.connected || facebook.connected) && (
        <div className="mt-8">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <p className="text-sm text-gray-500 text-center mt-2">
            Normally syncs automatically every 6 hours
          </p>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Connect your Instagram or Facebook account using OAuth</li>
          <li>Your recent posts are displayed on your church page</li>
          <li>Posts sync automatically every 6 hours</li>
          <li>Visitors can click posts to view them on Instagram/Facebook</li>
          <li>Completely free - no paid API tiers required</li>
        </ul>
      </div>
    </div>
  );
};

export default SocialSettings;