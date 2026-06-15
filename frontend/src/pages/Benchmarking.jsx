import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Minus, Award, AlertCircle, Lock } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function Benchmarking() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  useEffect(() => {
    loadBenchmarks();
  }, [churchSlug]);

  const loadBenchmarks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/api/tools/benchmarking/${churchSlug}`,
        { withCredentials: true }
      );
      setData(response.data);
    } catch (err) {
      if (err.response?.status === 402) {
        setRequiresUpgrade(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to load benchmarks');
      }
    } finally {
      setLoading(false);
    }
  };

  if (requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Lock className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            Network Benchmarking requires a Premium subscription (£19/month).
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
        <BarChart3 className="w-16 h-16 text-indigo-600 animate-pulse" />
      </div>
    );
  }

  const formatMetricName = (name) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getPercentileColor = (percentile) => {
    if (percentile >= 75) return 'text-green-600';
    if (percentile >= 50) return 'text-blue-600';
    if (percentile >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold">Network Benchmarking</h1>
              <p className="text-gray-600">
                Compared to {data?.peer_group?.count || 0} {data?.peer_group?.denomination} churches
                {data?.peer_group?.size_range && ` (${data.peer_group.size_range})`}
                {data?.peer_group?.region && ` in ${data.peer_group.region}`}
              </p>
            </div>
          </div>
        </div>

        {data?.strengths?.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold">Your Strengths</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.strengths.map((metric, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="font-semibold text-green-900 mb-1">
                    {formatMetricName(metric.metric)}
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    Top {100 - metric.your_percentile}%
                  </div>
                  <div className="text-sm text-green-700 mt-2">
                    You: {metric.your_value} • Peer avg: {metric.peer_average}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">All Metrics</h2>
          <div className="space-y-4">
            {data?.benchmarks?.map((metric, index) => (
              <div key={index} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatMetricName(metric.metric)}</span>
                    {getTrendIcon(metric.trend)}
                  </div>
                  <span className={`text-lg font-bold ${getPercentileColor(metric.your_percentile)}`}>
                    {metric.your_percentile}th percentile
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <div className="text-xs text-gray-600">Your Value</div>
                    <div className="font-bold">{metric.your_value}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Peer Average</div>
                    <div className="font-bold">{metric.peer_average}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Top 25%</div>
                    <div className="font-bold">{metric.peer_top_25pct}</div>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${metric.your_percentile}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {data?.improvement_areas?.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold">Areas to Improve</h2>
            </div>
            <div className="space-y-3">
              {data.improvement_areas.map((metric, index) => (
                <div key={index} className="bg-orange-50 border-l-4 border-orange-600 p-4">
                  <div className="font-semibold text-orange-900">
                    {formatMetricName(metric.metric)}
                  </div>
                  <div className="text-sm text-orange-700 mt-1">
                    You're in the {metric.your_percentile}th percentile. 
                    Target: {metric.peer_top_25pct} (top 25%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}