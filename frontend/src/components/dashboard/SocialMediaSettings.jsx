import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Instagram, Facebook, Loader, CheckCircle, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SocialMediaSettings = ({ churchSlug, socialConnections }) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleConnect = (platform) => {
    window.location.href = `${API_URL}/api/social/${platform}/connect/${churchSlug}`;
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platform}?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/social/disconnect/${churchSlug}/${platform}`);
      window.location.reload();
    } catch (error) {
      alert('Error disconnecting. Please try again.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const response = await axios.post(`${API_URL}/api/social/sync/${churchSlug}`);
      setSyncResult(response.data);
    } catch (error) {
      setSyncResult({ error: 'Sync failed. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Social Media</h2>

      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Instagram className="w-6 h-6 text-pink-600" />
              <div>
                <h3 className="font-semibold">Instagram</h3>
                {socialConnections?.instagram?.connected && socialConnections.instagram.username && (
                  <p className="text-sm text-gray-600">@{socialConnections.instagram.username}</p>
                )}
              </div>
            </div>
            {socialConnections?.instagram?.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {socialConnections?.instagram?.connected ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Last synced: {formatDate(socialConnections.instagram.last_synced)}
              </div>
              <button
                onClick={() => handleDisconnect('instagram')}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnect('instagram')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
            >
              Connect Instagram
            </button>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Facebook className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold">Facebook</h3>
            </div>
            {socialConnections?.facebook?.connected ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {socialConnections?.facebook?.connected ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Last synced: {formatDate(socialConnections.facebook.last_synced)}
              </div>
              <button
                onClick={() => handleDisconnect('facebook')}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleConnect('facebook')}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Connect Facebook Page
            </button>
          )}
        </div>

        {(socialConnections?.instagram?.connected || socialConnections?.facebook?.connected) && (
          <div className="border-t pt-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {syncing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <span>Sync Posts Now</span>
              )}
            </button>

            {syncResult && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                {syncResult.error ? (
                  <p className="text-red-600">{syncResult.error}</p>
                ) : (
                  <div className="space-y-1">
                    {syncResult.instagram && <p>Instagram: {syncResult.instagram}</p>}
                    {syncResult.facebook && <p>Facebook: {syncResult.facebook}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Your social media posts are automatically synced every 6 hours. 
          You can also manually sync anytime using the button above.
        </p>
      </div>
    </div>
  );
};

export default SocialMediaSettings;