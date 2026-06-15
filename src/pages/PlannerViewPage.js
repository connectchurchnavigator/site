import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlannerViewPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.churchnavigator.com';

const PlannerViewPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [churches, setChurches] = useState({});
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/planner/trips/${tripId}`);
      setTrip(response.data);
      
      const churchIds = [...new Set(response.data.itinerary.map(item => item.church_id))];
      const churchData = {};
      
      for (const id of churchIds) {
        try {
          const churchResponse = await axios.get(`${API_BASE_URL}/api/churches/${id}`);
          churchData[id] = churchResponse.data;
        } catch (err) {
          console.error(`Failed to fetch church ${id}:`, err);
        }
      }
      
      setChurches(churchData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trip');
      setLoading(false);
    }
  };

  const analyseTrip = async () => {
    try {
      setAnalysisLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/planner/trips/${tripId}/analyse`);
      setAnalysis(response.data);
      setShowAnalysis(true);
      setAnalysisLoading(false);
    } catch (err) {
      setError('Failed to analyse trip');
      setAnalysisLoading(false);
    }
  };

  const getScoreBandColor = (band) => {
    switch (band) {
      case 'Excellent': return '#10b981';
      case 'Very Good': return '#3b82f6';
      case 'Good': return '#8b5cf6';
      case 'Needs Improvement': return '#f59e0b';
      case 'Reconsider': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="planner-view-page">
        <div className="loading-spinner">Loading trip...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="planner-view-page">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="planner-view-page">
        <div className="error-message">Trip not found</div>
      </div>
    );
  }

  return (
    <div className="planner-view-page">
      <div className="planner-view-header">
        <button onClick={() => navigate('/planner')} className="back-button">
          ← Back to Planner
        </button>
        <h1>{trip.name}</h1>
        <div className="trip-dates">
          {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
        </div>
      </div>

      <div className="planner-view-content">
        <div className="itinerary-section">
          <h2>Itinerary ({trip.itinerary.length} items)</h2>
          {trip.itinerary.length === 0 ? (
            <div className="empty-message">No items in itinerary yet</div>
          ) : (
            <div className="itinerary-list">
              {trip.itinerary.map((item, index) => {
                const church = churches[item.church_id];
                return (
                  <div key={index} className="itinerary-item">
                    <div className="itinerary-item-date">
                      {new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="itinerary-item-details">
                      <h3>{church?.name || 'Unknown Church'}</h3>
                      <div className="itinerary-item-time">
                        {item.start_time} - {item.end_time}
                      </div>
                      <div className="itinerary-item-type">{item.activity_type}</div>
                      {item.notes && <div className="itinerary-item-notes">{item.notes}</div>}
                      {church && (
                        <div className="itinerary-item-location">
                          {church.city}, {church.postcode}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="analysis-section">
          {!showAnalysis ? (
            <div className="analysis-prompt">
              <h2>Trip Intelligence</h2>
              <p>Get AI-powered insights about your trip before you confirm</p>
              <button 
                onClick={analyseTrip} 
                disabled={analysisLoading || trip.itinerary.length === 0}
                className="analyse-button"
              >
                {analysisLoading ? 'Analysing...' : 'Analyse Trip'}
              </button>
              {trip.itinerary.length === 0 && (
                <p className="warning-text">Add items to your itinerary first</p>
              )}
            </div>
          ) : (
            <div className="analysis-results">
              <div className="analysis-header">
                <h2>Trip Intelligence</h2>
                <button onClick={() => setShowAnalysis(false)} className="close-button">×</button>
              </div>

              <div className="metrics-cards">
                <div className="metric-card">
                  <div className="metric-label">Ministry Reach</div>
                  <div className="metric-value">{analysis.metrics.ministry_reach.toLocaleString()}</div>
                  <div className="metric-sublabel">people + social network</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Efficiency</div>
                  <div className="metric-value">{analysis.metrics.efficiency_percent}%</div>
                  <div className="metric-sublabel">
                    {analysis.metrics.total_travel_time_hours}h active · {analysis.metrics.rest_periods}h rest
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Estimated Cost</div>
                  <div className="metric-value">£{analysis.metrics.estimated_cost}</div>
                  <div className="metric-sublabel">
                    £{analysis.metrics.transport_cost} transport · £{analysis.metrics.accommodation_cost} accommodation · {analysis.metrics.meals_hosted_count} meals
                  </div>
                </div>
              </div>

              <div className="trip-score-card">
                <div className="score-header">
                  <div className="score-label">Overall Trip Score</div>
                  <div className="score-value" style={{ color: getScoreBandColor(analysis.score_band) }}>
                    {analysis.trip_score}/100
                  </div>
                </div>
                <div className="score-band" style={{ backgroundColor: getScoreBandColor(analysis.score_band) }}>
                  {analysis.score_band}
                </div>
              </div>

              <div className="ai-commentary-card">
                <h3>AI Commentary</h3>
                <p className="commentary-text">{analysis.ai_commentary}</p>
                
                <div className="highlights-section">
                  <h4>✓ What's Working</h4>
                  <ul>
                    {analysis.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>

                <div className="suggestions-section">
                  <h4>→ Suggestions</h4>
                  <ul>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {analysis.recommendations.length > 0 && (
                <div className="whatif-card">
                  <h3>What-If Recommendations</h3>
                  <p className="whatif-intro">Consider adding these churches to optimize your trip:</p>
                  <div className="recommendations-list">
                    {analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">
                        <div className="recommendation-header">
                          <strong>{rec.church_name}</strong>
                          <span className="recommendation-city">{rec.city}</span>
                        </div>
                        <div className="recommendation-metrics">
                          <span className="rec-metric">Impact: +{rec.impact_score}</span>
                          <span className="rec-metric">Cost: £{rec.estimated_cost}</span>
                          <span className="rec-metric value-score">Value: {rec.value_score}</span>
                        </div>
                        <div className="recommendation-text">{rec.recommendation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={analyseTrip} disabled={analysisLoading} className="reanalyse-button">
                {analysisLoading ? 'Analysing...' : 'Re-analyse'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlannerViewPage;