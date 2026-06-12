import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './PastorSearchPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const DENOMINATIONS = ['Anglican', 'Baptist', 'Catholic', 'Pentecostal', 'Methodist', 'Presbyterian', 'Non-denominational'];
const LANGUAGES = ['English', 'Welsh', 'Polish', 'Spanish', 'French', 'Portuguese', 'Yoruba', 'Igbo'];
const AVAILABILITY_OPTIONS = ['Sunday Services', 'Conferences', 'International'];
const TRAVEL_OPTIONS = ['Local', 'Regional', 'UK', 'International'];

function PastorSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pastors, setPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [selectedDenominations, setSelectedDenominations] = useState(
    searchParams.get('denomination')?.split(',').filter(Boolean) || []
  );
  const [selectedTopics, setSelectedTopics] = useState(
    searchParams.get('topic')?.split(',').filter(Boolean) || []
  );
  const [selectedLanguages, setSelectedLanguages] = useState(
    searchParams.get('language')?.split(',').filter(Boolean) || []
  );
  const [selectedAvailability, setSelectedAvailability] = useState(
    searchParams.get('availability')?.split(',').filter(Boolean) || []
  );
  const [selectedTravel, setSelectedTravel] = useState(searchParams.get('travel') || '');
  const [radius, setRadius] = useState(parseInt(searchParams.get('radius')) || 50);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    fetchPastors();
  }, [page, sortBy]);

  const fetchPastors = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (city) params.append('city', city);
      if (selectedDenominations.length) params.append('denomination', selectedDenominations[0]);
      if (selectedTopics.length) params.append('topic', selectedTopics[0]);
      if (selectedLanguages.length) params.append('language', selectedLanguages[0]);
      if (selectedAvailability.length) params.append('availability', selectedAvailability[0]);
      if (selectedTravel) params.append('travel', selectedTravel);
      if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radius', radius);
      }
      params.append('page', page);
      params.append('limit', 20);
      params.append('sort', sortBy);

      const response = await axios.get(`${API_URL}/api/pastors/search?${params.toString()}`);
      setPastors(response.data.pastors);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch (err) {
      setError('Failed to load pastors. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPastors();
  };

  const toggleDenomination = (denom) => {
    setSelectedDenominations(prev =>
      prev.includes(denom) ? prev.filter(d => d !== denom) : [...prev, denom]
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleAvailability = (avail) => {
    setSelectedAvailability(prev =>
      prev.includes(avail) ? prev.filter(a => a !== avail) : [...prev, avail]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCity('');
    setSelectedDenominations([]);
    setSelectedTopics([]);
    setSelectedLanguages([]);
    setSelectedAvailability([]);
    setSelectedTravel('');
    setRadius(50);
    setPage(1);
    fetchPastors();
  };

  return (
    <div className="pastor-search-page">
      <div className="search-hero">
        <div className="container">
          <h1>Find a Pastor</h1>
          <p>Connect with experienced pastors for guest speaking, conferences, and special services</p>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search by name, topic, denomination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">Search</button>
          </form>
        </div>
      </div>

      <div className="container search-content">
        <aside className="filters-sidebar">
          <div className="filter-section">
            <h3>Location</h3>
            <input
              type="text"
              placeholder="City or postcode"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="filter-input"
            />
            <div className="radius-slider">
              <label>Radius: {radius} miles</label>
              <input
                type="range"
                min="10"
                max="200"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="filter-section">
            <h3>Denomination</h3>
            <div className="chip-group">
              {DENOMINATIONS.map(denom => (
                <button
                  key={denom}
                  onClick={() => toggleDenomination(denom)}
                  className={`chip ${selectedDenominations.includes(denom) ? 'active' : ''}`}
                >
                  {denom}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Languages</h3>
            <div className="chip-group">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`chip ${selectedLanguages.includes(lang) ? 'active' : ''}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Availability</h3>
            {AVAILABILITY_OPTIONS.map(avail => (
              <label key={avail} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedAvailability.includes(avail)}
                  onChange={() => toggleAvailability(avail)}
                />
                {avail}
              </label>
            ))}
          </div>

          <div className="filter-section">
            <h3>Travel Range</h3>
            <select
              value={selectedTravel}
              onChange={(e) => setSelectedTravel(e.target.value)}
              className="filter-select"
            >
              <option value="">Any</option>
              {TRAVEL_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <button onClick={clearFilters} className="clear-filters-btn">Clear All Filters</button>
        </aside>

        <main className="results-section">
          <div className="results-header">
            <p className="results-count">{total} pastors found</p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="relevance">Relevance</option>
              <option value="followers">Most Followed</option>
              <option value="recent">Recently Active</option>
              <option value="nearest">Nearest</option>
            </select>
          </div>

          {loading && <div className="loading">Loading pastors...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && !error && pastors.length === 0 && (
            <div className="no-results">
              <p>No pastors found matching your criteria.</p>
              <button onClick={clearFilters} className="btn-secondary">Clear Filters</button>
            </div>
          )}

          <div className="pastors-grid">
            {pastors.map(pastor => (
              <div key={pastor._id} className="pastor-card">
                <div className="pastor-photo">
                  {pastor.photo_url ? (
                    <img src={pastor.photo_url} alt={pastor.name} />
                  ) : (
                    <div className="photo-placeholder">{pastor.name?.charAt(0)}</div>
                  )}
                  {pastor.verified && <span className="verified-badge">✓</span>}
                </div>
                <div className="pastor-info">
                  <h3>{pastor.name}</h3>
                  <p className="pastor-title">{pastor.title}</p>
                  <p className="pastor-church">{pastor.church_name}</p>
                  {pastor.preaching_topics && pastor.preaching_topics.length > 0 && (
                    <div className="topic-chips">
                      {pastor.preaching_topics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="topic-chip">{topic}</span>
                      ))}
                    </div>
                  )}
                  <p className="pastor-location">📍 {pastor.city}</p>
                  {pastor.availability && (
                    <span className="availability-badge">{pastor.availability}</span>
                  )}
                  <div className="pastor-meta">
                    <span>👥 {pastor.followers_count || 0} followers</span>
                    {pastor.distance && <span>📍 {pastor.distance} miles</span>}
                  </div>
                  <Link to={`/pastor/${pastor.slug}`} className="view-profile-btn">
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="page-info">Page {page} of {pages}</span>
              <button
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default PastorSearchPage;