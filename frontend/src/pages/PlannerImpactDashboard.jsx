import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PlannerImpactDashboard = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImpact();
  }, [tripId]);

  const loadImpact = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/planner/${tripId}/predict-impact`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setImpact(res.data);
    } catch (error) {
      console.error('Error loading impact:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmTrip = async () => {
    if (window.confirm('Confirm this trip and notify all churches?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(`${process.env.REACT_APP_API_URL}/api/planner/${tripId}/confirm`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Trip confirmed! All churches have been notified.');
        navigate(`/planner/${tripId}`);
      } catch (error) {
        console.error('Error confirming trip:', error);
        alert('Failed to confirm trip');
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-xl">Predicting impact...</p></div>;
  }

  if (!impact) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-xl">No impact data available</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 text-center">Ministry Trip Impact Prediction</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-gray-600 mb-2">Total Estimated Reach</h3>
            <p className="text-5xl font-bold text-blue-600">{impact.total_estimated_reach?.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2">believers across all visits</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h3 className="text-gray-600 mb-2">Ministry Impact Score</h3>
            <div className="relative w-32 h-32 mx-auto">
              <Doughnut data={{
                datasets: [{ data: [impact.ministry_impact_score, 100 - impact.ministry_impact_score], backgroundColor: ['#10b981', '#e5e7eb'], borderWidth: 0 }]
              }} options={{ cutout: '75%', plugins: { tooltip: { enabled: false } } }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{impact.ministry_impact_score}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 mb-4">Predicted Outcomes</h3>
            <div className="space-y-2 text-sm">
              <p><strong>{impact.predicted_outcomes?.new_partnerships || 0}</strong> new partnerships</p>
              <p><strong>{impact.predicted_outcomes?.referrals_to_other_churches || 0}</strong> referrals expected</p>
              <p><strong>{impact.predicted_outcomes?.follow_up_engagements || 0}</strong> follow-up engagements</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Visit-by-Visit Impact</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Church</th>
                  <th className="text-center py-2">Est. Attendance</th>
                  <th className="text-center py-2">Impact Score</th>
                  <th className="text-left py-2">Recommended Focus</th>
                </tr>
              </thead>
              <tbody>
                {impact.visit_by_visit_impact?.map((visit, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-3">{visit.church_name}</td>
                    <td className="text-center">{visit.estimated_attendance}</td>
                    <td className="text-center"><span className="px-2 py-1 bg-green-100 text-green-700 rounded">{visit.impact_score}</span></td>
                    <td className="text-sm text-gray-600">{visit.recommended_focus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-green-700">✓ Trip Strengths</h3>
            <ul className="space-y-2">
              {impact.trip_strengths?.map((strength, i) => <li key={i} className="flex items-start"><span className="text-green-500 mr-2">•</span><span>{strength}</span></li>)}
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-amber-700">⚠ Trip Weaknesses</h3>
            <ul className="space-y-2">
              {impact.trip_weaknesses?.map((weakness, i) => <li key={i} className="flex items-start"><span className="text-amber-500 mr-2">•</span><span>{weakness}</span></li>)}
            </ul>
          </div>
        </div>

        {impact.improvement_suggestions?.length > 0 && (
          <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-xl font-bold mb-4 text-blue-700">💡 Improvement Suggestions</h3>
            <div className="space-y-3">
              {impact.improvement_suggestions.map((sug, i) => (
                <div key={i} className="flex items-start justify-between bg-white p-4 rounded">
                  <div className="flex-1">
                    <p className="font-semibold">{sug.suggestion}</p>
                    <p className="text-sm text-gray-600 mt-1">Impact: {sug.impact_increase} | Match: {sug.match_score_change}</p>
                  </div>
                  <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">AI Verdict</h3>
          <p className="text-gray-700 leading-relaxed">{impact.ai_verdict}</p>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={() => navigate(`/planner/${tripId}`)} className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Go Back and Adjust</button>
          <button onClick={confirmTrip} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">Confirm Trip</button>
        </div>
      </div>
    </div>
  );
};

export default PlannerImpactDashboard;