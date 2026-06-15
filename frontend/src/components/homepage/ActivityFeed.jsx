import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ActivityFeed.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.churchnavigator.com';

const iconMap = {
  church: '⛪',
  calendar: '📅',
  users: '👥',
  star: '⭐',
  qrcode: '📱',
  trophy: '🏆',
  map: '🗺️',
  person: '👤'
};

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_BASE}/homepage/activity?limit=20`);
      setActivities(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="activity-loading">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <section className="activity-feed-section">
      <div className="activity-container">
        <h2 className="activity-title">Live Platform Activity</h2>
        <div className="activity-feed">
          {activities.map((activity, index) => (
            <div key={activity._id} className="activity-item" style={{ animationDelay: `${index * 0.05}s` }}>
              <div className="activity-icon" style={{ backgroundColor: activity.color }}>
                {iconMap[activity.icon] || '📌'}
              </div>
              <div className="activity-content">
                <div className="activity-header">
                  {activity.link ? (
                    <a href={activity.link} className="activity-title-link">{activity.title}</a>
                  ) : (
                    <div className="activity-title-text">{activity.title}</div>
                  )}
                  <span className="activity-time">{activity.time_ago}</span>
                </div>
                <div className="activity-subtitle">{activity.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ActivityFeed;