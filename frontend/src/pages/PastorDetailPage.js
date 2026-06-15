import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { ChevronLeft, ChevronRight, MapPin, Phone, Mail, Calendar, Award, Users, Heart, Share2, Star, BookOpen, MessageCircle, Video, Globe, ExternalLink, Edit, Camera, FileText, Settings, Trash2, X, Send } from 'lucide-react';
import './PastorDetailPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';
const CDN_BASE = 'https://ik.imagekit.io/cuizrvzly/church_navigator';

const PastorDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pastor, setPastor] = useState(null);
  const [sermons, setSermons] = useState([]);
  const [events, setEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [similarPastors, setSimilarPastors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [following, setFollowing] = useState(false);
  const [viewerCount, setViewerCount] = useState(47);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryData, setEnquiryData] = useState({ name: '', email: '', phone: '', message: '' });
  const slideInterval = useRef(null);

  useEffect(() => {
    fetchPastorData();
    return () => clearInterval(slideInterval.current);
  }, [slug]);

  useEffect(() => {
    if (pastor?.images?.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % pastor.images.length);
      }, 5000);
    }
    return () => clearInterval(slideInterval.current);
  }, [pastor]);

  const fetchPastorData = async () => {
    try {
      setLoading(true);
      const [pastorRes, sermonsRes, eventsRes, reviewsRes, similarRes] = await Promise.all([
        axios.get(`${API_BASE}/api/pastors/${slug}`),
        axios.get(`${API_BASE}/api/pastors/${slug}/sermons`),
        axios.get(`${API_BASE}/api/pastors/${slug}/events`),
        axios.get(`${API_BASE}/api/pastors/${slug}/reviews`),
        axios.get(`${API_BASE}/api/pastors/${slug}/similar`)
      ]);
      setPastor(pastorRes.data);
      setSermons(sermonsRes.data);
      setEvents(eventsRes.data);
      setReviews(reviewsRes.data);
      setSimilarPastors(similarRes.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pastor profile');
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await axios.post(`${API_BASE}/api/pastors/${slug}/follow`);
      setFollowing(!following);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleEnquiry = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/enquiries`, {
        pastor_slug: slug,
        ...enquiryData
      });
      alert('Enquiry sent successfully!');
      setShowEnquiry(false);
      setEnquiryData({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      alert('Failed to send enquiry');
    }
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { type: 'user', text: chatInput }]);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { type: 'ai', text: 'Thank you for your message. Pastor will respond shortly.' }]);
    }, 1000);
    setChatInput('');
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading pastor profile...</p></div>;
  if (error) return <div className="error-container"><p>{error}</p><button onClick={() => navigate('/pastors')}>Back to Pastors</button></div>;
  if (!pastor) return <div className="error-container"><p>Pastor not found</p><button onClick={() => navigate('/pastors')}>Back to Pastors</button></div>;

  const images = pastor.images?.length ? pastor.images : [`${CDN_BASE}/pastors/default.jpg`];

  return (
    <>
      <Helmet>
        <title>{pastor.name} - Pastor Profile | ChurchNavigator</title>
        <meta name="description" content={pastor.bio || `Connect with ${pastor.name}, ${pastor.title} at ${pastor.church_name}`} />
        <meta property="og:title" content={`${pastor.name} - Pastor Profile`} />
        <meta property="og:description" content={pastor.bio} />
        <meta property="og:image" content={images[0]} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: pastor.name,
            jobTitle: pastor.title,
            worksFor: { '@type': 'Organization', name: pastor.church_name },
            image: images[0],
            description: pastor.bio
          })}
        </script>
      </Helmet>

      <div className="pastor-detail-page">
        <div className="hero-slider">
          {images.map((img, idx) => (
            <div key={idx} className={`slide ${idx === currentSlide ? 'active' : ''}`} style={{ backgroundImage: `url(${img})` }}>
              <div className="slide-overlay"></div>
            </div>
          ))}
          {images.length > 1 && (
            <>
              <button className="slider-arrow prev" onClick={() => setCurrentSlide((currentSlide - 1 + images.length) % images.length)}>
                <ChevronLeft size={32} />
              </button>
              <button className="slider-arrow next" onClick={() => setCurrentSlide((currentSlide + 1) % images.length)}>
                <ChevronRight size={32} />
              </button>
              <div className="slider-dots">
                {images.map((_, idx) => (
                  <button key={idx} className={idx === currentSlide ? 'active' : ''} onClick={() => setCurrentSlide(idx)} />
                ))}
              </div>
            </>
          )}
          <div className="hero-content">
            <h1>{pastor.name}</h1>
            <p className="subtitle">{pastor.title} • {pastor.church_name}</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => setShowEnquiry(true)}><Mail size={18} /> Contact Pastor</button>
              <button className="btn-outline" onClick={handleFollow}>
                <Heart size={18} fill={following ? '#e74c3c' : 'none'} /> {following ? 'Following' : 'Follow'}
              </button>
              <button className="btn-outline"><Share2 size={18} /> Share</button>
            </div>
          </div>
        </div>

        <div className="stats-band">
          <div className="stat"><Star size={20} /><span>{pastor.rating || 4.8}</span><small>Rating</small></div>
          <div className="stat"><Users size={20} /><span>{pastor.followers || 1234}</span><small>Followers</small></div>
          <div className="stat"><BookOpen size={20} /><span>{pastor.sermons_count || 156}</span><small>Sermons</small></div>
          <div className="stat"><Video size={20} /><span>{pastor.videos_count || 89}</span><small>Videos</small></div>
          <div className="stat"><Calendar size={20} /><span>{pastor.years_ministry || 15}</span><small>Years</small></div>
          <div className="stat"><Award size={20} /><span>{pastor.awards_count || 3}</span><small>Awards</small></div>
          <div className="stat"><MessageCircle size={20} /><span>{reviews.length}</span><small>Reviews</small></div>
          <div className="stat"><Globe size={20} /><span>{pastor.countries_visited || 12}</span><small>Countries</small></div>
        </div>

        <div className="visitor-band">
          <div className="live-indicator"></div>
          <span>{viewerCount} people viewing this profile</span>
        </div>

        <div className="availability-band">
          <span className="availability-status available">Available for Ministry</span>
          <p>{pastor.availability_text || 'Open to speaking engagements, conferences, and guest ministry'}</p>
        </div>

        <div className="tabs-navigation">
          {['overview', 'sermons', 'vision', 'education', 'journey', 'books', 'gallery', 'reviews'].map(tab => (
            <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => scrollToSection(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="content-layout">
          <div className="main-content">
            <section id="overview" className="content-section">
              <h2>Overview</h2>
              <p>{pastor.bio || 'Biography coming soon...'}</p>
            </section>

            <section id="sermons" className="content-section">
              <h2>Recent Sermons</h2>
              <div className="sermons-grid">
                {sermons.map(sermon => (
                  <div key={sermon.id} className="sermon-card">
                    <img src={sermon.thumbnail || `${CDN_BASE}/sermons/default.jpg`} alt={sermon.title} />
                    <h3>{sermon.title}</h3>
                    <p>{sermon.date}</p>
                    <button className="btn-play"><Video size={16} /> Watch</button>
                  </div>
                ))}
              </div>
            </section>

            <section id="vision" className="content-section">
              <h2>Ministry Vision</h2>
              <p>{pastor.vision || 'Vision statement coming soon...'}</p>
            </section>

            <section id="education" className="content-section">
              <h2>Education & Training</h2>
              <ul className="timeline">
                {pastor.education?.map((edu, idx) => (
                  <li key={idx}>
                    <strong>{edu.degree}</strong>
                    <span>{edu.institution}</span>
                    <small>{edu.year}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section id="journey" className="content-section">
              <h2>Ministry Journey</h2>
              <ul className="timeline">
                {pastor.journey?.map((item, idx) => (
                  <li key={idx}>
                    <strong>{item.position}</strong>
                    <span>{item.organization}</span>
                    <small>{item.years}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section id="books" className="content-section">
              <h2>Books & Publications</h2>
              <div className="books-grid">
                {pastor.books?.map(book => (
                  <div key={book.id} className="book-card">
                    <img src={book.cover || `${CDN_BASE}/books/default.jpg`} alt={book.title} />
                    <h3>{book.title}</h3>
                    <p>{book.year}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="gallery" className="content-section">
              <h2>Photo Gallery</h2>
              <div className="gallery-grid">
                {images.map((img, idx) => (
                  <img key={idx} src={img} alt={`Gallery ${idx + 1}`} />
                ))}
              </div>
            </section>

            <section id="reviews" className="content-section">
              <h2>Reviews & Testimonials</h2>
              <div className="reviews-list">
                {reviews.map(review => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <strong>{review.author}</strong>
                      <div className="stars">{Array(5).fill(0).map((_, i) => <Star key={i} size={14} fill={i < review.rating ? '#f39c12' : 'none'} />)}</div>
                    </div>
                    <p>{review.text}</p>
                    <small>{review.date}</small>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="sidebar">
            <div className="sidebar-card contact-card">
              <h3>Contact Pastor</h3>
              <button className="btn-primary btn-block" onClick={() => setShowEnquiry(true)}><Mail size={16} /> Send Enquiry</button>
              <div className="contact-info">
                {pastor.phone && <a href={`tel:${pastor.phone}`}><Phone size={16} /> {pastor.phone}</a>}
                {pastor.email && <a href={`mailto:${pastor.email}`}><Mail size={16} /> {pastor.email}</a>}
              </div>
            </div>

            <div className="sidebar-card church-card">
              <h3>Home Church</h3>
              <p><strong>{pastor.church_name}</strong></p>
              <p><MapPin size={14} /> {pastor.church_address}</p>
              {pastor.church_map && <img src={pastor.church_map} alt="Church location" className="map-img" />}
              <button className="btn-outline btn-block" onClick={() => navigate(`/church/${pastor.church_slug}`)}>
                View Church <ExternalLink size={14} />
              </button>
            </div>

            <div className="sidebar-card travel-card">
              <h3>Travel Information</h3>
              <p>{pastor.travel_info || 'Available for travel within UK and internationally'}</p>
            </div>

            <div className="sidebar-card social-card">
              <h3>Connect</h3>
              <div className="social-icons">
                {pastor.social?.facebook && <a href={pastor.social.facebook} target="_blank" rel="noopener noreferrer">FB</a>}
                {pastor.social?.twitter && <a href={pastor.social.twitter} target="_blank" rel="noopener noreferrer">TW</a>}
                {pastor.social?.instagram && <a href={pastor.social.instagram} target="_blank" rel="noopener noreferrer">IG</a>}
                {pastor.social?.youtube && <a href={pastor.social.youtube} target="_blank" rel="noopener noreferrer">YT</a>}
              </div>
            </div>

            <div className="sidebar-card affiliation-card">
              <h3>Affiliations</h3>
              <ul>
                {pastor.affiliations?.map((aff, idx) => <li key={idx}>{aff}</li>)}
              </ul>
            </div>

            <div className="sidebar-card awards-card">
              <h3>Awards & Recognition</h3>
              <ul>
                {pastor.awards?.map((award, idx) => (
                  <li key={idx}>
                    <Award size={14} /> {award.title} ({award.year})
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {pastor.is_owner && (
          <button className="edit-profile-btn" onClick={() => setShowEditPanel(!showEditPanel)}>
            <Edit size={18} /> Edit Profile
          </button>
        )}

        {showEditPanel && (
          <div className="edit-panel">
            <div className="edit-panel-header">
              <h3>Edit Profile</h3>
              <button onClick={() => setShowEditPanel(false)}><X size={20} /></button>
            </div>
            <div className="edit-options">
              <button><Camera size={16} /> Change Photos</button>
              <button><FileText size={16} /> Edit Bio</button>
              <button><Video size={16} /> Manage Sermons</button>
              <button><Calendar size={16} /> Update Events</button>
              <button><BookOpen size={16} /> Add Books</button>
              <button><Award size={16} /> Add Awards</button>
              <button><Settings size={16} /> Settings</button>
              <button className="btn-danger"><Trash2 size={16} /> Delete Profile</button>
            </div>
          </div>
        )}

        <button className="ai-chat-toggle" onClick={() => setShowChatWidget(!showChatWidget)}>
          <MessageCircle size={24} />
          <svg className="chat-ring" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" />
          </svg>
        </button>

        {showChatWidget && (
          <div className="ai-chat-widget">
            <div className="chat-header">
              <h4>Chat with AI Assistant</h4>
              <button onClick={() => setShowChatWidget(false)}><X size={18} /></button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.type}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input type="text" placeholder="Ask anything..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} />
              <button onClick={handleChatSend}><Send size={18} /></button>
            </div>
          </div>
        )}

        <section className="similar-pastors">
          <h2>Similar Pastors Nearby</h2>
          <div className="pastors-grid">
            {similarPastors.map(p => (
              <div key={p.slug} className="pastor-card" onClick={() => navigate(`/pastor/${p.slug}`)}>
                <img src={p.image || `${CDN_BASE}/pastors/default.jpg`} alt={p.name} />
                <h3>{p.name}</h3>
                <p>{p.title}</p>
                <p className="church-name">{p.church_name}</p>
                <div className="pastor-stats">
                  <span><Star size={12} /> {p.rating}</span>
                  <span><Users size={12} /> {p.followers}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="contact-band">
          <div className="contact-band-content">
            <h2>Ready to Connect?</h2>
            <p>Get in touch with {pastor.name} for ministry opportunities, speaking engagements, or spiritual guidance.</p>
            <button className="btn-primary btn-large" onClick={() => setShowEnquiry(true)}>
              <Mail size={20} /> Send Enquiry Now
            </button>
          </div>
        </div>

        {showEnquiry && (
          <div className="modal-overlay" onClick={() => setShowEnquiry(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Contact {pastor.name}</h3>
                <button onClick={() => setShowEnquiry(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleEnquiry}>
                <input type="text" placeholder="Your Name" value={enquiryData.name} onChange={(e) => setEnquiryData({...enquiryData, name: e.target.value})} required />
                <input type="email" placeholder="Your Email" value={enquiryData.email} onChange={(e) => setEnquiryData({...enquiryData, email: e.target.value})} required />
                <input type="tel" placeholder="Your Phone" value={enquiryData.phone} onChange={(e) => setEnquiryData({...enquiryData, phone: e.target.value})} />
                <textarea placeholder="Your Message" rows="5" value={enquiryData.message} onChange={(e) => setEnquiryData({...enquiryData, message: e.target.value})} required></textarea>
                <button type="submit" className="btn-primary btn-block">Send Enquiry</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PastorDetailPage;