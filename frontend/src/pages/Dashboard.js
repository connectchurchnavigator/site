import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [activeListingId, setActiveListingId] = useState(null);
  const [activeListing, setActiveListing] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUserListings(token);
  }, [navigate]);

  useEffect(() => {
    if (activeListingId && activeListing) {
      if (!activeListing.is_branch && activeListing.listing_type === 'church') {
        fetchNetworkData(activeListing.slug);
      }
    }
  }, [activeListingId, activeListing]);

  const fetchUserListings = async (token) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/me/listings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch listings');
      
      const data = await response.json();
      setListings(data.listings);
      
      const savedListingId = localStorage.getItem('active_listing_id');
      let initialListing = null;
      
      if (savedListingId) {
        initialListing = data.listings.find(l => l.listing_id === savedListingId);
      }
      
      if (!initialListing && data.listings.length > 0) {
        initialListing = data.listings[0];
      }
      
      if (initialListing) {
        setActiveListingId(initialListing.listing_id);
        setActiveListing(initialListing);
        localStorage.setItem('active_listing_id', initialListing.listing_id);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchNetworkData = async (slug) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/api/churches/${slug}/network`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch network data');
      
      const data = await response.json();
      setNetworkData(data);
    } catch (err) {
      console.error('Network data fetch error:', err);
      setNetworkData(null);
    }
  };

  const switchListing = (listing) => {
    setActiveListingId(listing.listing_id);
    setActiveListing(listing);
    localStorage.setItem('active_listing_id', listing.listing_id);
    setActiveTab('overview');
    setNetworkData(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('active_listing_id');
    navigate('/login');
  };

  const getStatusIcon = (status) => {
    if (status === 'good') return '✅';
    if (status === 'needs_attention') return '⚠️';
    return '🔴';
  };

  const renderNetworkDashboard = () => {
    if (!networkData || !networkData.branches || networkData.branches.length === 0) {
      return null;
    }

    const { combined_stats, branch_performance, insights } = networkData;

    return (
      <div className="network-dashboard">
        <div className="network-header">
          <h2>🏛️ Network Overview</h2>
          <p>{networkData.parent.name} + {combined_stats.total_branches} branches</p>
        </div>

        <div className="network-stats">
          <div className="stat-card">
            <div className="stat-value">{combined_stats.total_views.toLocaleString()}</div>
            <div className="stat-label">Total Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{combined_stats.total_checkins.toLocaleString()}</div>
            <div className="stat-label">Check-ins</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{combined_stats.total_followers.toLocaleString()}</div>
            <div className="stat-label">Followers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{combined_stats.total_messages.toLocaleString()}</div>
            <div className="stat-label">Messages</div>
          </div>
        </div>

        <div className="branch-performance">
          <h3>Branch Performance</h3>
          <table className="performance-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Views</th>
                <th>Check-ins</th>
                <th>Followers</th>
                <th>Health</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {branch_performance.map((branch) => (
                <tr key={branch.branch_id}>
                  <td>
                    <strong>{branch.name}</strong>
                  </td>
                  <td>{branch.views.toLocaleString()}</td>
                  <td>{branch.checkins.toLocaleString()}</td>
                  <td>{branch.followers.toLocaleString()}</td>
                  <td>
                    <div className="health-score">
                      <div className="health-bar" style={{ width: `${branch.health_score}%` }}></div>
                      <span>{branch.health_score}%</span>
                    </div>
                  </td>
                  <td>{getStatusIcon(branch.status)} {branch.status.replace('_', ' ')}</td>
                  <td>
                    <button 
                      className="btn-small"
                      onClick={() => {
                        const branchListing = listings.find(l => l.listing_id === branch.branch_id);
                        if (branchListing) switchListing(branchListing);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ai-insights">
          <h3>🤖 AI Network Insights</h3>
          {insights.best_performing && (
            <div className="insight-card positive">
              <strong>Best Performer:</strong> {insights.best_performing}
            </div>
          )}
          {insights.needs_attention && (
            <div className="insight-card warning">
              <strong>Needs Attention:</strong> {insights.needs_attention}
            </div>
          )}
          <div className="recommendations">
            <h4>Recommendations:</h4>
            <ul>
              {insights.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
          <button className="btn-primary" style={{ marginTop: '1rem' }}>
            📢 Post to All Branches
          </button>
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (!activeListing) return null;

    const stats = activeListing.stats || {};

    return (
      <div className="overview-tab">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.views || 0}</div>
            <div className="stat-label">Profile Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.checkins || 0}</div>
            <div className="stat-label">Check-ins</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.followers || 0}</div>
            <div className="stat-label">Followers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.messages || 0}</div>
            <div className="stat-label">Messages</div>
          </div>
        </div>

        {networkData && networkData.branches && networkData.branches.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            {renderNetworkDashboard()}
          </div>
        )}

        {(!networkData || !networkData.branches || networkData.branches.length === 0) && (
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button className="action-btn">✏️ Edit Profile</button>
            <button className="action-btn">📸 Add Photos</button>
            <button className="action-btn">📅 Update Service Times</button>
            {activeListing.listing_type === 'church' && !activeListing.is_branch && (
              <button className="action-btn">➕ Add Branch Church</button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">Error: {error}</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="dashboard-empty">
        <h2>Welcome to ChurchNavigator</h2>
        <p>You don't have any listings yet.</p>
        <button className="btn-primary" onClick={() => navigate('/add-church')}>
          + Add Your First Church
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>

        {networkData && networkData.branches && networkData.branches.length > 0 && (
          <div className="network-section">
            <div className="section-label">NETWORK VIEW</div>
            <div className="network-item">
              <span>🏛️ {networkData.parent.name} Network</span>
              <span className="network-badge">{networkData.combined_stats.total_branches} branches</span>
            </div>
          </div>
        )}

        <div className="listings-section">
          <div className="section-label">MY LISTINGS</div>
          {listings.map((listing) => (
            <div
              key={listing.listing_id}
              className={`listing-item ${activeListingId === listing.listing_id ? 'active' : ''}`}
              onClick={() => switchListing(listing)}
            >
              <div className="listing-icon">
                {listing.logo_url ? (
                  <img src={listing.logo_url} alt="" />
                ) : (
                  <span>{listing.listing_type === 'church' ? '⛪' : '👤'}</span>
                )}
              </div>
              <div className="listing-info">
                <div className="listing-name">{listing.name}</div>
                <div className="listing-role">{listing.role}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="add-listing-btn" onClick={() => navigate('/add-church')}>
          + Add New Listing
        </button>

        <button className="logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>{activeListing?.name}</h1>
            <p className="listing-type">
              {activeListing?.listing_type === 'church' ? '⛪' : '👤'} {activeListing?.role}
            </p>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            Messages
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          {networkData && networkData.branches && networkData.branches.length > 0 && (
            <button
              className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
              onClick={() => setActiveTab('branches')}
            >
              Manage Branches
            </button>
          )}
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'messages' && (
            <div className="tab-content">
              <h2>Messages</h2>
              <p>No messages yet.</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="tab-content">
              <h2>Analytics</h2>
              <p>Analytics coming soon.</p>
            </div>
          )}
          {activeTab === 'branches' && networkData && (
            <div className="tab-content">
              <h2>Manage Branches</h2>
              <div className="branches-list">
                {networkData.branches.map((branch) => (
                  <div key={branch.id} className="branch-card">
                    <h3>{branch.name}</h3>
                    <p>{branch.address}, {branch.city}</p>
                    <div className="branch-actions">
                      <button onClick={() => {
                        const branchListing = listings.find(l => l.listing_id === branch.id);
                        if (branchListing) switchListing(branchListing);
                      }}>View Dashboard</button>
                      <button>Edit</button>
                      <button>Manage Team</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ marginTop: '1rem' }}>+ Add Branch</button>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="tab-content">
              <h2>Settings</h2>
              <p>Settings coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;