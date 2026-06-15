import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, TrendingDown, Mail, RefreshCw, Lock } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function ChurnAnalysis() {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
        `${API_BASE}/api/tools/churn-analysis/${churchSlug}`,
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
    }
  };

  if (requiresUpgrade) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Lock className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            Visitor Journey & Churn Analysis requires a Premium subscription (£19/month).
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
          <Users className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Analyzing visitor patterns...</p>
        </div>
      </div>
    );
  }

  const funnel = analysis?.journey_funnel;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold">Visitor Journey & Churn Analysis</h1>
                <p className="text-gray-600">{analysis?.at_risk_count || 0} at-risk visitors identified</p>
              </div>
            </div>
            <button
              onClick={() => loadAnalysis(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {funnel && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Visitor Journey Funnel</h2>
            <div className="space-y-3">
              {[
                { label: 'Discovery', value: funnel.discovery },
                { label: 'First Visit', value: funnel.first_visit },
                { label: 'Returning', value: funnel.returning },
                { label: 'Engaged (5+ visits)', value: funnel.engaged },
                { label: 'Regular (10+ visits)', value: funnel.regular }
              ].map((stage, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{stage.label}</span>
                    <span className="text-gray-600">{stage.value} visitors</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full"
                      style={{ width: `${(stage.value / funnel.discovery) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {funnel.conversion_rates && (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">First → Returning</div>
                  <div className="text-xl font-bold">{funnel.conversion_rates.first_to_returning}%</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Returning → Engaged</div>
                  <div className="text-xl font-bold">{funnel.conversion_rates.returning_to_engaged}%</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Engaged → Regular</div>
                  <div className="text-xl font-bold">{funnel.conversion_rates.engaged_to_regular}%</div>
                </div>
              </div>
            )}
          </div>
        )}

        {analysis?.analyses?.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">At-Risk Visitors</h2>
            {analysis.analyses.map((visitor, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{visitor.name}</h3>
                    <div className="text-sm text-gray-600">
                      {visitor.visits} visits • Last seen {visitor.last_visit_days_ago} days ago
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    visitor.confidence === 'high' ? 'bg-red-100 text-red-800' :
                    visitor.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {visitor.confidence} confidence
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold">Likely Reason</span>
                  </div>
                  <p className="text-gray-700">{visitor.likely_reason}</p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
                  <div className="font-semibold text-blue-900 mb-2">Suggested Message</div>
                  <p className="text-blue-800">{visitor.message}</p>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Mail className="w-4 h-4" />
                  Send Re-engagement Email
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <TrendingDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No At-Risk Visitors</h3>
            <p className="text-gray-600">Great news! No visitors are currently flagged as at-risk.</p>
          </div>
        )}
      </div>
    </div>
  );
}