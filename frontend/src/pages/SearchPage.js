import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import SearchBar from '../components/SearchBar';
import './SearchPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState({ churches: [], events: [], worship_leaders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('relevance');
  const [filters, setFilters] = useState({ type: 'all' });

  useEffect(() => {
    if (query) {
      searchAll();
    }
  }, [query, sortBy, filters]);

  const searchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/search/all`, {
        params: { q: query, sort: sortBy, type: filters.type }
      });
      setResults(response.data);
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalResults = () => {
    return (results.churches?.length || 0) + (results.events?.length || 0) + (results.worship_leaders?.length || 0);
  };

  const renderChurchResult = (church) => (
    <Link to={`/churches/${church._id}`} key={church._id} className="search-result">
      <div className="search-result__image">
        {church.images?.[0] ? (
          <img src={church.images[0]} alt={church.name} />
        ) : (
          <div className="search-result__image-placeholder">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 5L8 15v20h24V15L20 5z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="15" y="20" width="10" height="15" fill="currentColor" opacity="0.1"/>
            </svg>
          </div>
        )}
      </div>
      <div className="search-result__content">
        <div className="search-result__header">
          <h3 className="search-result__title">{church.name}</h3>
          <span className="search-result__type">Church</span>
        </div>
        {church.match_score && (
          <div className="search-result__score">
            <div className="search-result__score-bar">
              <div className="search-result__score-fill" style={{ width: `${church.match_score}%` }}></div>
            </div>
            <span className="search-result__score-text">{church.match_score}% match</span>
          </div>
        )}
        <p className="search-result__address">{church.address?.street}, {church.address?.city}</p>
        {church.denomination && <span className="search-result__badge">{church.denomination}</span>}
        {church.worship_style && <span className="search-result__badge">{church.worship_style}</span>}
      </div>
    </Link>
  );

  const renderEventResult = (event) => (
    <Link to={`/events/${event._id}`} key={event._id} className="search-result">
      <div className="search-result__image">
        {event.image ? (
          <img src={event.image} alt={event.title} />
        ) : (
          <div className="search-result__image-placeholder">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="8" y="10" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M14 8v4M26 8v4M8 16h24" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        )}
      </div>
      <div className="search-result__content">
        <div className="search-result__header">
          <h3 className="search-result__title">{event.title}</h3>
          <span className="search-result__type">Event</span>
        </div>
        {event.match_score && (
          <div className="search-result__score">
            <div className="search-result__score-bar">
              <div className="search-result__score-fill" style={{ width: `${event.match_score}%` }}></div>
            </div>
            <span className="search-result__score-text">{event.match_score}% match</span>
          </div>
        )}
        <p className="search-result__date">{new Date(event.start_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
        {event.is_free ? <span className="search-result__badge">Free</span> : <span className="search-result__badge">£{event.price}</span>}
        {event.is_online && <span className="search-result__badge">Online</span>}
      </div>
    </Link>
  );

  const renderWorshipLeaderResult = (leader) => (
    <Link to={`/worship-leaders/${leader._id}`} key={leader._id} className="search-result">
      <div className="search-result__image">
        {leader.profile_image ? (
          <img src={leader.profile_image} alt={leader.name} />
        ) : (
          <div className="search-result__image-placeholder">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="15" r="7" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M8 35c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
        )}
      </div>
      <div className="search-result__content">
        <div className="search-result__header">
          <h3 className="search-result__title">{leader.name}</h3>
          <span className="search-result__type">Worship Leader</span>
        </div>
        {leader.match_score && (
          <div className="search-result__score">
            <div className="search-result__score-bar">
              <div className="search-result__score-fill" style={{ width: `${leader.match_score}%` }}></div>
            </div>
            <span className="search-result__score-text">{leader.match_score}% match</span>
          </div>
        )}
        <p className="search-result__location">{leader.location?.city}</p>
        {leader.primary_instrument && <span className="search-result__badge">{leader.primary_instrument}</span>}
        {leader.experience_years && <span className="search-result__badge">{leader.experience_years}+ years</span>}
      </div>
    </Link>
  );

  return (
    <div className="search-page">
      <div className="search-page__header">
        <div className="container">
          <h1>Search Results</h1>
          <div className="search-page__search-bar">
            <SearchBar autoFocus={!query} />
          </div>
        </div>
      </div>

      <div className="container">
        <div className="search-page__layout">
          <aside className="search-page__sidebar">
            <div className="search-filters">
              <h3>Filters</h3>
              
              <div className="search-filter">
                <label>Result Type</label>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="all">All Results</option>
                  <option value="churches">Churches Only</option>
                  <option value="events">Events Only</option>
                  <option value="worship_leaders">Worship Leaders Only</option>
                </select>
              </div>

              <div className="search-filter">
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="relevance">Most Relevant</option>
                  <option value="distance">Nearest First</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </aside>

          <main className="search-page__main">
            <div className="search-page__toolbar">
              <div className="search-page__count">
                {loading ? 'Searching...' : `${getTotalResults()} results for "${query}"`}
              </div>
              <div className="search-page__view-toggle">
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="2" fill="currentColor"/>
                    <rect x="2" y="7" width="12" height="2" fill="currentColor"/>
                    <rect x="2" y="11" width="12" height="2" fill="currentColor"/>
                  </svg>
                </button>
                <button className={viewMode === 'map' ? 'active' : ''} onClick={() => setViewMode('map')}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1 4l4-2 6 3 4-2v9l-4 2-6-3-4 2V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>
              </div>
            </div>

            {error && <div className="search-page__error">{error}</div>}

            {!loading && !error && getTotalResults() === 0 && (
              <div className="search-page__empty">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="26" cy="26" r="20" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path d="M42 42l16 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <h2>No results found</h2>
                <p>Try adjusting your search or filters</p>
              </div>
            )}

            {!loading && !error && (
              <div className="search-results">
                {results.churches?.length > 0 && (
                  <div className="search-results__section">
                    <h2>Churches ({results.churches.length})</h2>
                    <div className="search-results__list">
                      {results.churches.map(renderChurchResult)}
                    </div>
                  </div>
                )}

                {results.events?.length > 0 && (
                  <div className="search-results__section">
                    <h2>Events ({results.events.length})</h2>
                    <div className="search-results__list">
                      {results.events.map(renderEventResult)}
                    </div>
                  </div>
                )}

                {results.worship_leaders?.length > 0 && (
                  <div className="search-results__section">
                    <h2>Worship Leaders ({results.worship_leaders.length})</h2>
                    <div className="search-results__list">
                      {results.worship_leaders.map(renderWorshipLeaderResult)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;