import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './WorshipLeaderDetailPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const WorshipLeaderDetailPage = () => {
  const { slug } = useParams();
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [formStatus, setFormStatus] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/worship-leaders/${slug}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load'))
      .then(data => { setLeader(data); setLoading(false); })
      .catch(err => { setError(err.toString()); setLoading(false); });
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus('sending');
    try {
      const res = await fetch(`${API_URL}/worship-leaders/${slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormStatus('success');
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
  };

  if (loading) return <div className="wl-loading">Loading worship leader...</div>;
  if (error) return <div className="wl-error">Error: {error}</div>;
  if (!leader) return <div className="wl-error">Worship leader not found</div>;

  const availabilityColor = leader.availability === 'available' ? '#10b981' : leader.availability === 'limited' ? '#f59e0b' : '#ef4444';
  const instrumentColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <>
      <Helmet>
        <title>{leader.name} - Worship Leader | ChurchNavigator</title>
        <meta name="description" content={`${leader.name} - ${leader.instruments?.join(', ')} | ${leader.city || 'UK'} | ${leader.bio?.substring(0, 150) || 'Experienced worship leader'}`} />
      </Helmet>

      <div className="wl-detail-page">
        <div className="wl-hero" style={{ backgroundImage: `url(${leader.coverImage || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-worship-cover.jpg'})` }}>
          <div className="wl-hero-overlay">
            <div className="wl-hero-content">
              <div className="wl-profile-pic-wrapper">
                <img src={leader.profileImage || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-profile.jpg'} alt={leader.name} className="wl-profile-pic" />
              </div>
              <h1 className="wl-hero-title">{leader.name}</h1>
              <p className="wl-hero-subtitle">{leader.instruments?.join(' • ') || 'Worship Leader'} • {leader.city || 'UK'}</p>
            </div>
          </div>
        </div>

        <div className="wl-stats-bar">
          <div className="wl-stat">
            <div className="wl-stat-value">{leader.instruments?.length || 0}</div>
            <div className="wl-stat-label">Instruments</div>
          </div>
          <div className="wl-stat">
            <div className="wl-stat-value">{leader.yearsExperience || 0}+</div>
            <div className="wl-stat-label">Years Experience</div>
          </div>
          <div className="wl-stat">
            <div className="wl-stat-value">{leader.worshipStyles?.length || 0}</div>
            <div className="wl-stat-label">Worship Styles</div>
          </div>
          <div className="wl-stat">
            <div className="wl-stat-value">{leader.languages?.length || 1}</div>
            <div className="wl-stat-label">Languages</div>
          </div>
        </div>

        <div className="wl-container">
          <div className="wl-main-content">
            <div className="wl-tabs">
              <button className={`wl-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
              <button className={`wl-tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Gallery</button>
              <button className={`wl-tab ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>Videos</button>
            </div>

            {activeTab === 'profile' && (
              <div className="wl-tab-content">
                <div className="wl-section">
                  <h2 className="wl-section-title" style={{ borderLeft: '4px solid #3b82f6' }}>About</h2>
                  <p className="wl-bio">{leader.bio || 'No biography available.'}</p>
                </div>

                <div className="wl-section">
                  <h2 className="wl-section-title" style={{ borderLeft: '4px solid #8b5cf6' }}>Instruments</h2>
                  <div className="wl-tags">
                    {leader.instruments?.map((inst, i) => (
                      <span key={i} className="wl-tag" style={{ backgroundColor: instrumentColors[i % instrumentColors.length] }}>{inst}</span>
                    ))}
                  </div>
                </div>

                <div className="wl-section">
                  <h2 className="wl-section-title" style={{ borderLeft: '4px solid #ec4899' }}>Worship Styles</h2>
                  <div className="wl-tags">
                    {leader.worshipStyles?.map((style, i) => (
                      <span key={i} className="wl-tag wl-tag-outline">{style}</span>
                    ))}
                  </div>
                </div>

                <div className="wl-section">
                  <h2 className="wl-section-title" style={{ borderLeft: '4px solid #f59e0b' }}>Denominations</h2>
                  <div className="wl-tags">
                    {leader.denominations?.map((denom, i) => (
                      <span key={i} className="wl-tag wl-tag-outline">{denom}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="wl-tab-content">
                <div className="wl-gallery">
                  {leader.gallery?.length > 0 ? leader.gallery.map((img, i) => (
                    <img key={i} src={img} alt={`${leader.name} ${i + 1}`} className="wl-gallery-img" />
                  )) : <p className="wl-empty">No gallery images available.</p>}
                </div>
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="wl-tab-content">
                <div className="wl-videos">
                  {leader.videos?.length > 0 ? leader.videos.map((video, i) => (
                    <div key={i} className="wl-video">
                      <iframe src={video} title={`Video ${i + 1}`} frameBorder="0" allowFullScreen></iframe>
                    </div>
                  )) : <p className="wl-empty">No videos available.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="wl-sidebar">
            <div className="wl-sidebar-card">
              <div className="wl-availability" style={{ backgroundColor: availabilityColor }}>
                {leader.availability === 'available' ? '✓ Available' : leader.availability === 'limited' ? '⚠ Limited' : '✗ Unavailable'}
              </div>
            </div>

            {leader.churchAssociation && (
              <div className="wl-sidebar-card">
                <h3 className="wl-sidebar-title">Church Association</h3>
                <Link to={`/church/${leader.churchSlug}`} className="wl-church-link">{leader.churchAssociation}</Link>
              </div>
            )}

            <div className="wl-sidebar-card">
              <h3 className="wl-sidebar-title">Contact This Worship Leader</h3>
              <form onSubmit={handleSubmit} className="wl-contact-form">
                <input type="text" placeholder="Your Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <input type="email" placeholder="Your Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                <input type="tel" placeholder="Phone (optional)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                <textarea placeholder="Message" rows="4" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required></textarea>
                <button type="submit" disabled={formStatus === 'sending'}>
                  {formStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
                {formStatus === 'success' && <p className="wl-form-success">Message sent successfully!</p>}
                {formStatus === 'error' && <p className="wl-form-error">Failed to send. Please try again.</p>}
              </form>
            </div>

            {leader.socialLinks && (
              <div className="wl-sidebar-card">
                <h3 className="wl-sidebar-title">Connect</h3>
                <div className="wl-social-icons">
                  {leader.socialLinks.instagram && <a href={leader.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="wl-social-icon">📷</a>}
                  {leader.socialLinks.youtube && <a href={leader.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="wl-social-icon">▶️</a>}
                  {leader.socialLinks.spotify && <a href={leader.socialLinks.spotify} target="_blank" rel="noopener noreferrer" className="wl-social-icon">🎵</a>}
                  {leader.socialLinks.website && <a href={leader.socialLinks.website} target="_blank" rel="noopener noreferrer" className="wl-social-icon">🌐</a>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WorshipLeaderDetailPage;