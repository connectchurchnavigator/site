import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MediaTeamDetailPage.css';

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

const MediaTeamDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    church: '',
    message: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    fetchTeamDetails();
  }, [slug]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/media-teams/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Media team not found');
        }
        throw new Error('Failed to fetch media team details');
      }
      const data = await response.json();
      setTeam(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/media-teams/${slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      setFormSuccess(true);
      setFormData({ name: '', email: '', church: '', message: '' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const formatServiceName = (service) => {
    return service.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return <div className="loading-page">Loading media team details...</div>;
  }

  if (error) {
    return (
      <div className="error-page">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/media-teams')} className="btn-primary">Back to Media Teams</button>
      </div>
    );
  }

  if (!team) {
    return <div className="error-page">Media team not found</div>;
  }

  return (
    <div className="media-team-detail-page">
      <div className="hero-banner" style={{ backgroundImage: team.cover_image_url ? `url(${team.cover_image_url})` : 'none' }}>
        <div className="hero-overlay">
          <div className="container">
            <div className="hero-content">
              {team.logo_url && (
                <div className="team-logo">
                  <img src={team.logo_url} alt={team.name} />
                </div>
              )}
              <div className="team-info">
                <h1>{team.name}</h1>
                <p className="team-location">
                  <i className="icon-location"></i> {team.city}
                </p>
                <div className="team-stats">
                  <div className="stat">
                    <span className="stat-value">{(team.services_offered || []).length}</span>
                    <span className="stat-label">Services</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{team.team_size || 0}</span>
                    <span className="stat-label">Team Size</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{(team.equipment || []).length}</span>
                    <span className="stat-label">Equipment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="content-layout">
          <div className="main-content">
            <div className="tabs">
              <button 
                className={activeTab === 'profile' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button 
                className={activeTab === 'portfolio' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('portfolio')}
              >
                Portfolio
              </button>
              <button 
                className={activeTab === 'videos' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('videos')}
              >
                Videos
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'profile' && (
                <div className="profile-tab">
                  <section className="section">
                    <h2>About</h2>
                    <p className="description">{team.description || 'No description provided.'}</p>
                  </section>

                  <section className="section">
                    <h2>Services Offered</h2>
                    <div className="services-list">
                      {(team.services_offered || []).map(service => (
                        <span 
                          key={service} 
                          className="service-badge"
                          style={{ backgroundColor: serviceColors[service] || '#6b7280' }}
                        >
                          {formatServiceName(service)}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="section">
                    <h2>Equipment</h2>
                    {(team.equipment || []).length > 0 ? (
                      <ul className="equipment-list">
                        {team.equipment.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No equipment listed.</p>
                    )}
                  </section>

                  {team.bio && (
                    <section className="section">
                      <h2>Team Bio</h2>
                      <p className="bio">{team.bio}</p>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div className="portfolio-tab">
                  {(team.portfolio || []).length > 0 ? (
                    <div className="portfolio-gallery">
                      {team.portfolio.map((item, index) => (
                        <div key={index} className="portfolio-item">
                          <img src={item.url} alt={item.caption || `Portfolio ${index + 1}`} />
                          {item.caption && <p className="portfolio-caption">{item.caption}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">No portfolio items yet.</div>
                  )}
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="videos-tab">
                  {(team.video_samples || []).length > 0 ? (
                    <div className="videos-grid">
                      {team.video_samples.map((video, index) => (
                        <div key={index} className="video-item">
                          {video.platform === 'youtube' && (
                            <iframe
                              src={`https://www.youtube.com/embed/${video.video_id}`}
                              title={video.title || `Video ${index + 1}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          )}
                          {video.platform === 'vimeo' && (
                            <iframe
                              src={`https://player.vimeo.com/video/${video.video_id}`}
                              title={video.title || `Video ${index + 1}`}
                              frameBorder="0"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          )}
                          {video.title && <p className="video-title">{video.title}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data">No video samples available.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="sidebar">
            <div className="sidebar-card">
              <h3>Availability</h3>
              <div className="availability-status">
                <span className={`status-badge ${team.available ? 'available' : 'unavailable'}`}>
                  {team.available ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            {team.hourly_rate && (
              <div className="sidebar-card">
                <h3>Pricing</h3>
                <p className="pricing">£{team.hourly_rate}/hour</p>
              </div>
            )}

            <div className="sidebar-card">
              <h3>Contact Team</h3>
              <form onSubmit={handleFormSubmit} className="contact-form">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
                <input
                  type="text"
                  name="church"
                  placeholder="Church Name"
                  value={formData.church}
                  onChange={handleFormChange}
                />
                <textarea
                  name="message"
                  placeholder="Your Message"
                  rows="4"
                  value={formData.message}
                  onChange={handleFormChange}
                  required
                ></textarea>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Sending...' : 'Send Message'}
                </button>
                {formSuccess && <p className="form-success">Message sent successfully!</p>}
                {formError && <p className="form-error">{formError}</p>}
              </form>
            </div>

            {(team.website_url || team.facebook_url || team.instagram_url || team.youtube_url) && (
              <div className="sidebar-card">
                <h3>Connect</h3>
                <div className="social-links">
                  {team.website_url && (
                    <a href={team.website_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <i className="icon-globe"></i> Website
                    </a>
                  )}
                  {team.facebook_url && (
                    <a href={team.facebook_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <i className="icon-facebook"></i> Facebook
                    </a>
                  )}
                  {team.instagram_url && (
                    <a href={team.instagram_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <i className="icon-instagram"></i> Instagram
                    </a>
                  )}
                  {team.youtube_url && (
                    <a href={team.youtube_url} target="_blank" rel="noopener noreferrer" className="social-link">
                      <i className="icon-youtube"></i> YouTube
                    </a>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MediaTeamDetailPage;