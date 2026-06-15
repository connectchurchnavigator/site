import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UserProfilePage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const UserProfilePage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profileData, setProfileData] = useState(null);
  const [savedChurches, setSavedChurches] = useState([]);
  const [events, setEvents] = useState({ upcoming: [], past: [] });
  const [prayerHistory, setPrayerHistory] = useState({ submitted: [], offered: [] });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', photo_url: '' });
  const [notifications, setNotifications] = useState({
    weekly_digest: true,
    event_reminders: true,
    new_follower_alerts: true,
    prayer_responses: true,
    digest_frequency: 'weekly'
  });

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/profile');
      return;
    }
    fetchProfileData();
  }, [token, navigate]);

  const fetchProfileData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profile, churches, eventsData, prayers] = await Promise.all([
        fetch(`${API_URL}/api/users/me/profile`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/users/me/saved-churches`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/users/me/registered-events`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/users/me/prayer-history`, { headers }).then(r => r.json())
      ]);
      
      setProfileData(profile);
      setSavedChurches(churches.churches || []);
      setEvents(eventsData);
      setPrayerHistory(prayers);
      setFormData({ name: profile.user.name, photo_url: profile.user.photo_url || '' });
      setNotifications(profile.user.notification_preferences);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: formData.name, photo_url: formData.photo_url })
      });
      if (response.ok) {
        await fetchProfileData();
        setEditMode(false);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleUpdateNotifications = async () => {
    try {
      await fetch(`${API_URL}/api/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notification_preferences: notifications })
      });
      alert('Notification settings saved');
    } catch (err) {
      console.error('Failed to update notifications:', err);
    }
  };

  const handleUnfollow = async (churchId) => {
    try {
      await fetch(`${API_URL}/api/users/me/saved-churches/${churchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedChurches(savedChurches.filter(c => c._id !== churchId));
    } catch (err) {
      console.error('Failed to unfollow:', err);
    }
  };

  if (loading) return <div className="profile-loading">Loading your profile...</div>;
  if (!profileData) return <div className="profile-error">Failed to load profile</div>;

  const { user: userData, stats, recent_activity } = profileData;
  const memberSince = new Date(userData.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="user-profile-page">
      <div className="profile-header">
        <div className="profile-header-content">
          <div className="profile-avatar">
            {userData.photo_url ? (
              <img src={userData.photo_url} alt={userData.name} />
            ) : (
              <div className="avatar-placeholder">{userData.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="profile-info">
            <h1>{userData.name}</h1>
            <p className="member-since">Member since {memberSince}</p>
          </div>
          <button className="edit-profile-btn" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {editMode && (
        <div className="edit-profile-section">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="url"
            placeholder="Photo URL"
            value={formData.photo_url}
            onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
          />
          <button onClick={handleUpdateProfile}>Save Changes</button>
        </div>
      )}

      <div className="profile-tabs">
        {['overview', 'saved', 'events', 'prayers', 'settings'].map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{stats.churches_followed}</h3>
                <p>Churches Followed</p>
              </div>
              <div className="stat-card">
                <h3>{stats.events_attended}</h3>
                <p>Events Attended</p>
              </div>
              <div className="stat-card">
                <h3>{stats.prayers_offered}</h3>
                <p>Prayers Offered</p>
              </div>
            </div>
            <div className="recent-activity">
              <h2>Recent Activity</h2>
              {recent_activity.length === 0 ? (
                <p className="no-activity">No recent activity</p>
              ) : (
                <ul>
                  {recent_activity.map((activity, idx) => (
                    <li key={idx}>
                      {activity.type === 'saved_church' && (
                        <span>Followed <strong>{activity.data.church_name}</strong></span>
                      )}
                      {activity.type === 'registered_event' && (
                        <span>Registered for <strong>{activity.data.event_title}</strong></span>
                      )}
                      <span className="activity-time">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="saved-tab">
            <h2>Saved Churches</h2>
            {savedChurches.length === 0 ? (
              <p className="no-items">You haven't saved any churches yet</p>
            ) : (
              <div className="churches-grid">
                {savedChurches.map(church => (
                  <div key={church._id} className="church-card">
                    {church.image_url && <img src={church.image_url} alt={church.name} />}
                    <h3>{church.name}</h3>
                    <p>{church.city}, {church.county}</p>
                    <p className="denomination">{church.denomination}</p>
                    <div className="church-actions">
                      <Link to={`/church/${church.slug}`}>View Church</Link>
                      <button onClick={() => handleUnfollow(church._id)}>Unfollow</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-tab">
            <h2>Upcoming Events</h2>
            {events.upcoming.length === 0 ? (
              <p className="no-items">No upcoming events</p>
            ) : (
              <ul className="events-list">
                {events.upcoming.map(event => (
                  <li key={event._id} className="event-item">
                    <h3>{event.title}</h3>
                    <p>{new Date(event.start_datetime).toLocaleString('en-GB')}</p>
                    <p className="church-name">{event.church_name}</p>
                    {event.qr_code && (
                      <a href={`mailto:${userData.email}?subject=Your ticket`} className="view-ticket">View Ticket</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <h2 className="past-events-heading">Past Events</h2>
            {events.past.length === 0 ? (
              <p className="no-items">No past events</p>
            ) : (
              <ul className="events-list">
                {events.past.map(event => (
                  <li key={event._id} className="event-item">
                    <h3>{event.title}</h3>
                    <p>{new Date(event.start_datetime).toLocaleString('en-GB')}</p>
                    {!event.has_reviewed && (
                      <button className="review-btn">Leave Review</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'prayers' && (
          <div className="prayers-tab">
            <h2>Prayer Requests Submitted</h2>
            {prayerHistory.submitted.length === 0 ? (
              <p className="no-items">No prayer requests submitted</p>
            ) : (
              <ul className="prayer-list">
                {prayerHistory.submitted.map(req => (
                  <li key={req._id}>
                    <p className="prayer-text">{req.request_text}</p>
                    <p className="prayer-meta">{req.prayer_count} prayers • {new Date(req.created_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="prayers-offered-heading">Prayers Offered</h2>
            {prayerHistory.offered.length === 0 ? (
              <p className="no-items">No prayers offered yet</p>
            ) : (
              <ul className="prayer-list">
                {prayerHistory.offered.map((prayer, idx) => (
                  <li key={idx}>
                    <p className="prayer-text">{prayer.request_text}</p>
                    <p className="prayer-meta">Prayed on {new Date(prayer.prayed_at).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h2>Notification Settings</h2>
            <div className="notification-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={notifications.weekly_digest}
                  onChange={(e) => setNotifications({ ...notifications, weekly_digest: e.target.checked })}
                />
                Weekly Digest Email
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={notifications.event_reminders}
                  onChange={(e) => setNotifications({ ...notifications, event_reminders: e.target.checked })}
                />
                Event Reminders
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={notifications.new_follower_alerts}
                  onChange={(e) => setNotifications({ ...notifications, new_follower_alerts: e.target.checked })}
                />
                New Follower Alerts
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={notifications.prayer_responses}
                  onChange={(e) => setNotifications({ ...notifications, prayer_responses: e.target.checked })}
                />
                Prayer Response Notifications
              </label>
              <label>
                Digest Frequency:
                <select
                  value={notifications.digest_frequency}
                  onChange={(e) => setNotifications({ ...notifications, digest_frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
            </div>
            <button className="save-settings-btn" onClick={handleUpdateNotifications}>Save Settings</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;