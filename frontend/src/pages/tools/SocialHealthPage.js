import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SocialHealthPage = () => {
  const { listingId } = useParams();
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [listingId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tools/social/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load social stats');
    } finally {
      setLoading(false);
    }
  };

  const syncStats = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/tools/social/${listingId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchStats();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const analyseStats = async () => {
    try {
      setAnalysing(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/tools/social/${listingId}/analyse`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyse');
    } finally {
      setAnalysing(false);
    }
  };

  if (loading) return <div className="container mx-auto p-8">Loading...</div>;
  if (error) return <div className="container mx-auto p-8 text-red-600">{error}</div>;
  if (!stats) return <div className="container mx-auto p-8">No social data found</div>;

  const totalFollowers = (
    (stats.facebook?.followers || 0) +
    (stats.instagram?.followers || 0) +
    (stats.youtube?.subscribers || 0) +
    (stats.twitter?.followers || 0) +
    (stats.whatsapp?.group_size || 0)
  );

  const platformData = {
    labels: ['Facebook', 'Instagram', 'YouTube', 'Twitter', 'WhatsApp'],
    datasets: [{
      label: 'Followers',
      data: [
        stats.facebook?.followers || 0,
        stats.instagram?.followers || 0,
        stats.youtube?.subscribers || 0,
        stats.twitter?.followers || 0,
        stats.whatsapp?.group_size || 0
      ],
      backgroundColor: ['#1877F2', '#E4405F', '#FF0000', '#1DA1F2', '#25D366']
    }]
  };

  const growthData = {
    labels: Array.from({ length: 90 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: 'Facebook',
        data: Array.from({ length: 90 }, () => Math.floor(Math.random() * 100)),
        borderColor: '#1877F2',
        backgroundColor: 'transparent'
      },
      {
        label: 'Instagram',
        data: Array.from({ length: 90 }, () => Math.floor(Math.random() * 100)),
        borderColor: '#E4405F',
        backgroundColor: 'transparent'
      },
      {
        label: 'YouTube',
        data: Array.from({ length: 90 }, () => Math.floor(Math.random() * 100)),
        borderColor: '#FF0000',
        backgroundColor: 'transparent'
      }
    ]
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Social Media Health</h1>
        <button
          onClick={syncStats}
          disabled={syncing}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Facebook</span>
            <span className="text-2xl">📘</span>
          </div>
          <p className="text-2xl font-bold">{stats.facebook?.followers?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500">{stats.facebook?.reach_this_month?.toLocaleString() || 0} reach</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Instagram</span>
            <span className="text-2xl">📷</span>
          </div>
          <p className="text-2xl font-bold">{stats.instagram?.followers?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500">{stats.instagram?.engagement_rate || 0}% engagement</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">YouTube</span>
            <span className="text-2xl">📺</span>
          </div>
          <p className="text-2xl font-bold">{stats.youtube?.subscribers?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500">{stats.youtube?.views_this_month?.toLocaleString() || 0} views</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Twitter</span>
            <span className="text-2xl">🐦</span>
          </div>
          <p className="text-2xl font-bold">{stats.twitter?.followers?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500">{stats.twitter?.impressions_this_month?.toLocaleString() || 0} impressions</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">WhatsApp</span>
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-2xl font-bold">{stats.whatsapp?.group_size?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500">members</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Total Reach</h2>
        <p className="text-4xl font-bold text-blue-600">{totalFollowers.toLocaleString()}</p>
        <p className="text-gray-500">followers across all platforms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Platform Comparison</h2>
          <Bar data={platformData} options={{ responsive: true }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">90-Day Growth</h2>
          <Line data={growthData} options={{ responsive: true }} />
        </div>
      </div>

      {analysis && (
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4">AI Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded">
              <p className="font-semibold text-green-800">Best Platform</p>
              <p className="text-lg">{analysis.best_platform}</p>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <p className="font-semibold text-red-800">Needs Improvement</p>
              <p className="text-lg">{analysis.weakest_platform}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <p className="font-semibold text-blue-800">Best Time to Post</p>
              <p className="text-lg">{analysis.best_time}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <p className="font-semibold text-purple-800">Top Recommendation</p>
              <p className="text-lg">{analysis.recommendation}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border rounded">
              <p className="font-semibold text-green-600 mb-2">✅ Top Performing Post</p>
              <p className="text-sm text-gray-600">{analysis.top_post?.platform}</p>
              <p className="mt-2">{analysis.top_post?.text}</p>
              <p className="text-sm text-gray-500 mt-2">Why: {analysis.top_post?.why}</p>
            </div>
            <div className="p-4 border rounded">
              <p className="font-semibold text-red-600 mb-2">❌ Lowest Performing Post</p>
              <p className="text-sm text-gray-600">{analysis.worst_post?.platform}</p>
              <p className="mt-2">{analysis.worst_post?.text}</p>
              <p className="text-sm text-gray-500 mt-2">Why: {analysis.worst_post?.why}</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={analyseStats}
        disabled={analysing}
        className="w-full bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700 disabled:opacity-50"
      >
        {analysing ? 'Analysing with AI...' : '🤖 Get AI Analysis'}
      </button>
    </div>
  );
};

export default SocialHealthPage;
