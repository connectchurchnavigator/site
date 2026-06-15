import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './StatsCounter.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.churchnavigator.com';

const StatsCounter = () => {
  const [stats, setStats] = useState(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_BASE}/homepage/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateCount = (target) => {
    if (!hasAnimated) return 0;
    return target;
  };

  if (!stats) return null;

  const displayChurches = stats.churches > 1000 ? '29,000+' : stats.churches.toLocaleString();

  return (
    <section className="stats-counter" ref={sectionRef}>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{displayChurches}</div>
          <div className="stat-label">Churches</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{animateCount(stats.events).toLocaleString()}</div>
          <div className="stat-label">Upcoming Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{animateCount(stats.cities).toLocaleString()}</div>
          <div className="stat-label">Cities</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{animateCount(stats.registered_users).toLocaleString()}</div>
          <div className="stat-label">Believers Connected</div>
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;