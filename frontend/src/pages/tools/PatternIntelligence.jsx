import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, AlertCircle, CheckCircle, RefreshCw, Share2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.churchnavigator.com';

const PatternIntelligence = () => {
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (bustCache = false) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('church_auth_token');
      const url = `${API_BASE}/api/tools/pattern-intelligence/${churchSlug}${bustCache ? '?refresh=1' : ''}`;
      const response = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 402) {
        setError('Premium subscription required. Upgrade to access AI Pattern Intelligence.');
      } else {
        setError(err.response?.data?.detail || 'Failed to load pattern intelligence');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [churchSlug]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleShare = () => {
    const text = data.patterns.map((p, i) => 
      `Pattern ${i+1}: ${p.pattern}\nWhy it matters: ${p.why_it_matters}\nAction: ${p.action}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    alert('Insights copied to clipboard!');
  };

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Insights</h3>
          <p className="text-red-700">{error}</p>
          {error.includes('Premium') && (
            <button className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
              Upgrade to Premium
            </button>
          )}
        </div>
      </div>
    );
  }

  const priorityColors = {
    high: 'border-red-500 bg-red-50',
    medium: 'border-yellow-500 bg-yellow-50',
    low: 'border-blue-500 bg-blue-50'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            AI Pattern Intelligence
          </h1>
          <p className="text-gray-600 mt-2">Non-obvious insights from your church data</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Share2 className="w-4 h-4" />
            Share with Team
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      {data?.metadata && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600">
          <strong>Data Period:</strong> Last 90 days | 
          <strong className="ml-4">Analyzed:</strong> {new Date(data.metadata.analyzed_at).toLocaleString()} | 
          <strong className="ml-4">Visitors:</strong> {data.metadata.visitor_count} | 
          <strong className="ml-4">Profile Views:</strong> {data.metadata.profile_views}
        </div>
      )}

      <div className="space-y-6">
        {data?.patterns?.map((pattern, index) => (
          <div
            key={index}
            className={`border-l-4 ${priorityColors[pattern.priority]} rounded-lg p-6 shadow-sm`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                    PATTERN {index + 1}
                  </span>
                  <span className={`text-xs font-semibold uppercase ${
                    pattern.priority === 'high' ? 'text-red-600' : 
                    pattern.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`}>
                    {pattern.priority} priority
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {pattern.pattern}
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Why It Matters
                </h4>
                <p className="text-gray-600">{pattern.why_it_matters}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Recommended Action
                </h4>
                <p className="text-gray-900 font-medium">{pattern.action}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About This Analysis</h3>
        <p className="text-blue-800 text-sm">
          This AI-powered analysis uses Claude Sonnet to identify patterns in your church's visitor data, 
          engagement metrics, and event performance. The insights are refreshed every 24 hours automatically, 
          or you can manually refresh to get the latest analysis based on current data.
        </p>
      </div>
    </div>
  );
};

export default PatternIntelligence;