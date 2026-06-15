import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const PlannerDiscoverPage = () => {
  const { tripId } = useParams();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChurch, setExpandedChurch] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, [tripId]);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/planner/${tripId}/match-churches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (score) => {
    if (score >= 90) return { label: 'Excellent Match', color: 'bg-green-600' };
    if (score >= 70) return { label: 'Good Match', color: 'bg-blue-600' };
    if (score >= 50) return { label: 'Fair Match', color: 'bg-yellow-600' };
    return { label: 'Low Match', color: 'bg-gray-600' };
  };

  const addToItinerary = async (churchId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/planner/${tripId}/visits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ church_id: churchId })
      });
      alert('Added to itinerary!');
    } catch (err) {
      console.error('Failed to add church:', err);
    }
  };

  const getRadarData = (dimensions) => ({
    labels: ['Denominational Fit', 'Audience Match', 'Need Alignment', 'Practical Fit', 'Relationship Potential', 'Impact Score', 'History Score'],
    datasets: [{
      label: 'Match Dimensions',
      data: [
        dimensions.denominational_fit,
        dimensions.audience_match,
        dimensions.need_alignment,
        dimensions.practical_fit,
        dimensions.relationship_potential,
        dimensions.impact_score,
        dimensions.history_score
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 2
    }]
  });

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="text-xl">Analyzing churches with AI...</div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Discover Churches</h1>
      <p className="text-gray-600 mb-8">AI-ranked churches perfect for your ministry trip</p>

      <div className="space-y-4">
        {matches.map((match) => {
          const badge = getMatchBadge(match.overall_match_score);
          const isExpanded = expandedChurch === match.church_id;

          return (
            <div key={match.church_id} className="bg-white border rounded-lg shadow-sm">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{match.church_name}</h3>
                    <span className={`${badge.color} text-white px-3 py-1 rounded-full text-sm font-medium`}>
                      {badge.label} ({match.overall_match_score}%)
                    </span>
                  </div>
                  <button
                    onClick={() => addToItinerary(match.church_id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add to Itinerary
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Est. Attendance</p>
                    <p className="text-lg font-semibold">{match.estimated_attendance}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Est. Impact Reach</p>
                    <p className="text-lg font-semibold">{match.estimated_impact_reach}</p>
                  </div>
                </div>

                {match.green_flags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-green-700 mb-2">✓ Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {match.green_flags.map((flag, idx) => (
                        <span key={idx} className="bg-green-50 text-green-800 px-2 py-1 rounded text-sm">{flag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {match.red_flags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-red-700 mb-2">! Considerations</p>
                    <div className="flex flex-wrap gap-2">
                      {match.red_flags.map((flag, idx) => (
                        <span key={idx} className="bg-red-50 text-red-800 px-2 py-1 rounded text-sm">{flag}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedChurch(isExpanded ? null : match.church_id)}
                  className="text-blue-600 font-medium hover:underline"
                >
                  {isExpanded ? 'Hide' : 'Show'} AI Analysis
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">AI Reasoning</h4>
                        <p className="text-gray-700 text-sm mb-4">{match.ai_reasoning}</p>
                        <h4 className="font-semibold mb-2">Recommendation</h4>
                        <p className="text-blue-700 text-sm font-medium">{match.ai_recommendation}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-center">Match Dimensions</h4>
                        <div className="max-w-sm mx-auto">
                          <Radar data={getRadarData(match.dimensions)} options={{ scales: { r: { min: 0, max: 100 } } }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlannerDiscoverPage;
