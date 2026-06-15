import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const VisitorJourney = () => {
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
        const response = await axios.post(
          `${API_URL}/api/tools/churn-analysis/${user.church_slug}`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setData(response.data);
        setError(null);
      } catch (err) {
        if (err.response?.status === 402) {
          setError('Premium subscription required');
        } else {
          setError(err.response?.data?.detail || 'Failed to load visitor journey data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const sendReengagement = async (visitorId, message) => {
    try {
      await axios.post(
        `${API_URL}/api/communications/send`,
        {
          visitor_id: visitorId,
          template_id: 30,
          custom_message: message
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Re-engagement message sent!');
    } catch (err) {
      alert('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing visitor journeys...</p>
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

  const funnel = data?.journey_funnel || {};
  const funnelStages = [
    { key: 'discovery', label: 'Discovery', count: funnel.discovery },
    { key: 'first_visit', label: 'First Visit', count: funnel.first_visit },
    { key: 'returning', label: 'Returning', count: funnel.returning },
    { key: 'engaged', label: 'Engaged', count: funnel.engaged },
    { key: 'member', label: 'Member', count: funnel.member },
    { key: 'leader', label: 'Leader', count: funnel.leader }
  ];

  const maxCount = Math.max(...funnelStages.map(s => s.count));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Visitor Journey & Churn Analysis</h1>
          <p className="text-gray-600 mt-2">AI-powered insights on visitor retention</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Visitor Journey Funnel</h2>
          <div className="space-y-3">
            {funnelStages.map((stage, index) => {
              const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              const conversionRate = index > 0 && funnelStages[index - 1].count > 0
                ? ((stage.count / funnelStages[index - 1].count) * 100).toFixed(1)
                : 100;
              
              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{stage.count} visitors</span>
                      {index > 0 && (
                        <span className="text-xs text-gray-500">({conversionRate}% conversion)</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-indigo-600 h-8 rounded-full transition-all duration-500 flex items-center justify-center text-white text-sm font-medium"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {stage.count > 0 && stage.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">At-Risk Visitors</h2>
            <span className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold">
              {data?.total_at_risk || 0} at risk
            </span>
          </div>

          {data?.at_risk_visitors && data.at_risk_visitors.length > 0 ? (
            <div className="space-y-4">
              {data.at_risk_visitors.map((visitor, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{visitor.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{visitor.visit_count} visits</span>
                        {visitor.last_visit && (
                          <span>Last: {new Date(visitor.last_visit).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 mb-1">Re-engagement probability</div>
                      <div className="text-2xl font-bold text-indigo-600">{visitor.probability_score}%</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                    <p className="text-sm font-medium text-yellow-900 mb-1">Likely reason:</p>
                    <p className="text-yellow-800">{visitor.likely_reason}</p>
                  </div>

                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Suggested message:</p>
                    <p className="text-blue-800 text-sm">{visitor.message}</p>
                  </div>

                  <button
                    onClick={() => sendReengagement(visitor.visitor_id, visitor.message)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium"
                  >
                    Send Re-engagement Message
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No at-risk visitors detected. Great retention!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitorJourney;