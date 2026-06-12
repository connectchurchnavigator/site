import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './NetworkBenchmarkPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function NetworkBenchmarkPage() {
  const { listingId } = useParams();
  const [data, setData] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    fetchBenchmarks();
  }, [listingId]);

  const fetchBenchmarks = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      const userRes = await axios.get(`${API_BASE}/api/auth/me`, { headers });
      setUserPlan(userRes.data.plan);

      const res = await axios.get(`${API_BASE}/api/tools/benchmarks/${listingId}`, { headers });
      setData(res.data);

      if (userRes.data.plan === 'network') {
        try {
          const netRes = await axios.get(`${API_BASE}/api/tools/benchmarks/${listingId}/network`, { headers });
          setNetworkData(netRes.data);
        } catch (err) {
          console.log('No network data available');
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load benchmarks');
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    alert('PDF report generation coming soon');
  };

  if (loading) return <div className="benchmark-loading">Loading benchmarks...</div>;
  if (error) return <div className="benchmark-error">{error}</div>;
  if (!data) return null;

  const getPercentileColor = (percentile) => {
    if (percentile >= 75) return '#10b981';
    if (percentile >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="benchmark-page">
      <div className="benchmark-header">
        <h1>Network Benchmarking</h1>
        <button onClick={downloadPDF} className="btn-download-pdf">Download PDF Report</button>
      </div>

      <div className="benchmark-rank-card">
        <div className="rank-badge" style={{ borderColor: getPercentileColor(data.percentile) }}>
          <span className="rank-number">#{data.your_rank}</span>
          <span className="rank-total">of {data.total_in_category}</span>
        </div>
        <div className="rank-description">
          <h2>You rank #{data.your_rank} of {data.total_in_category}</h2>
          <p>{data.category_description}</p>
          <div className="percentile-gauge">
            <div className="percentile-label">Top {100 - data.percentile}%</div>
            <div className="percentile-bar">
              <div 
                className="percentile-fill" 
                style={{ 
                  width: `${data.percentile}%`,
                  backgroundColor: getPercentileColor(data.percentile)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="comparison-table">
        <h3>Performance Comparison</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>You</th>
              <th>Category Average</th>
              <th>Top Quartile</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Views</td>
              <td>{data.your_metrics.views.toLocaleString()}</td>
              <td>{data.category_avg.views.toLocaleString()}</td>
              <td className="top-quartile">{data.top_quartile.views.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Health Score</td>
              <td>{data.your_metrics.health_score}</td>
              <td>{data.category_avg.health_score}</td>
              <td className="top-quartile">{data.top_quartile.health_score}</td>
            </tr>
            <tr>
              <td>Followers</td>
              <td>{data.your_metrics.followers.toLocaleString()}</td>
              <td>{data.category_avg.followers.toLocaleString()}</td>
              <td className="top-quartile">{data.top_quartile.followers.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Engagement Rate</td>
              <td>{data.your_metrics.engagement}%</td>
              <td>{data.category_avg.engagement}%</td>
              <td className="top-quartile">{data.top_quartile.engagement}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {data.gap_analysis.length > 0 && (
        <div className="gap-analysis">
          <h3>What Top Performers Do Differently</h3>
          <div className="gap-cards">
            {data.gap_analysis.map((gap, idx) => (
              <div key={idx} className="gap-card">
                <div className="gap-metric">{gap.metric.replace(/_/g, ' ')}</div>
                <div className="gap-comparison">
                  <span className="gap-you">You: {gap.you}</span>
                  <span className="gap-arrow">→</span>
                  <span className="gap-top">Top: {gap.top_performers_avg}</span>
                </div>
                <div className="gap-impact">{gap.impact}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.top_performer_actions.length > 0 && (
        <div className="action-recommendations">
          <h3>Recommended Actions</h3>
          <ul>
            {data.top_performer_actions.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {networkData && (
        <div className="network-section">
          <h2>Network Branch Comparison</h2>
          
          <div className="network-totals">
            <div className="total-card">
              <div className="total-label">Total Branches</div>
              <div className="total-value">{networkData.network_totals.total_branches}</div>
            </div>
            <div className="total-card">
              <div className="total-label">Total Views</div>
              <div className="total-value">{networkData.network_totals.total_views.toLocaleString()}</div>
            </div>
            <div className="total-card">
              <div className="total-label">Total Followers</div>
              <div className="total-value">{networkData.network_totals.total_followers.toLocaleString()}</div>
            </div>
            <div className="total-card">
              <div className="total-label">Avg Health Score</div>
              <div className="total-value">{networkData.network_totals.avg_health_score}</div>
            </div>
          </div>

          <div className="network-insights">
            {networkData.fastest_growing && (
              <div className="insight-card growing">
                <h4>Fastest Growing</h4>
                <p>{networkData.fastest_growing.branch_name}</p>
                <span className="growth-rate">+{networkData.fastest_growing.growth_rate}%</span>
              </div>
            )}
            {networkData.needs_attention && (
              <div className="insight-card attention">
                <h4>Needs Attention</h4>
                <p>{networkData.needs_attention.branch_name}</p>
                <span className="health-score">Health: {networkData.needs_attention.health_score}</span>
              </div>
            )}
          </div>

          <div className="branch-table">
            <h3>Branch Rankings</h3>
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Health Score</th>
                  <th>Views</th>
                  <th>Followers</th>
                  <th>Growth Rate</th>
                </tr>
              </thead>
              <tbody>
                {networkData.branches.map((branch, idx) => (
                  <tr key={branch.branch_id}>
                    <td>{branch.branch_name}</td>
                    <td>{branch.health_score}</td>
                    <td>{branch.total_views.toLocaleString()}</td>
                    <td>{branch.followers.toLocaleString()}</td>
                    <td className={branch.growth_rate > 0 ? 'positive' : 'negative'}>
                      {branch.growth_rate > 0 ? '+' : ''}{branch.growth_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkBenchmarkPage;
