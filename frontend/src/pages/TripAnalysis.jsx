import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

export default function TripAnalysis() {
  const { tripId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cost');
  const navigate = useNavigate();

  useEffect(() => {
    loadAnalysis();
  }, [tripId]);

  const loadAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/planner/${tripId}/full-analysis`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalysis(res.data);
    } catch (err) {
      console.error('Failed to load analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/planner/${tripId}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trip_${tripId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }

  if (!analysis) {
    return <div className="min-h-screen flex items-center justify-center"><p>Analysis not available</p></div>;
  }

  const scoreColor = analysis.overall_score >= 70 ? 'text-green-600' : analysis.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = analysis.overall_score >= 70 ? 'bg-green-100' : analysis.overall_score >= 50 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trip Analysis</h1>
              <p className="text-gray-500 mt-1">Multi-factor analysis of your ministry trip</p>
            </div>
            <div className={`px-8 py-4 rounded-2xl ${scoreBg}`}>
              <div className="text-sm font-medium text-gray-600">Overall Score</div>
              <div className={`text-4xl font-bold ${scoreColor}`}>{analysis.overall_score}/100</div>
            </div>
          </div>

          <div className="flex gap-2 border-b border-gray-200 mb-6">
            {['cost', 'time', 'impact', 'risk', 'recommendations'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-purple-600 text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'cost' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded-xl">
                  <div className="text-sm text-red-600 font-medium">Total Costs</div>
                  <div className="text-2xl font-bold text-red-700">GBP {analysis.cost.net.costs}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="text-sm text-green-600 font-medium">Expected Income</div>
                  <div className="text-2xl font-bold text-green-700">GBP {analysis.cost.net.income}</div>
                </div>
                <div className={`p-4 rounded-xl ${analysis.cost.net.net >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-sm font-medium ${analysis.cost.net.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Position</div>
                  <div className={`text-2xl font-bold ${analysis.cost.net.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {analysis.cost.net.net >= 0 ? '+' : ''}GBP {analysis.cost.net.net}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <h3 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Travel</span><span className="font-medium">GBP {analysis.cost.travel.total}</span></div>
                  <div className="flex justify-between"><span>Accommodation</span><span className="font-medium">GBP {analysis.cost.accommodation.cost}</span></div>
                  <div className="flex justify-between"><span>Food</span><span className="font-medium">GBP {analysis.cost.food.total}</span></div>
                  <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>GBP {analysis.cost.net.costs}</span></div>
                </div>
              </div>
              {analysis.cost.accommodation.saving > 0 && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                  <div className="text-sm text-purple-800">💡 Potential saving: Accept accommodation from {analysis.cost.accommodation.host_offers} churches to save GBP {analysis.cost.accommodation.saving}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'time' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="text-sm text-blue-600 font-medium">Travel Time</div>
                  <div className="text-2xl font-bold text-blue-700">{analysis.time.travel_hours} hours</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="text-sm text-green-600 font-medium">Ministry Time</div>
                  <div className="text-2xl font-bold text-green-700">{analysis.time.ministry_hours} hours</div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-sm text-purple-600 font-medium mb-1">Ministry to Travel Ratio</div>
                <div className="text-3xl font-bold text-purple-700">{analysis.time.ratio}:1</div>
                <div className="text-sm text-purple-600 mt-2">{analysis.time.ratio >= 1.5 ? 'Excellent time efficiency' : 'Consider optimizing travel routes'}</div>
              </div>
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl">
                <div className="text-center">
                  <div className="text-sm text-purple-600 font-medium mb-2">Total Reach</div>
                  <div className="text-5xl font-bold text-purple-700 mb-2">{analysis.impact.total_reach}</div>
                  <div className="text-sm text-purple-600">people across all visits</div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="text-sm text-gray-600">Average congregation size: <span className="font-bold text-gray-900">{analysis.impact.average_size}</span></div>
                <div className="text-sm text-gray-600 mt-1">Impact score: <span className="font-bold text-gray-900">{analysis.impact.score}/100</span></div>
              </div>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${
                analysis.risk.level === 'LOW' ? 'bg-green-50 border border-green-200' :
                analysis.risk.level === 'MEDIUM' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{analysis.risk.level === 'LOW' ? '✅' : analysis.risk.level === 'MEDIUM' ? '⚠️' : '🚨'}</span>
                  <div>
                    <div className="font-bold">{analysis.risk.level} Risk Level</div>
                    <div className="text-sm">Risk Score: {analysis.risk.risk_score}/100</div>
                  </div>
                </div>
              </div>
              {analysis.risk.risks.map((risk, idx) => (
                <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl">
                  <div className="font-medium text-gray-900 mb-1">{risk.risk}</div>
                  <div className="text-sm text-gray-600">Severity: <span className="capitalize">{risk.severity}</span></div>
                  <div className="text-sm text-purple-600 mt-2">💡 {risk.mitigation}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-gray-800">{rec}</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Apply</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <button onClick={downloadPDF} className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            <button onClick={() => navigate(`/planner/${tripId}/board`)} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">Go to Collaboration Board</button>
          </div>
        </div>
      </div>
    </div>
  );
}