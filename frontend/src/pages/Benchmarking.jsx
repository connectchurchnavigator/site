import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const Benchmarking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.church_slug) return;
      
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_URL}/api/tools/benchmarking/${user.church_slug}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setData(response.data);
        setError(null);
      } catch (err) {
        if (err.response?.status === 402) {
          setError('Premium subscription required');
        } else {
          setError(err.response?.data?.detail || 'Failed to load benchmarking data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading benchmarking data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Access Restricted</h3>
            <p className="text-red-600 mb-4">{error}</p>
            {error.includes('Premium') && (
              <button
                onClick={() => navigate('/pricing')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const peerGroup = data?.peer_group || {};
  const highlights = data?.highlights || [];
  const improvements = data?.improvements || [];

  const metricLabels = {
    profile_views: 'Profile Views',
    follower_count: 'Followers',
    review_rating: 'Review Rating',
    event_frequency: 'Events/Month',
    visitor_return_rate: 'Return Rate %',
    response_rate: 'Response Rate %'
  };

  const radarData = {
    labels: Object.keys(metrics).map(k => metricLabels[k] || k),
    datasets: [
      {
        label: 'Your Church',
        data: Object.values(metrics).map(m => m.your_percentile),
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2
      },
      {
        label: 'Peer Average (50th percentile)',
        data: Array(Object.keys(metrics).length).fill(50),
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderColor: 'rgba(156, 163, 175, 1)',
        borderWidth: 1,
        borderDash: [5, 5]
      }
    ]
  };

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Network Benchmarking</h1>
          <p className="text-gray-600 mt-2">
            Compared to {peerGroup.count} {peerGroup.denomination} churches in {peerGroup.region}
            {peerGroup.size_range && ` (size: ${peerGroup.size_range})`}
          </p>
        </div>

        {highlights.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {highlights.map((h, index) => (
              <div key={index} className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-sm text-green-700 font-medium">{metricLabels[h.metric]}</div>
                    <div className="text-2xl font-bold text-green-900">Top {Math.round(100 - h.percentile)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Radar</h2>
          <div className="max-w-2xl mx-auto">
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Detailed Metrics</h2>
          <div className="space-y-4">
            {Object.entries(metrics).map(([key, metric]) => {
              const isStrong = metric.your_percentile >= 75;
              const isWeak = metric.your_percentile < 50;
              
              return (
                <div key={key} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{metricLabels[key]}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isStrong ? 'bg-green-100 text-green-800' :
                      isWeak ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {metric.your_percentile}th percentile
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Your Value</div>
                      <div className="text-lg font-bold text-gray-900">{metric.your_value}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Peer Average</div>
                      <div className="text-lg font-medium text-gray-700">{metric.peer_average}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Top 25%</div>
                      <div className="text-lg font-medium text-gray-700">{metric.peer_top_25pct}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Trend</div>
                      <div className="text-lg font-medium">
                        {metric.trend === 'up' && <span className="text-green-600">↑ Up</span>}
                        {metric.trend === 'down' && <span className="text-red-600">↓ Down</span>}
                        {metric.trend === 'stable' && <span className="text-gray-600">→ Stable</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {improvements.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Areas to Improve</h2>
            <div className="space-y-3">
              {improvements.map((imp, index) => (
                <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{metricLabels[imp.metric]}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        You're at {imp.percentile}th percentile. Peer average: {imp.peer_avg}
                      </p>
                    </div>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
                      Get Tips
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Benchmarking;