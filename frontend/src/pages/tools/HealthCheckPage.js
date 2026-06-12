import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HealthCheckPage.css';

const HealthCheckPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [listingType, setListingType] = useState('church');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const popularSearches = [
    { name: 'Hillsong Church', type: 'church' },
    { name: 'Holy Trinity Brompton', type: 'church' },
    { name: 'All Souls Langham Place', type: 'church' },
    { name: 'St Thomas Sheffield', type: 'church' }
  ];

  const handleSearch = async (name = searchTerm, type = listingType) => {
    if (!name.trim()) {
      setError('Please enter a ministry name');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/tools/health-check?name=${encodeURIComponent(name)}&type=${type}`
      );
      const data = await response.json();

      if (!data.listing_found) {
        setError('Ministry not found. Try a different name or check the listing type.');
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Failed to fetch health score. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#ef4444';
    return '#991b1b';
  };

  const CircularGauge = ({ score }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
      <div className="circular-gauge">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="20"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="gauge-score">
          <div className="score-number">{score}</div>
          <div className="score-total">/100</div>
        </div>
      </div>
    );
  };

  return (
    <div className="health-check-page">
      <div className="container">
        <header className="page-header">
          <h1>Ministry Health Score Checker</h1>
          <p>Free instant health check for any UK ministry listing</p>
        </header>

        <div className="search-section">
          <div className="search-controls">
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
              className="type-select"
            >
              <option value="church">Church</option>
              <option value="pastor">Pastor</option>
              <option value="worship">Worship Leader</option>
              <option value="media">Media Team</option>
              <option value="college">Bible College</option>
            </select>
            <input
              type="text"
              placeholder="Enter ministry name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="search-button"
            >
              {loading ? 'Checking...' : 'Check Health'}
            </button>
          </div>

          <div className="quick-search">
            <span>Quick search:</span>
            {popularSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(item.name, item.type)}
                className="quick-chip"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {result && (
          <div className="results-section">
            <div className="result-header">
              <div className="listing-info">
                <h2>{result.listing_name}</h2>
                <span className="listing-type">{result.listing_type}</span>
              </div>
            </div>

            <div className="score-overview">
              <div className="gauge-container">
                <CircularGauge score={result.total_score} />
                <div className="score-band" style={{ color: getScoreColor(result.total_score) }}>
                  {result.score_band}
                </div>
              </div>

              <div className="breakdown">
                <h3>Score Breakdown</h3>
                {result.breakdown.map((item, idx) => (
                  <div key={idx} className="breakdown-item">
                    <div className="breakdown-header">
                      <span className="category-name">{item.category}</span>
                      <span className="category-score">
                        {item.score}/{item.max_score}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: getScoreColor(item.percentage)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="actions-section">
              <h3>Top 3 Actions to Improve</h3>
              <div className="actions-list">
                {result.top_3_actions.map((action, idx) => (
                  <div key={idx} className="action-card">
                    <div className="action-number">{idx + 1}</div>
                    <div className="action-content">
                      <div className="action-text">{action.action}</div>
                      <div className="action-impact">
                        <span className="points-badge">+{action.points} pts</span>
                        <span className={`priority-badge priority-${action.priority}`}>
                          {action.priority} priority
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="upgrade-cta">
              <div className="cta-content">
                <h3>Unlock Full Analytics</h3>
                <p>See 12-week score trends, competitor benchmarks, and automated alerts</p>
                <button onClick={() => navigate('/pricing')} className="cta-button">
                  Upgrade to Standard
                </button>
              </div>
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Check Any Ministry's Health Score</h3>
            <p>Enter a ministry name above to see their complete health assessment across 6 key areas</p>
            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Profile Completeness</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Social Media Presence</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Content Activity</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Engagement Metrics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Verification Status</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>SEO Visibility</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthCheckPage;