import React from 'react';
import { Link } from 'react-router-dom';
import './WorshipLeaderCard.css';

const WorshipLeaderCard = ({ leader }) => {
  const availabilityColors = { available: '#10b981', limited: '#f59e0b', unavailable: '#ef4444' };
  const availabilityColor = availabilityColors[leader.availability] || '#6b7280';

  return (
    <Link to={`/worship-leader/${leader.slug}`} className="wlc-card">
      <div className="wlc-image" style={{ backgroundImage: `url(${leader.profileImage || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-profile.jpg'})` }}>
        <div className="wlc-availability" style={{ backgroundColor: availabilityColor }}>
          {leader.availability === 'available' ? '✓' : leader.availability === 'limited' ? '⚠' : '✗'}
        </div>
      </div>
      <div className="wlc-content">
        <h3 className="wlc-name">{leader.name}</h3>
        <p className="wlc-instruments">{leader.instruments?.slice(0, 3).join(', ') || 'Worship Leader'}</p>
        <p className="wlc-city">{leader.city || 'UK'}</p>
      </div>
    </Link>
  );
};

export default WorshipLeaderCard;