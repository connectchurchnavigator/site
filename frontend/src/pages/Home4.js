import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Church, User, ChevronDown, 
  Sparkles, Heart, Globe, Settings, LogOut 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { NavbarPremium } from '../components/NavbarPremium';
import { taxonomyAPI } from '../lib/api';
import './Home4.css';

const Home4 = () => {
  const navigate = useNavigate();
  const [variant, setVariant] = useState(1);
  const [searchTab, setSearchTab] = useState('churches');
  const [searchData, setSearchData] = useState({
    name: '',
    location: '',
    denomination: '',
    openNow: 'all'
  });
  const [denominations, setDenominations] = useState([]);

  // Load Google Fonts & Denominations
  useEffect(() => {
    fetchDenominations();
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Montserrat:wght@300;400;700;900&family=Outfit:wght@300;500;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const fetchDenominations = async () => {
    try {
      const res = await taxonomyAPI.getByCategory('denomination');
      setDenominations(res.data || []);
    } catch (error) {
      console.error('Error fetching denominations:', error);
    }
  };

  const variants = {
    1: {
      title: "Find Your Sacred Sanctuary",
      subtitle: "A place for reflection, peace, and spiritual growth.",
      bg: "/hero-bg.png",
      class: "hero-v1"
    },
    2: {
      title: "Join the Vibrant Community",
      subtitle: "Experience fellowship that changes lives and builds futures.",
      bg: "/hero-church-2.jpg",
      class: "hero-v2"
    },
    3: {
      title: "Your Spiritual Journey Starts Here",
      subtitle: "Discover the path to a more meaningful connection with faith.",
      bg: "/hero-church-3.jpg",
      class: "hero-v3"
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchData.name) query.append('name', searchData.name);
    if (searchData.location) query.append('location', searchData.location);
    if (searchData.denomination) query.append('denomination', searchData.denomination);
    if (searchData.openNow !== 'all') query.append('openNow', 'true');
    
    navigate(`/explore?type=${searchTab}&${query.toString()}`);
  };

  return (
    <div className={`home4-container ${variants[variant].class}`}>
      <NavbarPremium />

      {/* Hero Section */}
      <section 
        className="hero-wrapper"
        style={{ backgroundImage: `url(${variants[variant].bg})` }}
      >
        <div className="hero-overlay"></div>
        
        <div className="hero-content">
          <h1 className="hero-title">{variants[variant].title}</h1>
          <p className="hero-subtitle">{variants[variant].subtitle}</p>

          {/* Custom Search Bar as per image */}
          <div className="search-bar-container">
            <div className="search-type-toggle">
              <div 
                className={`toggle-option ${searchTab === 'churches' ? 'active' : ''}`}
                onClick={() => setSearchTab('churches')}
              >
                <Church className="h-5 w-5" />
                <span>Churches</span>
              </div>
              <div 
                className={`toggle-option ${searchTab === 'pastors' ? 'active' : ''}`}
                onClick={() => setSearchTab('pastors')}
              >
                <User className="h-5 w-5" />
                <span>Pastors</span>
              </div>
            </div>

            <form onSubmit={handleSearch}>
              <div className="search-fields-row">
                <div className="search-field">
                  <input 
                    type="text" 
                    placeholder={searchTab === 'churches' ? "Church Name" : "Pastor Name"}
                    value={searchData.name}
                    onChange={(e) => setSearchData({...searchData, name: e.target.value})}
                  />
                </div>
                
                <div className="search-field">
                  <MapPin className="field-icon" />
                  <input 
                    type="text" 
                    placeholder="Location"
                    value={searchData.location}
                    onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                  />
                </div>

                <div className="search-field">
                  <select 
                    value={searchData.denomination}
                    onChange={(e) => setSearchData({...searchData, denomination: e.target.value})}
                  >
                    <option value="">Denomination</option>
                    {denominations.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="field-icon" />
                </div>

                <div className="search-field">
                  <select 
                    value={searchData.openNow}
                    onChange={(e) => setSearchData({...searchData, openNow: e.target.value})}
                  >
                    <option value="all">Open Now</option>
                    <option value="now">Yes, Right Now</option>
                    <option value="today">Open Today</option>
                  </select>
                  <ChevronDown className="field-icon" />
                </div>
              </div>

              <button type="submit" className="search-submit-btn">
                <Search className="h-6 w-6" />
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home4;
