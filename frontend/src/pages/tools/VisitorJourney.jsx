import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Users, TrendingDown, Mail, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.churchnavigator.com';

const VisitorJourney = () => {
  const { churchSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('church_auth_token');
        const response = await axios.post(
          `${API_BASE}/api/tools/churn-analysis/${churchSlug}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(response.data);
      } catch (err) {
        if (err.response?.status === 402) {
          setError('Premium subscription required. Upgrade to access Visitor Journey & Churn AI.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load visitor journey data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [churchSlug]);

  const handleSendReengagement = async (visitorId, message) => {
    if (!confirm('Send re-engagement email to this visitor?')) return;
    try {
      const token = localStorage.getItem('church_auth_token');
      await axios.post(
        `${API_BASE}/api/visitors/${visitorId}/reengagement`,
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Re-engagement email sent!');
    } catch (err) {
      alert('Failed to send email: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Data</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const funnel = data?.funnel || {};
  const funnelStages = [
    { name: 'Discovery', count: funnel.discovery, color: 'bg-blue-500' },
    { name: 'First Visit', count: funnel.first_visit, color: 'bg-blue-600' },
    { name: 'Returning', count: funnel.returning, color: 'bg-blue-700' },
    { name: 'Engaged', count: funnel.engaged, color: 'bg-blue-800' },
    { name: 'Member', count: funnel.member, color: 'bg-blue-900' },
    { name: 'Leader', count: funnel.leader, color: 'bg-blue-950' }
  ];

  const maxCount = Math.max(...funnelStages.map(s => s.count));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          Visitor Journey & Churn AI
        </h1>
        <p className="text-gray-600 mt-2">Understand visitor progression and re-engage at-risk members</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Visitor Journey Funnel</h2>
        <div className="space-y-3">
          {funnelStages.map((stage, index) => {
            const width = maxCount > 0 ? (stage.count / maxCount * 100) : 0;
            const conversionRate = index > 0 ? (stage.count / funnelStages[index - 1].count * 100) : 100;
            return (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{stage.count} visitors</span>
                    {index > 0 && (
                      <span className="text-xs text-gray-500">({conversionRate.toFixed(0)}% conversion)</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className={`${stage.color} h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  >
                    {width > 10 ? stage.count : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-orange-600" />
            At-Risk Visitors ({data?.at_risk_count || 0})
          </h2>
          <span className="text-sm text-gray-600">AI-powered churn analysis</span>
        </div>

        {data?.at_risk_count === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No at-risk visitors detected. Great job!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.visitors?.map((visitor) => (
              <div key={visitor.visitor_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{visitor.name}</h3>
                    <p className="text-sm text-gray-600">
                      {visitor.visit_count} visits • Last visit: {new Date(visitor.last_visit).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">
                      {visitor.conversion_probability}% chance to return
                    </div>
                  </div>
                </div>

                {visitor.ai_reason && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-orange-900 mb-1">AI Analysis:</p>
                    <p className="text-sm text-orange-800">{visitor.ai_reason}</p>
                  </div>
                )}

                {visitor.suggested_message && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">Suggested Message:</p>
                        <p className="text-sm text-blue-800">{visitor.suggested_message}</p>
                      </div>
                      <button
                        onClick={() => handleSendReengagement(visitor.visitor_id, visitor.suggested_message)}
                        className="ml-4 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                      >
                        <Mail className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorJourney;