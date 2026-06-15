import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.churchnavigator.com';

const LISTING_TYPES = {
  church: { label: 'Church', color: '#7c3aed', icon: '⛪' },
  pastor: { label: 'Pastor', color: '#0891b2', icon: '👨‍💼' },
  worship: { label: 'Worship Leader', color: '#059669', icon: '🎵' },
  media: { label: 'Media Team', color: '#1d4ed8', icon: '🎥' },
  college: { label: 'Bible College', color: '#d97706', icon: '🎓' }
};

const SECTIONS = {
  overview: { label: 'Overview', icon: '📊' },
  insights: { label: 'AI Insights', icon: '🤖' },
  visitors: { label: 'Visitors', icon: '👥', types: ['church', 'college'] },
  sermons: { label: 'Sermons', icon: '🎙️', types: ['pastor'] },
  bookings: { label: 'Bookings', icon: '📅', types: ['worship', 'media'] },
  enquiries: { label: 'Enquiries', icon: '✉️', types: ['worship', 'media', 'college'] },
  applications: { label: 'Applications', icon: '📝', types: ['college'] },
  messages: { label: 'Messages', icon: '💬' },
  followers: { label: 'Followers', icon: '❤️' },
  social: { label: 'Social Media', icon: '📱' },
  events: { label: 'Events', icon: '🎉' },
  posts: { label: 'Posts & Feed', icon: '📰' },
  profile: { label: 'Profile Settings', icon: '⚙️' }
};

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section = 'overview' } = useParams();

  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [currentListing, setCurrentListing] = useState(null);
  const [listingType, setListingType] = useState('church');
  const [network, setNetwork] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (currentListing) {
      fetchDashboardData();
      if (listingType === 'church') fetchNetwork();
    }
  }, [currentListing, section]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      if (res.data.listings && res.data.listings.length > 0) {
        const churchListings = res.data.listings.filter(l => l.type === 'church');
        const allListings = res.data.listings;
        setListings(allListings);
        setCurrentListing(churchListings[0] || allListings[0]);
        setListingType(churchListings[0]?.type || allListings[0]?.type || 'church');
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      if (err.response?.status === 401) navigate('/login');
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    if (!currentListing) return;
    try {
      const token = localStorage.getItem('auth_token');
      const endpoint = listingType === 'church' 
        ? `/api/churches/${currentListing.slug}/dashboard`
        : `/api/${listingType}s/${currentListing.slug}/dashboard`;
      const res = await axios.get(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const fetchNetwork = async () => {
    if (!currentListing || listingType !== 'church') return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/churches/${currentListing.slug}/network`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNetwork(res.data);
    } catch (err) {
      console.error('Failed to fetch network:', err);
    }
  };

  const switchListingType = (type) => {
    const typeListings = listings.filter(l => l.type === type);
    if (typeListings.length > 0) {
      setListingType(type);
      setCurrentListing(typeListings[0]);
      setNetwork(null);
    }
  };

  const switchListing = (listing) => {
    setCurrentListing(listing);
  };

  const navigateSection = (sec) => {
    navigate(`/dashboard/${sec}`);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!currentListing) {
    return (
      <div className="dashboard-empty">
        <h2>No listings found</h2>
        <p>You don't have any listings yet. Create one to access the dashboard.</p>
        <button onClick={() => navigate('/create-listing')}>Create Listing</button>
      </div>
    );
  }

  const currentColor = LISTING_TYPES[listingType].color;
  const availableSections = Object.entries(SECTIONS).filter(([key, val]) => 
    !val.types || val.types.includes(listingType)
  );

  return (
    <div className="dashboard" style={{ '--primary-color': currentColor }}>
      <button 
        className="sidebar-toggle" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>Dashboard</h1>
        </div>

        <div className="listing-type-switcher">
          {Object.entries(LISTING_TYPES).map(([type, config]) => {
            const count = listings.filter(l => l.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                className={`type-btn ${listingType === type ? 'active' : ''}`}
                onClick={() => switchListingType(type)}
                style={listingType === type ? { backgroundColor: config.color } : {}}
              >
                <span className="icon">{config.icon}</span>
                <span className="label">{config.label}</span>
                {count > 1 && <span className="badge">{count}</span>}
              </button>
            );
          })}
        </div>

        {listings.filter(l => l.type === listingType).length > 1 && (
          <div className="listing-switcher">
            <label>Select Listing:</label>
            <select 
              value={currentListing.id} 
              onChange={(e) => {
                const listing = listings.find(l => l.id === e.target.value);
                switchListing(listing);
              }}
            >
              {listings.filter(l => l.type === listingType).map(listing => (
                <option key={listing.id} value={listing.id}>{listing.name}</option>
              ))}
            </select>
          </div>
        )}

        {network && network.branches && network.branches.length > 0 && (
          <div className="network-switcher">
            <label>Network View:</label>
            <select onChange={(e) => {
              if (e.target.value === 'all') return;
              const branch = network.branches.find(b => b.id === e.target.value);
              if (branch) navigate(`/church/${branch.slug}`);
            }}>
              <option value="current">{currentListing.name} (current)</option>
              {network.parent && (
                <option value={network.parent.id}>{network.parent.name} (parent)</option>
              )}
              {network.branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
              <option value="all">View All Network</option>
            </select>
          </div>
        )}

        <nav className="sidebar-nav">
          {availableSections.map(([key, config]) => (
            <button
              key={key}
              className={`nav-item ${section === key ? 'active' : ''}`}
              onClick={() => navigateSection(key)}
            >
              <span className="icon">{config.icon}</span>
              <span className="label">{config.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/')} className="btn-secondary">← Back to Site</button>
          <button onClick={() => {
            localStorage.removeItem('auth_token');
            navigate('/login');
          }} className="btn-logout">Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <DashboardContent 
          section={section}
          listing={currentListing}
          listingType={listingType}
          data={dashboardData}
          network={network}
          user={user}
        />
      </main>
    </div>
  );
}

function DashboardContent({ section, listing, listingType, data, network, user }) {
  switch (section) {
    case 'overview':
      return <OverviewSection listing={listing} data={data} network={network} />;
    case 'insights':
      return <InsightsSection listing={listing} data={data} />;
    case 'visitors':
      return <VisitorsSection listing={listing} />;
    case 'sermons':
      return <SermonsSection listing={listing} />;
    case 'bookings':
      return <BookingsSection listing={listing} />;
    case 'enquiries':
      return <EnquiriesSection listing={listing} />;
    case 'applications':
      return <ApplicationsSection listing={listing} />;
    case 'messages':
      return <MessagesSection listing={listing} />;
    case 'followers':
      return <FollowersSection listing={listing} />;
    case 'social':
      return <SocialSection listing={listing} />;
    case 'events':
      return <EventsSection listing={listing} />;
    case 'posts':
      return <PostsSection listing={listing} />;
    case 'profile':
      return <ProfileSection listing={listing} listingType={listingType} user={user} />;
    default:
      return <OverviewSection listing={listing} data={data} network={network} />;
  }
}

function OverviewSection({ listing, data, network }) {
  const stats = data?.stats || {};
  const healthScore = stats.health_score || 0;
  const recentActivity = data?.recent_activity || [];
  const upcomingEvents = data?.upcoming_events || [];

  return (
    <div className="section-overview">
      <div className="section-header">
        <h2>Welcome back, {listing.name}!</h2>
        <p className="subtitle">Here's what's happening with your listing</p>
      </div>

      <div className="health-card">
        <div className="health-score">
          <div className="score-circle" style={{ '--score': healthScore }}>
            <span className="score-value">{healthScore}</span>
            <span className="score-label">Health Score</span>
          </div>
        </div>
        <div className="health-tips">
          <h3>Quick Tips to Improve</h3>
          <ul>
            <li>✓ Add more photos (current: {stats.photo_count || 0})</li>
            <li>✓ Complete your profile details</li>
            <li>✓ Post regular updates</li>
            <li>✓ Respond to visitor messages</li>
          </ul>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">👁️</div>
          <div className="metric-value">{stats.views_30d || 0}</div>
          <div className="metric-label">Profile Views (30d)</div>
          <div className="metric-change positive">+12%</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-value">{stats.visitors_30d || 0}</div>
          <div className="metric-label">Visitors (30d)</div>
          <div className="metric-change positive">+8%</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">❤️</div>
          <div className="metric-value">{stats.followers || 0}</div>
          <div className="metric-label">Followers</div>
          <div className="metric-change positive">+5</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">💬</div>
          <div className="metric-value">{stats.messages_unread || 0}</div>
          <div className="metric-label">Unread Messages</div>
        </div>
      </div>

      {network && network.branches && network.branches.length > 0 && (
        <div className="network-overview">
          <h3>Network Overview</h3>
          <div className="network-stats">
            <p>Parent: {network.parent?.name || 'None'}</p>
            <p>Branches: {network.branches.length}</p>
            <p>Total Network Members: {network.total_members || 0}</p>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="activity-feed">
          <h3>Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="empty-state">No recent activity</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.slice(0, 5).map((activity, i) => (
                <li key={i}>
                  <span className="activity-icon">{activity.icon || '•'}</span>
                  <span className="activity-text">{activity.text}</span>
                  <span className="activity-time">{activity.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="upcoming-events">
          <h3>Upcoming Events</h3>
          {upcomingEvents.length === 0 ? (
            <p className="empty-state">No upcoming events</p>
          ) : (
            <ul className="events-list">
              {upcomingEvents.slice(0, 3).map((event, i) => (
                <li key={i}>
                  <strong>{event.title}</strong>
                  <span>{event.date} • {event.time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsSection({ listing, data }) {
  return (
    <div className="section-insights">
      <h2>AI Insights</h2>
      <div className="insight-card">
        <h3>🤖 AI Analyser</h3>
        <p>Your listing is performing well in searches for "church near me" and "sunday service".</p>
        <p>Suggestion: Add more keywords like "family church" and "youth ministry" to improve discoverability.</p>
      </div>
      <div className="insight-card">
        <h3>📈 Trending</h3>
        <p>Top trending keywords in your area: community events, worship nights, bible study groups</p>
      </div>
      <div className="insight-card">
        <h3>💡 How to Improve</h3>
        <ul>
          <li>Add high-quality photos (boosts views by 40%)</li>
          <li>Post weekly updates (increases engagement by 25%)</li>
          <li>Enable online bookings (converts 15% more visitors)</li>
        </ul>
      </div>
      <div className="insight-card">
        <h3>👥 Audience Insights</h3>
        <p>Most visitors are aged 25-44, visiting on Sundays and Wednesdays.</p>
      </div>
      <div className="insight-card">
        <h3>⚖️ Compare with Similar Listings</h3>
        <p>You're in the top 20% for profile completeness, but 50% below average for social media activity.</p>
      </div>
    </div>
  );
}

function VisitorsSection({ listing }) {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
  }, [listing]);

  const fetchVisitors = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/visits/${listing.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVisitors(res.data.visits || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
      setLoading(false);
    }
  };

  return (
    <div className="section-visitors">
      <h2>Visitors</h2>
      {loading ? (
        <p>Loading visitors...</p>
      ) : visitors.length === 0 ? (
        <p className="empty-state">No visitors yet</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Visit Date</th>
              <th>QR Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((visitor, i) => (
              <tr key={i}>
                <td>{visitor.name}</td>
                <td>{visitor.email}</td>
                <td>{visitor.phone || 'N/A'}</td>
                <td>{visitor.visit_date}</td>
                <td>{visitor.qr_scanned ? '✓' : '–'}</td>
                <td><button className="btn-small">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SermonsSection({ listing }) {
  return (
    <div className="section-sermons">
      <h2>Sermons</h2>
      <button className="btn-primary">+ Upload Sermon</button>
      <p className="empty-state">No sermons uploaded yet</p>
    </div>
  );
}

function BookingsSection({ listing }) {
  return (
    <div className="section-bookings">
      <h2>Bookings</h2>
      <p className="empty-state">No bookings yet</p>
    </div>
  );
}

function EnquiriesSection({ listing }) {
  return (
    <div className="section-enquiries">
      <h2>Enquiries</h2>
      <p className="empty-state">No enquiries yet</p>
    </div>
  );
}

function ApplicationsSection({ listing }) {
  return (
    <div className="section-applications">
      <h2>Applications</h2>
      <p className="empty-state">No applications yet</p>
    </div>
  );
}

function MessagesSection({ listing }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [listing]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/messages/${listing.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.messages || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setLoading(false);
    }
  };

  return (
    <div className="section-messages">
      <h2>Messages</h2>
      {loading ? (
        <p>Loading messages...</p>
      ) : messages.length === 0 ? (
        <p className="empty-state">No messages yet</p>
      ) : (
        <ul className="messages-list">
          {messages.map((msg, i) => (
            <li key={i} className={msg.read ? 'read' : 'unread'}>
              <div className="msg-header">
                <strong>{msg.sender_name}</strong>
                <span className="msg-time">{msg.created_at}</span>
              </div>
              <p className="msg-preview">{msg.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FollowersSection({ listing }) {
  const [followers, setFollowers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowers();
  }, [listing]);

  const fetchFollowers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_BASE}/api/follows/count/church/${listing.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCount(res.data.count || 0);
      setFollowers(res.data.followers || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch followers:', err);
      setLoading(false);
    }
  };

  return (
    <div className="section-followers">
      <h2>Followers ({count})</h2>
      {loading ? (
        <p>Loading followers...</p>
      ) : followers.length === 0 ? (
        <p className="empty-state">No followers yet</p>
      ) : (
        <ul className="followers-list">
          {followers.map((follower, i) => (
            <li key={i}>
              <img src={follower.avatar || '/default-avatar.png'} alt={follower.name} />
              <span>{follower.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SocialSection({ listing }) {
  return (
    <div className="section-social">
      <h2>Social Media</h2>
      <p>Connect your social media accounts to auto-post updates.</p>
      <div className="social-buttons">
        <button className="btn-social facebook">Connect Facebook</button>
        <button className="btn-social instagram">Connect Instagram</button>
        <button className="btn-social twitter">Connect Twitter</button>
      </div>
    </div>
  );
}

function EventsSection({ listing }) {
  return (
    <div className="section-events">
      <h2>Events</h2>
      <button className="btn-primary">+ Create Event</button>
      <p className="empty-state">No events yet</p>
    </div>
  );
}

function PostsSection({ listing }) {
  return (
    <div className="section-posts">
      <h2>Posts & Feed</h2>
      <button className="btn-primary">+ New Post</button>
      <p className="empty-state">No posts yet</p>
    </div>
  );
}

function ProfileSection({ listing, listingType, user }) {
  return (
    <div className="section-profile">
      <h2>Profile Settings</h2>
      <form className="profile-form">
        <div className="form-group">
          <label>Listing Name</label>
          <input type="text" defaultValue={listing.name} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows="4" defaultValue={listing.description}></textarea>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" defaultValue={listing.address} />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input type="tel" defaultValue={listing.phone} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" defaultValue={listing.email} />
        </div>
        <div className="form-group">
          <label>Website</label>
          <input type="url" defaultValue={listing.website} />
        </div>
        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </div>
  );
}

export default Dashboard;