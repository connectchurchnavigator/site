import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (searchType !== 'all') params.append('type', searchType);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">Discover Churches Across the UK</h1>
        <p className="hero-subtitle">
          29,000+ churches, pastors, events and ministries — all in one place. Free to explore.
        </p>
        
        <form className="hero-search" onSubmit={handleSearch}>
          <div className="search-input-group">
            <select 
              className="search-type-select"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
            >
              <option value="all">All</option>
              <option value="churches">Churches</option>
              <option value="events">Events</option>
              <option value="pastors">Pastors</option>
              <option value="worship_leaders">Worship Leaders</option>
            </select>
            <input
              type="text"
              className="search-input"
              placeholder="Search churches, pastors, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </div>
        </form>

        <div className="hero-quick-links">
          <a href="/churches" className="quick-link">Churches</a>
          <a href="/events" className="quick-link">Events</a>
          <a href="/pastors" className="quick-link">Pastors</a>
          <a href="/worship-leaders" className="quick-link">Worship Leaders</a>
          <a href="/planner" className="quick-link">Planner</a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;