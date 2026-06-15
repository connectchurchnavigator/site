import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, AlertCircle, RefreshCw, Share2, Lock } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function PatternIntelligence() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [churchSlug]);

  const loadAnalysis = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(
        `${API_BASE}/api/tools/pattern-intelligence/${churchSlug}`,
        { force_refresh: forceRefresh },
        { withCredentials: true }
      );
      setAnalysis(response.data);
    } catch (err) {
      if (err.response?.status === 402) {
        setRequiresUpgrade(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to load analysis');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalysis(true);
  };

  const handleShare = () => {
    const text = `AI Pattern Intelligence for ${analysis?.data_summary?.church_name}\n\n${analysis?.patterns?.map((p, i) => `${i + 1}. ${p.title}\n${p.pattern}`).join('\n\n')}`;
    if (navigator.share) {
      navigator.share({ title: 'Church Pattern Intelligence', text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Analysis copied to clipboard');
    }
  };

  if (requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Lock className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            AI Pattern Intelligence is available on our Premium plan (£19/month).
            Unlock deep insights about your church's growth patterns.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            View Pricing
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">AI is analyzing your church data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const getConfidenceBadge = (confidence) => {
    const colors = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[confidence] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold">AI Pattern Intelligence</h1>
                <p className="text-gray-600">{analysis?.data_summary?.church_name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Analysis period: {analysis?.data_period} • Generated {new Date(analysis?.generated_at).toLocaleDateString()}
          </div>
        </div>

        <div className="grid md:grid-cols-1 gap-6 mb-6">
          {analysis?.patterns?.map((pattern, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    {index + 1}
                  </div>
                  <h2 className="text-xl font-bold">{pattern.title}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(pattern.confidence)}`}>
                  {pattern.confidence} confidence
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Pattern Observed
                  </h3>
                  <p className="text-gray-600">{pattern.pattern}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Why This Matters</h3>
                  <p className="text-gray-600">{pattern.why_it_matters}</p>
                </div>

                <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4">
                  <h3 className="font-semibold text-indigo-900 mb-2">Action to Take</h3>
                  <p className="text-indigo-800">{pattern.action}</p>
                </div>

                {pattern.data_points && pattern.data_points.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pattern.data_points.map((dp, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {dp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold mb-4">Data Summary (Last 90 Days)</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analysis?.data_summary?.visitor_count_90d}</div>
              <div className="text-sm text-gray-600">Total Visitors</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analysis?.data_summary?.events_by_type?.length || 0}</div>
              <div className="text-sm text-gray-600">Event Types</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analysis?.data_summary?.profile_views_90d}</div>
              <div className="text-sm text-gray-600">Profile Views</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}