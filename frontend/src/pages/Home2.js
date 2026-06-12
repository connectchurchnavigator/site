import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar2';
import Footer from '../components/Footer';
import { Helmet } from 'react-helmet-async';

const Home2 = () => {
  const [featuredChurches, setFeaturedChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('churches');

  useEffect(() => {
    const fetchFeaturedChurches = async () => {
      try {
        const response = await fetch('https://api.churchnavigator.com/api/churches/featured?limit=6');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setFeaturedChurches(data.churches || []);
      } catch (error) {
        console.error('Error fetching featured churches:', error);
        setFeaturedChurches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeaturedChurches();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`;
    }
  };

  const tools = [
    {
      icon: 'ti-search',
      label: 'Search',
      description: 'Find churches by location, denomination or name',
      href: '/search',
      badge: null
    },
    {
      icon: 'ti-map-route',
      label: 'Ministry Trip Planner',
      description: 'Plan visits, meetings and logistics with AI',
      href: '/planner',
      badge: 'Standard'
    },
    {
      icon: 'ti-id-badge',
      label: 'Visitor Tracking',
      description: 'Track first-timers with QR codes',
      href: '/tools/visitor-tracking',
      badge: 'Premium'
    },
    {
      icon: 'ti-calendar',
      label: 'Event Listings',
      description: 'Discover conferences, seminars and gatherings',
      href: '/events',
      badge: null
    }
  ];

  const resources = [
    {
      icon: 'ti-microphone',
      label: 'Worship Leaders',
      description: 'Find skilled worship leaders for your church',
      href: '/worship-leaders'
    },
    {
      icon: 'ti-video-camera',
      label: 'Media Teams',
      description: 'Connect with production and media experts',
      href: '/media-teams'
    },
    {
      icon: 'ti-write',
      label: 'Submit Church',
      description: 'Add your church to our directory',
      href: '/submit-church'
    },
    {
      icon: 'ti-email',
      label: 'Contact Us',
      description: 'Get in touch with our team',
      href: '/contact'
    }
  ];

  const stats = [
    { number: '20,000+', label: 'UK Churches' },
    { number: '150+', label: 'Denominations' },
    { number: '500+', label: 'Cities Covered' },
    { number: '50,000+', label: 'Monthly Visitors' }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ChurchNavigator',
    url: 'https://churchnavigator.com',
    description: 'UK\'s most comprehensive church directory with 20,000+ churches across all denominations',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://churchnavigator.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <>
      <Helmet>
        <title>ChurchNavigator | UK's Leading Church Directory</title>
        <meta name="description" content="Find churches across the UK. Search 20,000+ churches by location, denomination or name. The most comprehensive church directory in the United Kingdom." />
        <meta property="og:title" content="ChurchNavigator | UK's Leading Church Directory" />
        <meta property="og:description" content="Find churches across the UK. Search 20,000+ churches by location, denomination or name." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://churchnavigator.com" />
        <link rel="canonical" href="https://churchnavigator.com" />
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Navbar />

      <section className="hero-section" style={{ paddingTop: '120px', paddingBottom: '100px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1 className="text-white mb-4" style={{ fontSize: '3.5rem', fontWeight: '700', lineHeight: '1.2' }}>
                Find Your Church Home
              </h1>
              <p className="text-white mb-4" style={{ fontSize: '1.3rem', opacity: '0.95' }}>
                Search 20,000+ UK churches by location, denomination or name. The most comprehensive church directory in the United Kingdom.
              </p>
              <form onSubmit={handleSearch} className="search-form">
                <div className="input-group input-group-lg shadow" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                  <input
                    type="text"
                    className="form-control border-0"
                    placeholder="Search by church name, city or postcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ fontSize: '1.1rem', padding: '20px' }}
                  />
                  <div className="input-group-append">
                    <button className="btn btn-primary" type="submit" style={{ padding: '0 30px', fontSize: '1.1rem', fontWeight: '600' }}>
                      <i className="ti-search mr-2"></i>Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <div className="col-lg-6">
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card bg-white p-4 text-center shadow" style={{ borderRadius: '12px' }}>
                    <h2 className="mb-2" style={{ color: '#667eea', fontWeight: '700', fontSize: '2.5rem' }}>{stat.number}</h2>
                    <p className="mb-0 text-muted" style={{ fontSize: '1rem' }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row mb-4">
            <div className="col-12">
              <h2 className="mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>Tools & Resources</h2>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Everything you need to connect with churches</p>
            </div>
          </div>
          <div className="row">
            {tools.map((tool, index) => (
              <div key={index} className="col-lg-3 col-md-6 mb-4">
                <Link to={tool.href} className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm hover-lift" style={{ borderRadius: '12px', transition: 'transform 0.2s' }}>
                    <div className="card-body p-4">
                      <div className="d-flex align-items-start mb-3">
                        <i className={tool.icon} style={{ fontSize: '2.5rem', color: '#667eea' }}></i>
                        {tool.badge && (
                          <span className="badge badge-primary ml-auto" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>{tool.badge}</span>
                        )}
                      </div>
                      <h5 className="mb-2" style={{ fontWeight: '600', color: '#333' }}>{tool.label}</h5>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>{tool.description}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="row mb-4">
            <div className="col-12 text-center">
              <h2 className="mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>Featured Churches</h2>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Discover vibrant communities across the UK</p>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="row">
              {featuredChurches.map((church) => (
                <div key={church._id} className="col-lg-4 col-md-6 mb-4">
                  <Link to={`/church/${church.slug}`} className="text-decoration-none">
                    <div className="card h-100 border-0 shadow-sm hover-lift" style={{ borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s' }}>
                      {church.image_url && (
                        <img
                          src={church.image_url}
                          alt={church.name}
                          className="card-img-top"
                          style={{ height: '200px', objectFit: 'cover' }}
                        />
                      )}
                      <div className="card-body p-4">
                        <h5 className="mb-2" style={{ fontWeight: '600', color: '#333' }}>{church.name}</h5>
                        <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                          <i className="ti-location-pin mr-1"></i>{church.city || church.postcode}
                        </p>
                        {church.denomination && (
                          <span className="badge badge-light" style={{ fontSize: '0.85rem' }}>{church.denomination}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="text-center mt-4">
            <Link to="/search" className="btn btn-primary btn-lg" style={{ padding: '12px 40px', borderRadius: '8px', fontWeight: '600' }}>
              View All Churches <i className="ti-arrow-right ml-2"></i>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row mb-4">
            <div className="col-12">
              <h2 className="mb-2" style={{ fontWeight: '700', fontSize: '2.5rem' }}>More Resources</h2>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Connect, contribute and grow</p>
            </div>
          </div>
          <div className="row">
            {resources.map((resource, index) => (
              <div key={index} className="col-lg-3 col-md-6 mb-4">
                <Link to={resource.href} className="text-decoration-none">
                  <div className="card h-100 border-0 shadow-sm hover-lift" style={{ borderRadius: '12px', transition: 'transform 0.2s' }}>
                    <div className="card-body p-4">
                      <i className={resource.icon} style={{ fontSize: '2.5rem', color: '#667eea', marginBottom: '15px', display: 'block' }}></i>
                      <h5 className="mb-2" style={{ fontWeight: '600', color: '#333' }}>{resource.label}</h5>
                      <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>{resource.description}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="container text-center">
          <h2 className="text-white mb-3" style={{ fontWeight: '700', fontSize: '2.5rem' }}>Join ChurchNavigator Today</h2>
          <p className="text-white mb-4" style={{ fontSize: '1.2rem', opacity: '0.95' }}>List your church for free and connect with thousands of visitors</p>
          <Link to="/submit-church" className="btn btn-light btn-lg" style={{ padding: '15px 40px', fontSize: '1.1rem', fontWeight: '600', borderRadius: '8px' }}>
            Submit Your Church <i className="ti-arrow-right ml-2"></i>
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        .hover-lift:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </>
  );
};

export default Home2;