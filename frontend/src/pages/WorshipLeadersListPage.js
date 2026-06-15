import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import WorshipLeaderCard from '../components/WorshipLeaderCard';
import './WorshipLeadersListPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const WorshipLeadersListPage = () => {
  const [leaders, setLeaders] = useState([]);
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', instrument: '', denomination: '', availability: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/worship-leaders`)
      .then(res => res.json())
      .then(data => {
        setLeaders(data);
        setFilteredLeaders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = leaders;

    if (searchTerm) {
      result = result.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.city?.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filters.city) {
      result = result.filter(l => l.city?.toLowerCase() === filters.city.toLowerCase());
    }

    if (filters.instrument) {
      result = result.filter(l => l.instruments?.some(i => i.toLowerCase().includes(filters.instrument.toLowerCase())));
    }

    if (filters.denomination) {
      result = result.filter(l => l.denominations?.includes(filters.denomination));
    }

    if (filters.availability) {
      result = result.filter(l => l.availability === filters.availability);
    }

    setFilteredLeaders(result);
  }, [searchTerm, filters, leaders]);

  const cities = [...new Set(leaders.map(l => l.city).filter(Boolean))];
  const instruments = [...new Set(leaders.flatMap(l => l.instruments || []))];
  const denominations = [...new Set(leaders.flatMap(l => l.denominations || []))];

  return (
    <>
      <Helmet>
        <title>Worship Leaders Directory | ChurchNavigator</title>
        <meta name="description" content="Find experienced worship leaders across the UK. Browse by instrument, city, denomination, and availability." />
      </Helmet>

      <div className="wll-page">
        <div className="wll-hero">
          <h1 className="wll-hero-title">Worship Leaders Directory</h1>
          <p className="wll-hero-subtitle">Find experienced worship leaders across the UK</p>
        </div>

        <div className="wll-container">
          <div className="wll-search-bar">
            <input type="text" placeholder="Search by name or city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="wll-search-input" />
          </div>

          <div className="wll-filters">
            <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="wll-filter">
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={filters.instrument} onChange={(e) => setFilters({ ...filters, instrument: e.target.value })} className="wll-filter">
              <option value="">All Instruments</option>
              {instruments.map(i => <option key={i} value={i}>{i}</option>)}
            </select>

            <select value={filters.denomination} onChange={(e) => setFilters({ ...filters, denomination: e.target.value })} className="wll-filter">
              <option value="">All Denominations</option>
              {denominations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} className="wll-filter">
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="limited">Limited</option>
              <option value="unavailable">Unavailable</option>
            </select>

            <button onClick={() => { setFilters({ city: '', instrument: '', denomination: '', availability: '' }); setSearchTerm(''); }} className="wll-clear-btn">Clear Filters</button>
          </div>

          {loading ? (
            <div className="wll-loading">Loading worship leaders...</div>
          ) : filteredLeaders.length === 0 ? (
            <div className="wll-empty">No worship leaders found. Try adjusting your filters.</div>
          ) : (
            <div className="wll-grid">
              {filteredLeaders.map(leader => <WorshipLeaderCard key={leader._id} leader={leader} />)}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WorshipLeadersListPage;