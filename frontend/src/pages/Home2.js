import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import './Home2.css';

const Home2 = () => {
  const navigate = useNavigate();
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (searchParams) => {
    const params = new URLSearchParams();
    if (searchParams.location) params.set('location', searchParams.location);
    if (searchParams.denomination) params.set('denomination', searchParams.denomination);
    if (searchParams.serviceTime) params.set('serviceTime', searchParams.serviceTime);
    navigate(`/search?${params.toString()}`);
  };

  const toolsMenuItems = [
    { name: 'Health Score Checker', tier: 'Free', tierClass: 'free', link: '/tools/health-check' },
    { name: 'View Analytics', tier: 'Standard', tierClass: 'standard', link: '/tools/analytics' },
    { name: 'Social Media Health', tier: 'Standard', tierClass: 'standard', link: '/tools/social' },
    { name: 'AI Pattern Intelligence', tier: 'Premium', tierClass: 'premium', link: '/tools/intelligence' },
    { name: 'Network Benchmarking', tier: 'Premium', tierClass: 'premium', link: '/tools/network' }
  ];

  return (
    <div className="home2-page">
      <header className="home2-header">
        <div className="container">
          <nav className="home2-nav">
            <Link to="/" className="logo">ChurchNavigator</Link>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/search">Find a Church</Link>
              <div 
                className="nav-dropdown"
                onMouseEnter={() => setShowToolsDropdown(true)}
                onMouseLeave={() => setShowToolsDropdown(false)}
              >
                <Link to="/tools" className="nav-link-with-dropdown">
                  Tools <span className="dropdown-arrow">▼</span>
                </Link>
                {showToolsDropdown && (
                  <div className="dropdown-menu">
                    {toolsMenuItems.map((item, idx) => (
                      <Link key={idx} to={item.link} className="dropdown-item">
                        <span className="item-name">{item.name}</span>
                        <span className={`item-tier ${item.tierClass}`}>{item.tier}</span>
                      </Link>
                    ))}
                    <div className="dropdown-divider"></div>
                    <Link to="/tools" className="dropdown-item view-all">
                      View All Tools →
                    </Link>
                  </div>
                )}
              </div>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="nav-actions">
              <Link to="/login" className="btn-login">Login</Link>
              <Link to="/register" className="btn-register">Add Your Church</Link>
            </div>
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              ☰
            </button>
          </nav>
          {isMobileMenuOpen && (
            <div className="mobile-menu">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
              <Link to="/search" onClick={() => setIsMobileMenuOpen(false)}>Find a Church</Link>
              <Link to="/tools" onClick={() => setIsMobileMenuOpen(false)}>Tools</Link>
              <Link to="/about" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
              <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>Contact</Link>
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>Add Your Church</Link>
            </div>
          )}
        </div>
      </header>

      <section className="hero-section">
        <div className="container">
          <h1>Find Your Church Home</h1>
          <p className="hero-subtitle">Discover welcoming churches across the UK</p>
          <SearchBar onSearch={handleSearch} />
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <h2>Why ChurchNavigator?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Easy Search</h3>
              <p>Find churches by location, denomination, or service times</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✓</div>
              <h3>Verified Listings</h3>
              <p>Accurate, up-to-date information verified by church leaders</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Tools</h3>
              <p>Analytics and insights to help churches grow their reach</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>UK Coverage</h3>
              <p>Comprehensive directory of churches across the United Kingdom</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-number">12,000+</div>
              <div className="stat-label">Churches Listed</div>
            </div>
            <div className="stat">
              <div className="stat-number">500K+</div>
              <div className="stat-label">Monthly Visitors</div>
            </div>
            <div className="stat">
              <div className="stat-number">95%</div>
              <div className="stat-label">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Is Your Church Listed?</h2>
          <p>Join thousands of churches connecting with seekers across the UK</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn-cta-primary">Add Your Church</Link>
            <Link to="/tools" className="btn-cta-secondary">Explore Tools</Link>
          </div>
        </div>
      </section>

      <footer className="home2-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-col">
              <h4>ChurchNavigator</h4>
              <p>Connecting seekers with churches across the UK</p>
            </div>
            <div className="footer-col">
              <h4>Quick Links</h4>
              <Link to="/search">Find a Church</Link>
              <Link to="/tools">Tools</Link>
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="footer-col">
              <h4>For Churches</h4>
              <Link to="/register">Add Your Church</Link>
              <Link to="/login">Church Login</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ChurchNavigator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home2;