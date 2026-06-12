import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AnalyticsPage.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

function AnalyticsPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [spikes, setSpikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchSpikes();
  }, [listingId]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tools/analytics/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 403) {
        setError('Standard plan required to view analytics');
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchSpikes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tools/analytics/${listingId}/spikes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSpikes(data.spikes || []);
      }
    } catch (err) {
      console.error('Failed to fetch spikes:', err);
    }
  };

  if (loading) return <div className="analytics-page"><div className="loading">Loading analytics...</div></div>;
  if (error) return <div className="analytics-page"><div className="error">{error}</div></div>;
  if (!analytics) return null;

  const weekTrend = analytics.views_this_week - (analytics.weekly_trend[analytics.weekly_trend.length - 2]?.count || 0);
  const trendDirection = weekTrend > 0 ? '↑' : weekTrend < 0 ? '↓' : '→';
  const trendClass = weekTrend > 0 ? 'positive' : weekTrend < 0 ? 'negative' : 'neutral';

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <button onClick={() => navigate('/tools')} className="back-btn">← Back to Tools</button>
      </div>

      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="kpi-label">Total Views</div>
          <div className="kpi-value">{analytics.total_views.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">This Week</div>
          <div className="kpi-value">
            {analytics.views_this_week.toLocaleString()}
            <span className={`trend ${trendClass}`}>{trendDirection} {Math.abs(weekTrend)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">This Month</div>
          <div className="kpi-value">{analytics.views_this_month.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">This Year</div>
          <div className="kpi-value">{analytics.views_this_year.toLocaleString()}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card full-width">
          <h3>52-Week View Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#4ECDC4" name="Views" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Monthly Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#45B7D1" name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Traffic Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={analytics.sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label>
                {analytics.sources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Most Viewed Tabs</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.top_tabs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="tab" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#FF6B6B" name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Device Split</h3>
          <div className="device-split">
            <div className="device-item">
              <div className="device-label">Mobile</div>
              <div className="device-bar">
                <div className="device-fill" style={{ width: `${analytics.device_split.mobile_pct}%` }}></div>
              </div>
              <div className="device-value">{analytics.device_split.mobile_pct}%</div>
            </div>
            <div className="device-item">
              <div className="device-label">Desktop</div>
              <div className="device-bar">
                <div className="device-fill" style={{ width: `${analytics.device_split.desktop_pct}%` }}></div>
              </div>
              <div className="device-value">{analytics.device_split.desktop_pct}%</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Top Locations</h3>
          <div className="geographic-list">
            {analytics.geographic.map((geo, idx) => (
              <div key={idx} className="geo-item">
                <span className="geo-rank">#{idx + 1}</span>
                <span className="geo-city">{geo.city}</span>
                <span className="geo-count">{geo.count} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analytics.event_impact.length > 0 && (
        <div className="chart-card full-width">
          <h3>Event Impact</h3>
          <div className="event-impact-list">
            {analytics.event_impact.map((event, idx) => (
              <div key={idx} className={`event-item ${event.views_spike_pct > 0 ? 'positive' : 'negative'}`}>
                <div className="event-name">{event.event_name}</div>
                <div className="event-date">{new Date(event.date).toLocaleDateString()}</div>
                <div className="event-spike">{event.views_spike_pct > 0 ? '+' : ''}{event.views_spike_pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {spikes.length > 0 && (
        <div className="chart-card full-width">
          <h3>View Spikes & Drops</h3>
          <div className="spikes-list">
            {spikes.map((spike, idx) => (
              <div key={idx} className={`spike-item ${spike.type}`}>
                <div className="spike-header">
                  <span className="spike-type">{spike.type === 'spike' ? '📈' : '📉'} {spike.type.toUpperCase()}</span>
                  <span className="spike-date">{new Date(spike.week).toLocaleDateString()}</span>
                  <span className="spike-pct">{spike.pct_change > 0 ? '+' : ''}{spike.pct_change}%</span>
                </div>
                <div className="spike-cause">{spike.likely_cause}</div>
                <div className="spike-explanation">{spike.ai_explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="premium-cta">
        <h3>🔒 Unlock Premium Analytics</h3>
        <ul>
          <li>Advanced demographic insights</li>
          <li>Conversion tracking</li>
          <li>Custom date ranges</li>
          <li>Export reports (PDF/CSV)</li>
          <li>Email alerts for spikes</li>
        </ul>
        <button onClick={() => navigate('/pricing')} className="upgrade-btn">Upgrade to Premium</button>
      </div>
    </div>
  );
}

export default AnalyticsPage;