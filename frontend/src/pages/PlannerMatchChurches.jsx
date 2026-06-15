import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const PlannerMatchChurches = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChurch, setExpandedChurch] = useState(null);

  useEffect(() => {
    loadMatches();
  }, [tripId]);

  const loadMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/planner/${tripId}/match-churches`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatches(res.data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 70) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 50) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Low', color: 'bg-gray-400' };
  };

  const addToItinerary = async (churchId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_API_URL}/api/planner/${tripId}/itinerary/add`, 
        { church_id: churchId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Church added to itinerary!');
    } catch (error) {
      console.error('Error adding to itinerary:', error);
      alert('Failed to add church');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-xl">Loading church matches...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">AI Church Matching</h1>
          <button onClick={() => navigate(`/planner/${tripId}`)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Back to Trip</button>
        </div>

        <div className="space-y-4">
          {matches.map((match) => {
            const badge = getMatchBadge(match.overall_match_score);
            const isExpanded = expandedChurch === match.church_id;
            
            return (
              <div key={match.church_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{match.church_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-white text-sm ${badge.color}`}>
                        {badge.label} ({match.overall_match_score})
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{match.ai_reasoning}</p>
                    <p className="text-sm font-semibold text-blue-600 mb-2">{match.ai_recommendation}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Est. Attendance: <strong>{match.estimated_attendance}</strong></span>
                      <span>Est. Impact: <strong>{match.estimated_impact_reach}</strong></span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setExpandedChurch(isExpanded ? null : match.church_id)} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      {isExpanded ? 'Hide Details' : 'Why This Church?'}
                    </button>
                    <button onClick={() => addToItinerary(match.church_id)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Add to Itinerary
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold mb-3">Match Dimensions</h4>
                        <Radar data={{
                          labels: ['Denominational Fit', 'Audience Match', 'Need Alignment', 'Practical Fit', 'Relationship Potential', 'Impact Score', 'History Score'],
                          datasets: [{
                            label: 'Match Score',
                            data: [
                              match.dimensions?.denominational_fit || 0,
                              match.dimensions?.audience_match || 0,
                              match.dimensions?.need_alignment || 0,
                              match.dimensions?.practical_fit || 0,
                              match.dimensions?.relationship_potential || 0,
                              match.dimensions?.impact_score || 0,
                              match.dimensions?.history_score || 0
                            ],
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 2
                          }]
                        }} options={{ scales: { r: { min: 0, max: 100 } } }} />
                      </div>
                      <div>
                        {match.green_flags?.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-bold text-green-700 mb-2">✓ Green Flags</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {match.green_flags.map((flag, i) => <li key={i} className="text-sm text-green-600">{flag}</li>)}
                            </ul>
                          </div>
                        )}
                        {match.red_flags?.length > 0 && (
                          <div>
                            <h4 className="font-bold text-red-700 mb-2">⚠ Red Flags</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {match.red_flags.map((flag, i) => <li key={i} className="text-sm text-red-600">{flag}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlannerMatchChurches;