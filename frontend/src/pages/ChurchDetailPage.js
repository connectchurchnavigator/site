import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SocialShare from '../components/SocialShare';
import StructuredData from '../components/StructuredData';
import HeroSlider from '../components/HeroSlider';
import './ChurchDetailPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [pastor, setPastor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/churches/slug/${slug}`);
        setChurch(response.data);

        if (response.data.pastor_id) {
          try {
            const pastorResponse = await axios.get(`${API_BASE_URL}/pastors/${response.data.pastor_id}`);
            setPastor(pastorResponse.data);
          } catch (err) {
            console.error('Error fetching pastor:', err);
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Church not found');
      } finally {
        setLoading(false);
      }
    };

    fetchChurch();
  }, [slug]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <Navbar />
        <div className="error-content">
          <i className="ti-info-alt"></i>
          <h2>{error}</h2>
          <button onClick={() => navigate('/churches')} className="btn-primary">
            Back to Churches
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://ik.imagekit.io/cuizrvzly/church_navigator/${path}`;
  };

  const coverImage = getImageUrl(church.cover_image);
  const nextService = church.service_times?.[0];
  const nextEvent = church.events?.[0];
  const galleryImages = church.gallery || [];

  const slides = [];

  slides.push({
    key: 'cover',
    bg_image: coverImage,
    bg_color: '#1a1a1a',
    content_component: (
      <div className="hero-slide-content hero-slide-cover">
        <div className="container">
          <div className="hero-title-wrapper">
            <h1 className="hero-title">{church.name}</h1>
            {church.tagline && <p className="hero-tagline">{church.tagline}</p>}
          </div>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => setActiveTab('contact')}>
              <i className="ti-location-pin"></i> Visit Us
            </button>
            {church.website && (
              <a href={church.website} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <i className="ti-world"></i> Website
              </a>
            )}
          </div>
        </div>
      </div>
    )
  });

  if (nextService) {
    slides.push({
      key: 'service',
      bg_image: coverImage,
      bg_color: '#2c2c2c',
      content_component: (
        <div className="hero-slide-content hero-slide-service">
          <div className="container">
            <div className="service-promo">
              <h2>Join us this Sunday</h2>
              <p className="service-time">{nextService.day} at {nextService.time}</p>
              {nextService.type && <p className="service-type">{nextService.type}</p>}
              <button className="btn-primary" onClick={() => setActiveTab('services')}>
                <i className="ti-check-box"></i> Check In
              </button>
            </div>
          </div>
        </div>
      )
    });
  }

  if (pastor) {
    const pastorPhoto = getImageUrl(pastor.profile_picture);
    slides.push({
      key: 'pastor',
      bg_image: coverImage,
      bg_color: '#1a1a1a',
      content_component: (
        <div className="hero-slide-content hero-slide-pastor">
          <div className="container">
            <div className="pastor-spotlight">
              {pastorPhoto && (
                <img src={pastorPhoto} alt={pastor.name} className="pastor-spotlight-photo" />
              )}
              <div className="pastor-spotlight-info">
                <h3>{pastor.name}</h3>
                <p className="pastor-title">{pastor.title || 'Senior Pastor'}</p>
                {pastor.bio && <p className="pastor-quote">"{pastor.bio.substring(0, 120)}..."</p>}
                <Link to={`/pastors/${pastor.slug}`} className="btn-secondary">
                  Meet Our Pastor
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    });
  }

  if (galleryImages.length > 0) {
    const bestImage = getImageUrl(galleryImages[0]);
    slides.push({
      key: 'gallery',
      bg_image: bestImage,
      bg_color: '#1a1a1a',
      content_component: (
        <div className="hero-slide-content hero-slide-gallery">
          <div className="container">
            <div className="gallery-promo">
              <h2>Explore Our Community</h2>
              <p>{galleryImages.length} photos</p>
              <button className="btn-primary" onClick={() => setActiveTab('gallery')}>
                <i className="ti-gallery"></i> View Gallery
              </button>
            </div>
          </div>
        </div>
      )
    });
  }

  if (nextEvent) {
    slides.push({
      key: 'event',
      bg_image: coverImage,
      bg_color: '#2c2c2c',
      content_component: (
        <div className="hero-slide-content hero-slide-event">
          <div className="container">
            <div className="event-promo">
              <span className="event-badge">Upcoming Event</span>
              <h2>{nextEvent.title}</h2>
              <p className="event-date">
                <i className="ti-calendar"></i> {new Date(nextEvent.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {nextEvent.time && <p className="event-time"><i className="ti-time"></i> {nextEvent.time}</p>}
              <button className="btn-primary" onClick={() => setActiveTab('events')}>
                <i className="ti-check"></i> Register
              </button>
            </div>
          </div>
        </div>
      )
    });
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: church.name,
    description: church.description || church.tagline,
    image: coverImage,
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.address,
      addressLocality: church.city,
      addressRegion: church.region,
      postalCode: church.postcode,
      addressCountry: 'GB'
    },
    telephone: church.phone,
    url: church.website,
    geo: church.latitude && church.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: church.latitude,
      longitude: church.longitude
    } : undefined
  };

  return (
    <div className="church-detail-page">
      <StructuredData data={structuredData} />
      <Navbar />

      <HeroSlider slides={slides} height={340} autoplay={true} interval={5000} />

      <div className="church-detail-container">
        <div className="container">
          <div className="church-detail-grid">
            <div className="church-main-content">
              <div className="church-tabs">
                <button className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
                  <i className="ti-info-alt"></i> About
                </button>
                <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
                  <i className="ti-time"></i> Services
                </button>
                {galleryImages.length > 0 && (
                  <button className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
                    <i className="ti-gallery"></i> Gallery
                  </button>
                )}
                {church.events && church.events.length > 0 && (
                  <button className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
                    <i className="ti-calendar"></i> Events
                  </button>
                )}
                <button className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => setActiveTab('contact')}>
                  <i className="ti-location-pin"></i> Contact
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'about' && (
                  <div className="tab-pane">
                    <h2>About {church.name}</h2>
                    {church.description ? (
                      <p className="church-description">{church.description}</p>
                    ) : (
                      <p className="church-description">{church.tagline}</p>
                    )}

                    {church.denomination && (
                      <div className="info-block">
                        <h3>Denomination</h3>
                        <p>{church.denomination}</p>
                      </div>
                    )}

                    {church.established_year && (
                      <div className="info-block">
                        <h3>Established</h3>
                        <p>{church.established_year}</p>
                      </div>
                    )}

                    {church.ministries && church.ministries.length > 0 && (
                      <div className="info-block">
                        <h3>Ministries</h3>
                        <div className="ministries-list">
                          {church.ministries.map((ministry, index) => (
                            <span key={index} className="ministry-tag">{ministry}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {pastor && (
                      <div className="info-block pastor-section">
                        <h3>Our Pastor</h3>
                        <Link to={`/pastors/${pastor.slug}`} className="pastor-card-link">
                          <div className="pastor-card">
                            {pastor.profile_picture && (
                              <img src={getImageUrl(pastor.profile_picture)} alt={pastor.name} className="pastor-photo" />
                            )}
                            <div className="pastor-info">
                              <h4>{pastor.name}</h4>
                              <p className="pastor-title">{pastor.title || 'Senior Pastor'}</p>
                              {pastor.bio && <p className="pastor-bio-preview">{pastor.bio.substring(0, 150)}...</p>}
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'services' && (
                  <div className="tab-pane">
                    <h2>Service Times</h2>
                    {church.service_times && church.service_times.length > 0 ? (
                      <div className="services-list">
                        {church.service_times.map((service, index) => (
                          <div key={index} className="service-item">
                            <div className="service-day">{service.day}</div>
                            <div className="service-details">
                              <div className="service-time">{service.time}</div>
                              {service.type && <div className="service-type">{service.type}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Service times not available. Please contact the church.</p>
                    )}
                  </div>
                )}

                {activeTab === 'gallery' && (
                  <div className="tab-pane">
                    <h2>Gallery</h2>
                    <div className="gallery-grid">
                      {galleryImages.map((image, index) => (
                        <div key={index} className="gallery-item">
                          <img src={getImageUrl(image)} alt={`${church.name} ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'events' && (
                  <div className="tab-pane">
                    <h2>Upcoming Events</h2>
                    {church.events && church.events.length > 0 ? (
                      <div className="events-list">
                        {church.events.map((event, index) => (
                          <div key={index} className="event-item">
                            <div className="event-date-badge">
                              <div className="event-day">{new Date(event.date).getDate()}</div>
                              <div className="event-month">{new Date(event.date).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</div>
                            </div>
                            <div className="event-details">
                              <h3>{event.title}</h3>
                              {event.description && <p>{event.description}</p>}
                              {event.time && <p className="event-time"><i className="ti-time"></i> {event.time}</p>}
                              {event.location && <p className="event-location"><i className="ti-location-pin"></i> {event.location}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No upcoming events at this time.</p>
                    )}
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="tab-pane">
                    <h2>Contact & Location</h2>
                    <div className="contact-grid">
                      <div className="contact-info">
                        {church.address && (
                          <div className="contact-item">
                            <i className="ti-location-pin"></i>
                            <div>
                              <strong>Address</strong>
                              <p>{church.address}</p>
                              <p>{church.city}, {church.postcode}</p>
                            </div>
                          </div>
                        )}
                        {church.phone && (
                          <div className="contact-item">
                            <i className="ti-mobile"></i>
                            <div>
                              <strong>Phone</strong>
                              <p><a href={`tel:${church.phone}`}>{church.phone}</a></p>
                            </div>
                          </div>
                        )}
                        {church.email && (
                          <div className="contact-item">
                            <i className="ti-email"></i>
                            <div>
                              <strong>Email</strong>
                              <p><a href={`mailto:${church.email}`}>{church.email}</a></p>
                            </div>
                          </div>
                        )}
                        {church.website && (
                          <div className="contact-item">
                            <i className="ti-world"></i>
                            <div>
                              <strong>Website</strong>
                              <p><a href={church.website} target="_blank" rel="noopener noreferrer">{church.website}</a></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="church-sidebar">
              <div className="sidebar-card">
                <h3>Quick Info</h3>
                <div className="quick-info-list">
                  {church.denomination && (
                    <div className="quick-info-item">
                      <i className="ti-bookmark"></i>
                      <span>{church.denomination}</span>
                    </div>
                  )}
                  {church.city && (
                    <div className="quick-info-item">
                      <i className="ti-location-pin"></i>
                      <span>{church.city}, {church.region}</span>
                    </div>
                  )}
                  {church.established_year && (
                    <div className="quick-info-item">
                      <i className="ti-calendar"></i>
                      <span>Est. {church.established_year}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="sidebar-card">
                <h3>Share</h3>
                <SocialShare url={window.location.href} title={church.name} />
              </div>

              {church.service_times && church.service_times.length > 0 && (
                <div className="sidebar-card">
                  <h3>Next Service</h3>
                  <div className="next-service">
                    <p className="service-day">{church.service_times[0].day}</p>
                    <p className="service-time">{church.service_times[0].time}</p>
                    {church.service_times[0].type && <p className="service-type">{church.service_times[0].type}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ChurchDetailPage;