import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import './Navbar.css';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4L6 12v16h20V12L16 4z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <rect x="12" y="16" width="8" height="12" fill="currentColor" opacity="0.2"/>
          </svg>
          <span>ChurchNavigator</span>
        </Link>

        <div className="navbar__search-desktop">
          <SearchBar variant="navbar" placeholder="Search churches, events..." />
        </div>

        <div className="navbar__links">
          <Link to="/churches" className="navbar__link">Churches</Link>
          <Link to="/events" className="navbar__link">Events</Link>
          <Link to="/worship-leaders" className="navbar__link">Worship Leaders</Link>
          <Link to="/about" className="navbar__link">About</Link>
        </div>

        <button 
          className="navbar__mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            ) : (
              <>
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="navbar__mobile-menu">
          <div className="navbar__search-mobile">
            <SearchBar variant="navbar" placeholder="Search..." />
          </div>
          <Link to="/churches" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Churches</Link>
          <Link to="/events" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Events</Link>
          <Link to="/worship-leaders" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>Worship Leaders</Link>
          <Link to="/about" className="navbar__mobile-link" onClick={() => setMobileMenuOpen(false)}>About</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;