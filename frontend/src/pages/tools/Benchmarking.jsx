import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, TrendingUp, TrendingDown, Award, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.churchnavigator.com';

const Benchmarking = () => {
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('church_auth_token');
        const response = await axios.get(
          `${API_BASE}/api/tools/benchmarking/${churchSlug}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(response.data);
      } catch (err) {
        if (err.response?.status === 402) {
          setError('Premium subscription required. Upgrade to access Network Benchmarking.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load benchmarking data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [churchSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Data</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const metricLabels = {
    profile_views: 'Profile Views',
    follower_count: 'Followers',
    review_rating: 'Review Rating',
    event_frequency: 'Events/Month',
    visitor_return_rate: 'Visitor Return Rate',
    response_rate: 'Response Rate'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Network Benchmarking
        </h1>
        <p className="text-gray-600 mt-2">{data?.peer_group?.description}</p>
      </div>

      {data?.highlights && data.highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {data.highlights.map((highlight) => (
            <div key={highlight.metric} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">Top Performer</span>
              </div>
              <p className="text-gray-900 font-medium">{metricLabels[highlight.metric]}</p>
              <p className="text-2xl font-bold text-green-600">
                Top {(100 - highlight.percentile).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>
        <div className="space-y-6">
          {data?.benchmarks && Object.entries(data.benchmarks).map(([metric, values]) => {
            const percentile = values.your_percentile;
            const isAboveAverage = values.your_value > values.peer_average;
            return (
              <div key={metric} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{metricLabels[metric]}</h3>
                    <p className="text-sm text-gray-600">
                      You: <span className="font-medium">{values.your_value}</span> | 
                      Peer Avg: <span className="font-medium">{values.peer_average}</span> | 
                      Top 25%: <span className="font-medium">{values.peer_top_25pct}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                      isAboveAverage ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {isAboveAverage ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {percentile.toFixed(0)}th percentile
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${
                        percentile >= 75 ? 'bg-green-500' :
                        percentile >= 50 ? 'bg-blue-500' :
                        percentile >= 25 ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${percentile}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data?.areas_to_improve && data.areas_to_improve.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-orange-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            Areas to Improve
          </h2>
          <div className="space-y-3">
            {data.areas_to_improve.map((area) => (
              <div key={area.metric} className="bg-white rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{metricLabels[area.metric]}</span>
                  <span className="text-sm text-gray-600">
                    Gap to average: <span className="font-semibold text-orange-600">{area.gap.toFixed(1)}</span>
                  </span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${area.percentile}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Benchmarking;