import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SearchBar.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SearchBar = ({ placeholder = 'Search churches, events, worship leaders...', variant = 'default', autoFocus = false }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent.slice(0, 5));
    fetchPopularSearches();
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => fetchSuggestions(), 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchPopularSearches = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/search/popular`);
      setPopularSearches(response.data.searches || []);
    } catch (error) {
      console.error('Error fetching popular searches:', error);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/search/autocomplete?q=${encodeURIComponent(query)}`);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRecentSearch = (searchQuery) => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [searchQuery, ...recent.filter(s => s !== searchQuery)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  };

  const handleSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    saveRecentSearch(searchQuery.trim());
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setQuery('');
    setShowDropdown(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'church' && suggestion.id) {
      navigate(`/churches/${suggestion.id}`);
    } else if (suggestion.type === 'event' && suggestion.id) {
      navigate(`/events/${suggestion.id}`);
    } else {
      handleSearch(suggestion.text);
    }
    setShowDropdown(false);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  return (
    <div className={`search-bar search-bar--${variant}`} ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="search-bar__form">
        <svg className="search-bar__icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="search-bar__input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
        />
        {query && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="search-dropdown">
          {query.length >= 2 && suggestions.length > 0 && (
            <div className="search-dropdown__section">
              <div className="search-dropdown__header">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="search-dropdown__item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg className="search-dropdown__item-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M7 14A7 7 0 1 0 7 0a7 7 0 0 0 0 14zM15 15l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div className="search-dropdown__item-content">
                    <div className="search-dropdown__item-text">{suggestion.text}</div>
                    {suggestion.type && <span className="search-dropdown__item-type">{suggestion.type}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.length < 2 && recentSearches.length > 0 && (
            <div className="search-dropdown__section">
              <div className="search-dropdown__header">
                Recent Searches
                <button className="search-dropdown__clear" onClick={clearRecentSearches}>Clear</button>
              </div>
              {recentSearches.map((search, index) => (
                <div
                  key={index}
                  className="search-dropdown__item"
                  onClick={() => handleSearch(search)}
                >
                  <svg className="search-dropdown__item-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div className="search-dropdown__item-text">{search}</div>
                </div>
              ))}
            </div>
          )}

          {query.length < 2 && popularSearches.length > 0 && (
            <div className="search-dropdown__section">
              <div className="search-dropdown__header">Popular Searches</div>
              {popularSearches.map((search, index) => (
                <div
                  key={index}
                  className="search-dropdown__item"
                  onClick={() => handleSearch(search)}
                >
                  <svg className="search-dropdown__item-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8h12M8 2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div className="search-dropdown__item-text">{search}</div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="search-dropdown__loading">Searching...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;