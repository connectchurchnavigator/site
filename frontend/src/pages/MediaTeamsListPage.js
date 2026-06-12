import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './MediaTeamsListPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const serviceColors = {
  'photography': '#3b82f6',
  'videography': '#ef4444',
  'audio_engineering': '#10b981',
  'live_streaming': '#8b5cf6',
  'lighting': '#f59e0b',
  'graphics_design': '#ec4899',
  'social_media': '#06b6d4'
};

const MediaTeamsListPage = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    city: '',
    serviceType: '',
    minTeamSize: '',
    maxTeamSize: ''
  });
  const [cities, setCities] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  useEffect(() => {
    fetchTeams();
    fetchFilterOptions();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.serviceType) queryParams.append('service_type', filters.serviceType);
      if (filters.minTeamSize) queryParams.append('min_team_size', filters.minTeamSize);
      if (filters.maxTeamSize) queryParams.append('max_team_size', filters.maxTeamSize);
      
      const url = `${API_BASE_URL}/media-teams?${queryParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch media teams');
      const data = await response.json();
      setTeams(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [citiesRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/media-teams/cities`),
        fetch(`${API_BASE_URL}/media-teams/service-types`)
      ]);
      if (citiesRes.ok) {
        const citiesData = await citiesRes.ok && await citiesRes.json();
        setCities(citiesData || []);
      }
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServiceTypes(servicesData || []);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchTeams();
  };

  const resetFilters = () => {
    setFilters({ city: '', serviceType: '', minTeamSize: '', maxTeamSize: '' });
    setTimeout(fetchTeams, 100);
  };

  const formatServiceName = (service) => {
    return service.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="media-teams-list-page">
      <div className="hero-section">
        <div className="container">
          <h1>Professional Media Teams</h1>
          <p>Find experienced media teams to enhance your church's worship experience</p>
        </div>
      </div>

      <div className="container">
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>City</label>
              <select name="city" value={filters.city} onChange={handleFilterChange}>
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Service Type</label>
              <select name="serviceType" value={filters.serviceType} onChange={handleFilterChange}>
                <option value="">All Services</option>
                {serviceTypes.map(service => (
                  <option key={service} value={service}>{formatServiceName(service)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Min Team Size</label>
              <input 
                type="number" 
                name="minTeamSize" 
                value={filters.minTeamSize} 
                onChange={handleFilterChange}
                placeholder="e.g., 2"
                min="1"
              />
            </div>
            <div className="filter-group">
              <label>Max Team Size</label>
              <input 
                type="number" 
                name="maxTeamSize" 
                value={filters.maxTeamSize} 
                onChange={handleFilterChange}
                placeholder="e.g., 10"
                min="1"
              />
            </div>
          </div>
          <div className="filter-actions">
            <button onClick={applyFilters} className="btn-primary">Apply Filters</button>
            <button onClick={resetFilters} className="btn-secondary">Reset</button>
          </div>
        </div>

        {loading && <div className="loading">Loading media teams...</div>}
        {error && <div className="error">Error: {error}</div>}

        {!loading && !error && teams.length === 0 && (
          <div className="no-results">No media teams found matching your criteria.</div>
        )}

        {!loading && !error && teams.length > 0 && (
          <>
            <div className="results-count">
              <p>{teams.length} media team{teams.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="teams-grid">
              {teams.map(team => (
                <Link to={`/media-team/${team.slug}`} key={team._id || team.slug} className="team-card">
                  <div className="team-card-image">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} />
                    ) : (
                      <div className="team-card-placeholder">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="team-card-content">
                    <h3>{team.name}</h3>
                    <p className="team-location">
                      <i className="icon-location"></i> {team.city}
                    </p>
                    <div className="team-services">
                      {(team.services_offered || []).slice(0, 3).map(service => (
                        <span 
                          key={service} 
                          className="service-tag"
                          style={{ backgroundColor: serviceColors[service] || '#6b7280' }}
                        >
                          {formatServiceName(service)}
                        </span>
                      ))}
                      {(team.services_offered || []).length > 3 && (
                        <span className="service-tag service-tag-more">+{team.services_offered.length - 3}</span>
                      )}
                    </div>
                    <div className="team-meta">
                      <span className="team-size-badge">
                        <i className="icon-users"></i> {team.team_size || 0} members
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MediaTeamsListPage;