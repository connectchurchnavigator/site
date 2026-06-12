import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlannerDiscoverPage.css';

const PlannerDiscoverPage = () => {
  const { trip_id } = useParams();
  const navigate = useNavigate();
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('ai_recommendation');
  const [filters, setFilters] = useState({
    denomination: '',
    max_distance: null,
    congregation_size: '',
    has_invitation: null,
    has_event: null
  });
  const [addingToTrip, setAddingToTrip] = useState({});

  useEffect(() => {
    fetchChurches();
  }, [trip_id, sortBy, filters]);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ sort_by: sortBy });
      
      if (filters.denomination) params.append('denomination', filters.denomination);
      if (filters.max_distance) params.append('max_distance', filters.max_distance);
      if (filters.congregation_size) params.append('congregation_size', filters.congregation_size);
      if (filters.has_invitation !== null) params.append('has_invitation', filters.has_invitation);
      if (filters.has_event !== null) params.append('has_event', filters.has_event);
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/planner/trips/${trip_id}/discover?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChurches(response.data.churches);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load churches');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTrip = async (churchId) => {
    try {
      setAddingToTrip(prev => ({ ...prev, [churchId]: true }));
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/planner/trips/${trip_id}/items`,
        { church_id: churchId, visit_type: 'sunday_service' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Added to your trip plan!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add church');
    } finally {
      setAddingToTrip(prev => ({ ...prev, [churchId]: false }));
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      denomination: '',
      max_distance: null,
      congregation_size: '',
      has_invitation: null,
      has_event: null
    });
  };

  const formatCongregationSize = (size) => {
    if (!size) return 'Unknown';
    if (size < 100) return `Small (${size})`;
    if (size < 500) return `Medium (${size})`;
    if (size < 2000) return `Large (${size:,})`;
    return `Mega (${size:,})`;
  };

  if (loading) {
    return (
      <div className="planner-discover-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Finding the best churches for your trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="planner-discover-page">
      <div className="discover-header">
        <button onClick={() => navigate(`/planner/${trip_id}`)} className="back-btn">
          ← Back to Trip
        </button>
        <h1>Discover Churches</h1>
        <p className="discover-subtitle">{churches.length} churches ranked for your trip</p>
      </div>

      <div className="discover-controls">
        <div className="filter-bar">
          <div className="filter-group">
            <label>Denomination</label>
            <input
              type="text"
              placeholder="e.g. Baptist"
              value={filters.denomination}
              onChange={(e) => handleFilterChange('denomination', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Max Distance</label>
            <select
              value={filters.max_distance || ''}
              onChange={(e) => handleFilterChange('max_distance', e.target.value ? parseFloat(e.target.value) : null)}
            >
              <option value="">Any</option>
              <option value="5">5 miles</option>
              <option value="10">10 miles</option>
              <option value="20">20 miles</option>
              <option value="50">50 miles</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Size</label>
            <select
              value={filters.congregation_size}
              onChange={(e) => handleFilterChange('congregation_size', e.target.value)}
            >
              <option value="">Any</option>
              <option value="small">Small (< 100)</option>
              <option value="medium">Medium (100-500)</option>
              <option value="large">Large (500-2000)</option>
              <option value="mega">Mega (2000+)</option>
            </select>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.has_invitation === true}
                onChange={(e) => handleFilterChange('has_invitation', e.target.checked ? true : null)}
              />
              Has invited me
            </label>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.has_event === true}
                onChange={(e) => handleFilterChange('has_event', e.target.checked ? true : null)}
              />
              Has event
            </label>
          </div>

          <button onClick={resetFilters} className="reset-filters-btn">Reset</button>
        </div>

        <div className="sort-bar">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="ai_recommendation">AI Recommendation</option>
            <option value="highest_impact">Highest Impact</option>
            <option value="lowest_cost">Lowest Cost</option>
            <option value="best_value">Best Value</option>
            <option value="nearest">Nearest First</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="churches-grid">
        {churches.map((church) => (
          <div key={church.church_id} className="church-card">
            <div className="church-card-header">
              {church.image_url && (
                <img src={church.image_url} alt={church.name} className="church-thumbnail" />
              )}
              <div className="church-badge">{church.recommendation_badge}</div>
            </div>

            <div className="church-card-body">
              <h3>{church.name}</h3>
              <p className="church-denomination">{church.denomination}</p>
              <p className="church-location">
                {church.city}, {church.postcode}
              </p>

              <div className="score-section">
                <div className="overall-score">
                  <span className="score-number">{church.overall_score}</span>
                  <span className="score-label">/100</span>
                </div>
                <div className="score-details">
                  <div className="score-detail">
                    <span>Congregation:</span>
                    <span>{formatCongregationSize(church.congregation_size)}</span>
                  </div>
                  <div className="score-detail">
                    <span>Distance:</span>
                    <span>{church.distance_mi} mi</span>
                  </div>
                  <div className="score-detail">
                    <span>Est. Transport:</span>
                    <span>£{church.transport_cost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="score-bars">
                <div className="score-bar-item">
                  <label>Impact</label>
                  <div className="score-bar">
                    <div
                      className="score-bar-fill impact"
                      style={{ width: `${church.impact_percentage}%` }}
                    ></div>
                  </div>
                  <span>{church.impact_percentage}%</span>
                </div>
                <div className="score-bar-item">
                  <label>Cost</label>
                  <div className="score-bar">
                    <div
                      className="score-bar-fill cost"
                      style={{ width: `${church.cost_percentage}%` }}
                    ></div>
                  </div>
                  <span>{church.cost_percentage}%</span>
                </div>
                <div className="score-bar-item">
                  <label>Value</label>
                  <div className="score-bar">
                    <div
                      className="score-bar-fill value"
                      style={{ width: `${Math.min(church.value_score * 10, 100)}%` }}
                    ></div>
                  </div>
                  <span>{church.value_score.toFixed(1)}</span>
                </div>
              </div>

              <div className="why-recommended">
                <h4>Why recommended:</h4>
                <ul>
                  {church.why_recommended.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleAddToTrip(church.church_id)}
                disabled={addingToTrip[church.church_id]}
                className="add-to-trip-btn"
              >
                {addingToTrip[church.church_id] ? 'Adding...' : '+ Add to Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {churches.length === 0 && !loading && (
        <div className="empty-state">
          <p>No churches match your current filters.</p>
          <button onClick={resetFilters} className="reset-btn">Reset Filters</button>
        </div>
      )}
    </div>
  );
};

export default PlannerDiscoverPage;
