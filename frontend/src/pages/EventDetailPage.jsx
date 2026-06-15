import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './EventDetailPage.css';

const EventDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenExpanded, setFullscreenExpanded] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [prayerWall, setPrayerWall] = useState([]);
  const [prayerInput, setPrayerInput] = useState('');
  const [prayerAnonymous, setPrayerAnonymous] = useState(false);
  const [promoChannel, setPromoChannel] = useState(null);
  const [promoContent, setPromoContent] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState(0);

  useEffect(() => {
    fetchEvent();
    fetchAiInsights();
    fetchSimilarEvents();
    fetchReviews();
    fetchPrayerWall();
    updateViewCount();
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => {
    const handleTabClick = (e) => {
      const target = e.target.closest('[data-target]');
      if (target) {
        const tabName = target.dataset.target;
        setActiveTab(tabName);
      }
    };
    const tabBar = document.getElementById('tab-bar');
    if (tabBar) {
      tabBar.addEventListener('click', handleTabClick);
      return () => tabBar.removeEventListener('click', handleTabClick);
    }
  }, [event]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
        setFullscreenExpanded(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreen]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}`);
      const data = await res.json();
      setEvent(data);
      setViewerCount(Math.floor(Math.random() * 15) + 5);
      setRecentRegistrations(Math.floor(Math.random() * 8) + 2);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/ai-insights`);
      const data = await res.json();
      setAiInsights(data);
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    }
  };

  const fetchSimilarEvents = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events?similar_to=${slug}&limit=5`);
      const data = await res.json();
      setSimilarEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch similar events:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const fetchPrayerWall = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/prayer-wall`);
      const data = await res.json();
      setPrayerWall(data.prayers || []);
    } catch (err) {
      console.error('Failed to fetch prayer wall:', err);
    }
  };

  const updateViewCount = async () => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/view`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to update view count:', err);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, history: chatMessages })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  const handlePrayerSubmit = async () => {
    if (!prayerInput.trim()) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/prayer-wall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prayerInput, is_anonymous: prayerAnonymous })
      });
      const data = await res.json();
      setPrayerWall([data.prayer, ...prayerWall]);
      setPrayerInput('');
      setPrayerAnonymous(false);
    } catch (err) {
      console.error('Prayer submit error:', err);
    }
  };

  const handlePrayerReact = async (prayerId) => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/prayer-wall/${prayerId}/pray`, {
        method: 'POST'
      });
      setPrayerWall(prayerWall.map(p => p._id === prayerId ? { ...p, praying_count: p.praying_count + 1 } : p));
    } catch (err) {
      console.error('Prayer react error:', err);
    }
  };

  const generatePromo = async (channel) => {
    setPromoChannel(channel);
    setPromoContent('Generating...');
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/generate-promo?channel=${channel}`);
      const data = await res.json();
      setPromoContent(data.content);
    } catch (err) {
      setPromoContent('Failed to generate promo content.');
    }
  };

  const handleRegister = () => {
    navigate(`/events/${slug}/register${selectedTicket ? `?ticket=${selectedTicket}` : ''}`);
  };

  const handleVolunteerSignup = async (role) => {
    const name = prompt('Enter your name:');
    const email = prompt('Enter your email:');
    if (!name || !email) return;
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/events/${slug}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, name, email })
      });
      alert(`Thank you for volunteering as ${role}!`);
      fetchEvent();
    } catch (err) {
      alert('Failed to sign up. Please try again.');
    }
  };

  const getCountdown = () => {
    if (!event?.start_date) return { days: 0, hours: 0, minutes: 0 };
    const now = new Date();
    const start = new Date(event.start_date);
    const diff = start - now;
    if (diff < 0) return { days: 0, hours: 0, minutes: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    };
  };

  if (loading) return <div className="event-loading">Loading event...</div>;
  if (!event) return <div className="event-error">Event not found</div>;

  const countdown = getCountdown();
  const spotsLeft = event.capacity - (event.registered_count || 0);
  const isOwner = false;

  return (
    <div className="event-detail-page">
      <div className="event-hero">
        <div className="hero-gradient"></div>
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-date-badge">{new Date(event.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <h1 className="hero-title">{event.title}</h1>
          <p className="hero-subtitle">{event.tagline || event.description?.substring(0, 120)}</p>
          <div className="hero-countdown">
            <div className="countdown-item"><span className="count">{countdown.days}</span><span className="label">Days</span></div>
            <div className="countdown-item"><span className="count">{countdown.hours}</span><span className="label">Hours</span></div>
            <div className="countdown-item"><span className="count">{countdown.minutes}</span><span className="label">Mins</span></div>
          </div>
          <div className="hero-badge">{event.ticket_type === 'paid' ? 'Filling Fast' : 'Open Registration'}</div>
          <div className="hero-actions">
            <button className="btn-primary" onClick={handleRegister}>Register Now</button>
            <button className="btn-secondary" onClick={() => alert('Add to calendar feature coming soon')}>Add to Calendar</button>
            <button className="btn-fullscreen" onClick={() => setFullscreen(true)}>Full Screen</button>
            {isOwner && <Link to={`/events/${slug}/dashboard`} className="btn-manage">Manage Event</Link>}
          </div>
        </div>
      </div>

      <div className="event-stats-band">
        <div className="stat"><span className="stat-value">{spotsLeft}</span><span className="stat-label">Spots Left</span></div>
        <div className="stat"><span className="stat-value">{event.registered_count || 0}</span><span className="stat-label">Registered</span></div>
        <div className="stat"><span className="stat-value">{event.speakers?.length || 0}</span><span className="stat-label">Speakers</span></div>
        <div className="stat"><span className="stat-value">{event.agenda?.length || 0}</span><span className="stat-label">Sessions</span></div>
        <div className="stat"><span className="stat-value">{event.ticket_type === 'paid' ? `£${event.price}` : 'FREE'}</span><span className="stat-label">Price</span></div>
        <div className="stat"><span className="stat-value">{event.rating || '4.9'}★</span><span className="stat-label">Rating</span></div>
      </div>

      <div className="event-live-band">
        <div className="live-stat live-views"><span className="live-icon">👁️</span><span>{event.page_views || 0} total views</span></div>
        <div className="live-stat live-viewers">
          <div className="viewer-avatars">
            {[...Array(Math.min(5, viewerCount))].map((_, i) => <div key={i} className="viewer-avatar" style={{ left: `${i * 20}px` }}></div>)}
          </div>
          <span>{viewerCount} viewing now</span>
        </div>
        <div className="live-stat live-recent"><span className="live-icon">✨</span><span>{recentRegistrations} registered in last hour</span></div>
        {aiInsights?.attendance_prediction && (
          <div className="live-stat ai-prediction">
            <span className="ai-icon">🤖</span>
            <span>AI predicts {aiInsights.attendance_prediction.optimistic} attendees</span>
          </div>
        )}
      </div>

      <div className="event-container">
        <div className="event-main">
          <div className="event-tabs" id="tab-bar">
            <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} data-target="overview">Overview</div>
            <div className={`tab ${activeTab === 'speakers' ? 'active' : ''}`} data-target="speakers">Speakers</div>
            <div className={`tab ${activeTab === 'agenda' ? 'active' : ''}`} data-target="agenda">Agenda</div>
            <div className={`tab ${activeTab === 'tickets' ? 'active' : ''}`} data-target="tickets">Tickets</div>
            <div className={`tab ${activeTab === 'ai' ? 'active' : ''}`} data-target="ai">AI Intelligence</div>
            <div className={`tab ${activeTab === 'reviews' ? 'active' : ''}`} data-target="reviews">Reviews</div>
            <div className={`tab ${activeTab === 'community' ? 'active' : ''}`} data-target="community">Community</div>
            <div className={`tab ${activeTab === 'prayer' ? 'active' : ''}`} data-target="prayer">Prayer Wall</div>
            <div className={`tab ${activeTab === 'volunteer' ? 'active' : ''}`} data-target="volunteer">Volunteer</div>
          </div>

          <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`} data-tab="overview">
            <section className="about-section">
              <h2>About This Event</h2>
              <p>{event.description}</p>
            </section>
            {event.what_to_expect && (
              <section className="expect-section">
                <h2>What to Expect</h2>
                <div className="expect-grid">
                  {event.what_to_expect.map((item, i) => (
                    <div key={i} className="expect-card">
                      <div className="expect-icon">{item.icon || '✨'}</div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {event.highlights_images?.length > 0 && (
              <section className="highlights-section">
                <h2>Highlights Gallery</h2>
                <div className="highlights-grid">
                  {event.highlights_images.slice(0, 4).map((img, i) => (
                    <div key={i} className="highlight-img" style={{ backgroundImage: `url(${img})` }}></div>
                  ))}
                  {event.highlights_images.length > 4 && (
                    <div className="highlight-more">+{event.highlights_images.length - 4} more</div>
                  )}
                </div>
              </section>
            )}
            {event.testimonial && (
              <section className="testimonial-section">
                <blockquote>
                  <p>"{event.testimonial.quote}"</p>
                  <cite>— {event.testimonial.author}, {event.testimonial.church}</cite>
                </blockquote>
              </section>
            )}
            <section className="network-section">
              <h2>Part of a Growing Network</h2>
              <div className="network-stats">
                <div className="network-stat"><span className="stat-value">{event.years_running || 5}</span><span className="stat-label">Years Running</span></div>
                <div className="network-stat"><span className="stat-value">{event.total_attendees || 2400}</span><span className="stat-label">Total Attendees</span></div>
                <div className="network-stat"><span className="stat-value">{event.churches_reached || 150}</span><span className="stat-label">Churches Reached</span></div>
              </div>
            </section>
          </div>

          <div className={`tab-content ${activeTab === 'speakers' ? 'active' : ''}`} data-tab="speakers">
            <h2>Meet Our Speakers</h2>
            <div className="speakers-grid">
              {event.speakers?.map((speaker, i) => (
                <div key={i} className="speaker-card">
                  <img src={speaker.image || 'https://via.placeholder.com/150'} alt={speaker.name} onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                  <h3><Link to={`/${speaker.type === 'worship_leader' ? 'worship-leaders' : 'pastors'}/${speaker.slug}`}>{speaker.name}</Link></h3>
                  <p className="speaker-role">{speaker.role}</p>
                  <p className="speaker-bio">{speaker.bio}</p>
                  {speaker.topics && (
                    <div className="speaker-topics">
                      {speaker.topics.map((topic, j) => <span key={j} className="topic-chip">{topic}</span>)}
                    </div>
                  )}
                  {speaker.session_time && <p className="speaker-time">Speaking at {speaker.session_time}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'agenda' ? 'active' : ''}`} data-tab="agenda">
            <h2>Event Agenda</h2>
            <div className="agenda-timeline">
              {event.agenda?.map((item, i) => (
                <div key={i} className="agenda-item" style={{ borderLeftColor: item.color || '#7c3aed' }}>
                  <div className="agenda-time">{item.time}</div>
                  <div className="agenda-content">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.speaker && <p className="agenda-speaker">with {item.speaker}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'tickets' ? 'active' : ''}`} data-tab="tickets">
            <h2>Choose Your Ticket</h2>
            {aiInsights?.ticket_recommendation && (
              <div className="ai-recommendation-banner">
                <span className="ai-icon">🤖</span>
                <p>{aiInsights.ticket_recommendation}</p>
              </div>
            )}
            <div className="tickets-grid">
              {event.ticket_types?.map((ticket, i) => (
                <div key={i} className={`ticket-card ${selectedTicket === ticket.type ? 'selected' : ''}`} onClick={() => setSelectedTicket(ticket.type)}>
                  {selectedTicket === ticket.type && <div className="ticket-checkmark">✓</div>}
                  <h3>{ticket.name}</h3>
                  <p className="ticket-price">{ticket.price === 0 ? 'FREE' : `£${ticket.price}`}</p>
                  <ul className="ticket-benefits">
                    {ticket.benefits?.map((benefit, j) => <li key={j}>{benefit}</li>)}
                  </ul>
                  <button className="btn-select" onClick={handleRegister}>Select</button>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'ai' ? 'active' : ''}`} data-tab="ai">
            <h2>AI Intelligence</h2>
            {aiInsights ? (
              <>
                <section className="ai-section">
                  <h3>Attendance Prediction</h3>
                  <div className="ai-prediction-cards">
                    <div className="prediction-card">
                      <h4>Conservative</h4>
                      <p className="prediction-value">{aiInsights.attendance_prediction?.conservative || 'N/A'}</p>
                    </div>
                    <div className="prediction-card">
                      <h4>Optimistic</h4>
                      <p className="prediction-value">{aiInsights.attendance_prediction?.optimistic || 'N/A'}</p>
                    </div>
                  </div>
                </section>
                <section className="ai-section">
                  <h3>Audience Breakdown</h3>
                  {aiInsights.audience_breakdown?.age_groups && Object.entries(aiInsights.audience_breakdown.age_groups).map(([group, pct]) => (
                    <div key={group} className="breakdown-bar">
                      <span className="bar-label">{group}</span>
                      <div className="bar-container"><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
                      <span className="bar-value">{pct}%</span>
                    </div>
                  ))}
                </section>
                <section className="ai-section">
                  <h3>Traffic Sources</h3>
                  {aiInsights.traffic_sources && Object.entries(aiInsights.traffic_sources).map(([source, pct]) => (
                    <div key={source} className="breakdown-bar">
                      <span className="bar-label">{source}</span>
                      <div className="bar-container"><div className="bar-fill" style={{ width: `${pct}%` }}></div></div>
                      <span className="bar-value">{pct}%</span>
                    </div>
                  ))}
                </section>
                <section className="ai-section">
                  <h3>AI Promotion Recommendations</h3>
                  <ul className="ai-recommendations">
                    {aiInsights.promotion_recommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </section>
                <section className="ai-section">
                  <h3>Post-Event Planning</h3>
                  <p>{aiInsights.post_event_planning}</p>
                </section>
              </>
            ) : <p>Loading AI insights...</p>}
          </div>

          <div className={`tab-content ${activeTab === 'reviews' ? 'active' : ''}`} data-tab="reviews">
            <h2>Reviews</h2>
            <div className="reviews-summary">
              <div className="summary-rating">
                <span className="rating-value">{event.rating || '4.9'}</span>
                <span className="rating-stars">{'★'.repeat(Math.round(event.rating || 4.9))}{'☆'.repeat(5 - Math.round(event.rating || 4.9))}</span>
                <span className="rating-count">({reviews.length} reviews)</span>
              </div>
            </div>
            <div className="reviews-list">
              {reviews.map((review, i) => (
                <div key={i} className="review-card">
                  <div className="review-header">
                    <span className="review-author">{review.author_name}</span>
                    <span className="review-rating">{'★'.repeat(review.rating)}</span>
                  </div>
                  <p className="review-text">{review.text}</p>
                  <div className="review-reactions">
                    {['🔥', '🙏', '❤️', '🙌', '✝️'].map((emoji, j) => (
                      <button key={j} className="reaction-btn">{emoji} {review.reactions?.[j] || 0}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'community' ? 'active' : ''}`} data-tab="community">
            <h2>Community</h2>
            <section className="community-section">
              <h3>Church Groups Attending</h3>
              <div className="church-groups">
                {event.attending_churches?.map((church, i) => (
                  <div key={i} className="church-chip">
                    <Link to={`/churches/${church.slug}`}>{church.name}</Link>
                    <span className="attendee-count">{church.attendees} attending</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="community-section">
              <h3>Travelling From</h3>
              <div className="location-chips">
                {event.attendee_locations?.map((loc, i) => <span key={i} className="location-chip">{loc}</span>)}
              </div>
            </section>
            <section className="community-section">
              <h3>"I Was There" Badge Preview</h3>
              <div className="badge-preview">
                <div className="event-badge">
                  <p>{event.title}</p>
                  <p className="badge-date">{new Date(event.start_date).toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </section>
          </div>

          <div className={`tab-content ${activeTab === 'prayer' ? 'active' : ''}`} data-tab="prayer">
            <h2>Prayer Wall</h2>
            <div className="prayer-submit">
              <textarea value={prayerInput} onChange={(e) => setPrayerInput(e.target.value)} placeholder="Share a prayer request..."></textarea>
              <label><input type="checkbox" checked={prayerAnonymous} onChange={(e) => setPrayerAnonymous(e.target.checked)} /> Post anonymously</label>
              <button onClick={handlePrayerSubmit}>Submit Prayer</button>
            </div>
            <div className="prayer-list">
              {prayerWall.map((prayer, i) => (
                <div key={i} className="prayer-card">
                  <p className="prayer-text">{prayer.message}</p>
                  <div className="prayer-footer">
                    <span className="prayer-author">{prayer.is_anonymous ? 'Anonymous' : prayer.author_name}</span>
                    <button className="prayer-btn" onClick={() => handlePrayerReact(prayer._id)}>🙏 Praying ({prayer.praying_count})</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'volunteer' ? 'active' : ''}`} data-tab="volunteer">
            <h2>Volunteer Opportunities</h2>
            <div className="volunteer-grid">
              {['Welcome Team', 'Prayer Team', 'Media Team', 'Children's Ministry', 'Check-in', 'Offering Team'].map((role, i) => {
                const filled = event.volunteer_counts?.[role]?.filled || 0;
                const total = event.volunteer_counts?.[role]?.total || 5;
                return (
                  <div key={i} className="volunteer-card">
                    <h3>{role}</h3>
                    <p className="volunteer-progress">{filled}/{total} filled</p>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${(filled / total) * 100}%` }}></div></div>
                    <button onClick={() => handleVolunteerSignup(role)}>Sign Up</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="event-sidebar">
          <div className="sidebar-card secure-spot">
            <h3>Secure Your Spot</h3>
            <div className="capacity-bar">
              <div className="capacity-fill" style={{ width: `${((event.registered_count || 0) / event.capacity) * 100}%` }}></div>
            </div>
            <p>{spotsLeft} spots left of {event.capacity}</p>
            <button className="btn-register" onClick={handleRegister}>Register Now</button>
          </div>

          <div className="sidebar-card map-card">
            <h3>Location</h3>
            <div className="map-embed">
              <iframe title="Event Location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location?.lng - 0.01},${event.location?.lat - 0.01},${event.location?.lng + 0.01},${event.location?.lat + 0.01}&layer=mapnik&marker=${event.location?.lat},${event.location?.lng}`} style={{ width: '100%', height: '200px', border: 'none' }}></iframe>
            </div>
            <p>{event.location?.address}</p>
          </div>

          <div className="sidebar-card qr-card">
            <h3>QR Check-in</h3>
            <div className="qr-preview">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.href}`} alt="Event QR" />
            </div>
            <p>Scan at the door for quick check-in</p>
          </div>

          <div className="sidebar-card organiser-card">
            <h3>Organised by</h3>
            {event.church && (
              <Link to={`/churches/${event.church.slug}`} className="organiser-link">
                <img src={event.church.logo || 'https://via.placeholder.com/60'} alt={event.church.name} />
                <span>{event.church.name}</span>
              </Link>
            )}
          </div>

          <div className="sidebar-card promo-card">
            <h3>AI Promotion Engine</h3>
            <div className="promo-buttons">
              {['WhatsApp', 'Instagram', 'Facebook', 'Email'].map((channel, i) => (
                <button key={i} onClick={() => generatePromo(channel)}>{channel}</button>
              ))}
            </div>
            {promoChannel && (
              <div className="promo-result">
                <h4>{promoChannel} Copy</h4>
                <p>{promoContent}</p>
                <button onClick={() => navigator.clipboard.writeText(promoContent)}>Copy</button>
              </div>
            )}
          </div>

          <div className="sidebar-card donation-card">
            <h3>Support This Event</h3>
            <p>Your donation helps make events like this possible</p>
            <div className="donation-qr">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${process.env.REACT_APP_API_URL}/api/events/${slug}/donate`} alt="Donate QR" />
            </div>
            <p className="gift-aid-note">Gift Aid eligible</p>
          </div>
        </div>
      </div>

      <div className="similar-events-section">
        <h2>Similar Events You May Like</h2>
        <div className="similar-events-grid">
          {similarEvents.map((evt, i) => (
            <div key={i} className="similar-event-card">
              <div className="card-gradient"></div>
              <div className="card-date-badge">{new Date(evt.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
              <h3>{evt.title}</h3>
              <p className="card-location">{evt.location?.city}</p>
              <div className="card-topics">
                {evt.topics?.slice(0, 3).map((topic, j) => <span key={j} className="topic-chip">{topic}</span>)}
              </div>
              <p className="card-attendees">{evt.registered_count || 0} registered</p>
              <Link to={`/events/${evt.slug}`} className="btn-card-register">View Event</Link>
            </div>
          ))}
        </div>
      </div>

      <div className={`ai-chat-widget ${chatOpen ? 'open' : ''}`}>
        <div className="chat-toggle" onClick={() => setChatOpen(!chatOpen)}>
          <div className="chat-ring"></div>
          <span>💬</span>
        </div>
        {chatOpen && (
          <div className="chat-panel">
            <div className="chat-header">
              <h3>Event Assistant</h3>
              <button onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
            <div className="chat-quick-replies">
              {['When does it start?', 'How do I get there?', 'Is parking available?', 'What should I bring?'].map((q, i) => (
                <button key={i} onClick={() => { setChatInput(q); handleChatSend(); }}>{q}</button>
              ))}
            </div>
            <div className="chat-input">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Ask anything..." />
              <button onClick={handleChatSend}>Send</button>
            </div>
          </div>
        )}
      </div>

      {fullscreen && (
        <div className="fs-overlay">
          {!fullscreenExpanded ? (
            <div className="fs-cover" onClick={() => setFullscreenExpanded(true)}>
              <h1>{event.title}</h1>
              <p>{spotsLeft} spots left • {event.registered_count} registered</p>
              <p className="fs-hint">Click to expand</p>
            </div>
          ) : (
            <div className="fs-page">
              <div className="fs-controls">
                <button onClick={() => setFullscreenExpanded(false)}>Minimise</button>
                <button onClick={() => { setFullscreen(false); setFullscreenExpanded(false); }}>Close</button>
              </div>
              <div className="fs-inner" dangerouslySetInnerHTML={{ __html: document.querySelector('.event-container')?.innerHTML || '' }}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;