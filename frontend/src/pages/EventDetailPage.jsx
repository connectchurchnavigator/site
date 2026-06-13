import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './EventDetailPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const EventDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiInsights, setAiInsights] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [prayerWall, setPrayerWall] = useState([]);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [prayerInput, setPrayerInput] = useState('');
  const [prayerAnon, setPrayerAnon] = useState(false);
  const [prayerName, setPrayerName] = useState('');
  const [fullscreenMode, setFullscreenMode] = useState(null);
  const [liveViewers, setLiveViewers] = useState([]);
  const [promoResult, setPromoResult] = useState(null);
  const [volunteerRole, setVolunteerRole] = useState(null);
  const [volunteerForm, setVolunteerForm] = useState({ name: '', email: '' });
  const tabBarRef = useRef(null);

  useEffect(() => {
    fetchEvent();
    fetchAiInsights();
    fetchReviews();
    fetchPrayerWall();
    fetchSimilarEvents();
    trackPageView();
    const interval = setInterval(fetchLiveViewers, 30000);
    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => {
    if (tabBarRef.current) {
      const handler = (e) => {
        const target = e.target.closest('[data-target]');
        if (target) {
          const tabName = target.dataset.target;
          setActiveTab(tabName);
        }
      };
      tabBarRef.current.addEventListener('click', handler);
      return () => tabBarRef.current?.removeEventListener('click', handler);
    }
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}`);
      if (!res.ok) throw new Error('Event not found');
      const data = await res.json();
      setEvent(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchAiInsights = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/ai-insights`);
      if (res.ok) setAiInsights(await res.json());
    } catch (err) {}
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/reviews`);
      if (res.ok) setReviews(await res.json());
    } catch (err) {}
  };

  const fetchPrayerWall = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/prayer-wall`);
      if (res.ok) setPrayerWall(await res.json());
    } catch (err) {}
  };

  const fetchSimilarEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events?similar_to=${slug}&limit=5`);
      if (res.ok) setSimilarEvents(await res.json());
    } catch (err) {}
  };

  const fetchLiveViewers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/live-viewers`);
      if (res.ok) setLiveViewers(await res.json());
    } catch (err) {}
  };

  const trackPageView = async () => {
    try {
      await fetch(`${API_BASE}/api/events/${slug}/view`, { method: 'POST' });
    } catch (err) {}
  };

  const handleRegister = () => {
    if (event?.registration_url) {
      window.open(event.registration_url, '_blank');
    } else {
      navigate(`/events/${slug}/register`);
    }
  };

  const handleAddToCalendar = () => {
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${event.title}\nDTSTART:${new Date(event.start_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nDTEND:${new Date(event.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nLOCATION:${event.location?.address || ''}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.ics`;
    a.click();
  };

  const handlePromoGenerate = async (channel) => {
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/generate-promo?channel=${channel}`);
      if (res.ok) setPromoResult(await res.json());
    } catch (err) {}
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const msg = { role: 'user', content: chatInput };
    setChatMessages([...chatMessages, msg]);
    setChatInput('');
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, history: chatMessages })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (err) {}
  };

  const handlePrayerSubmit = async (e) => {
    e.preventDefault();
    if (!prayerInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/prayer-wall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prayerInput,
          is_anonymous: prayerAnon,
          author_name: prayerAnon ? 'Anonymous' : prayerName
        })
      });
      if (res.ok) {
        setPrayerInput('');
        setPrayerName('');
        fetchPrayerWall();
      }
    } catch (err) {}
  };

  const handlePrayerReact = async (prayerId) => {
    try {
      await fetch(`${API_BASE}/api/events/${slug}/prayer-wall/${prayerId}/pray`, { method: 'POST' });
      fetchPrayerWall();
    } catch (err) {}
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    if (!volunteerRole || !volunteerForm.name || !volunteerForm.email) return;
    try {
      const res = await fetch(`${API_BASE}/api/events/${slug}/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...volunteerForm, role: volunteerRole })
      });
      if (res.ok) {
        setVolunteerRole(null);
        setVolunteerForm({ name: '', email: '' });
        alert('Thank you for volunteering!');
      }
    } catch (err) {}
  };

  const getCountdown = () => {
    if (!event) return null;
    const now = new Date();
    const start = new Date(event.start_date);
    const diff = start - now;
    if (diff < 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { days, hours, mins };
  };

  const countdown = getCountdown();

  if (loading) return <div className="event-loading">Loading event...</div>;
  if (error) return <div className="event-error">Error: {error}</div>;
  if (!event) return <div className="event-error">Event not found</div>;

  const spotsLeft = event.capacity ? event.capacity - (event.registered_count || 0) : null;
  const isFree = event.ticket_type === 'free';
  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : 0;

  return (
    <div className="event-detail-page">
      <div className="event-hero">
        <div className="hero-gradient"></div>
        <div className="hero-content">
          <div className="hero-badges">
            <span className="date-badge">{new Date(event.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {isFree ? (
              <span className="status-badge free">Open Registration</span>
            ) : (
              <span className="status-badge filling">Filling Fast</span>
            )}
          </div>
          <h1 className="hero-title">{event.title}</h1>
          {countdown && (
            <div className="countdown-timer">
              <div className="countdown-unit"><span>{countdown.days}</span><label>Days</label></div>
              <div className="countdown-unit"><span>{countdown.hours}</span><label>Hours</label></div>
              <div className="countdown-unit"><span>{countdown.mins}</span><label>Mins</label></div>
            </div>
          )}
          <div className="hero-actions">
            <button className="btn-register" onClick={handleRegister}>Register Now</button>
            <button className="btn-calendar" onClick={handleAddToCalendar}>Add to Calendar</button>
            <button className="btn-fullscreen" onClick={() => setFullscreenMode('cover')}>Full Screen</button>
          </div>
          {event.is_owner && (
            <Link to={`/events/${slug}/dashboard`} className="btn-manage">Manage Event</Link>
          )}
        </div>
      </div>

      <div className="stats-band">
        {spotsLeft !== null && <div className="stat-item"><span className="stat-value">{spotsLeft}</span><span className="stat-label">Spots Left</span></div>}
        <div className="stat-item"><span className="stat-value">{event.registered_count || 0}</span><span className="stat-label">Registered</span></div>
        {event.speakers?.length > 0 && <div className="stat-item"><span className="stat-value">{event.speakers.length}</span><span className="stat-label">Speakers</span></div>}
        {event.sessions?.length > 0 && <div className="stat-item"><span className="stat-value">{event.sessions.length}</span><span className="stat-label">Sessions</span></div>}
        <div className="stat-item"><span className="stat-value">{isFree ? 'Free' : `£${event.price}`}</span><span className="stat-label">Price</span></div>
        {avgRating > 0 && <div className="stat-item"><span className="stat-value">{avgRating} ⭐</span><span className="stat-label">Rating</span></div>}
      </div>

      <div className="live-band">
        <div className="live-item total-views"><span className="live-icon">👁️</span><span>{event.views || 0} total views</span></div>
        {liveViewers.length > 0 && (
          <div className="live-item viewers">
            <div className="viewer-avatars">
              {liveViewers.slice(0, 5).map((v, i) => (
                <div key={i} className="viewer-avatar" title={v.name}>{v.name.charAt(0)}</div>
              ))}
            </div>
            <span>{liveViewers.length} viewing now</span>
          </div>
        )}
        {event.recent_registrations > 0 && (
          <div className="live-item recent"><span>{event.recent_registrations} registered in last hour</span></div>
        )}
        {aiInsights?.attendance_prediction && (
          <div className="live-item prediction"><span className="ai-badge">AI</span><span>{aiInsights.attendance_prediction.optimistic} expected</span></div>
        )}
      </div>

      <div className="event-layout">
        <main className="event-main">
          <div className="tab-bar" ref={tabBarRef} id="tab-bar">
            <button className={activeTab === 'overview' ? 'tab active' : 'tab'} data-target="overview">Overview</button>
            <button className={activeTab === 'speakers' ? 'tab active' : 'tab'} data-target="speakers">Speakers <span className="tab-count" style={{pointerEvents:'none'}}>{event.speakers?.length || 0}</span></button>
            <button className={activeTab === 'agenda' ? 'tab active' : 'tab'} data-target="agenda">Agenda</button>
            <button className={activeTab === 'tickets' ? 'tab active' : 'tab'} data-target="tickets">Tickets</button>
            <button className={activeTab === 'ai' ? 'tab active' : 'tab'} data-target="ai">AI Intelligence</button>
            <button className={activeTab === 'reviews' ? 'tab active' : 'tab'} data-target="reviews">Reviews <span className="tab-count" style={{pointerEvents:'none'}}>{reviews.length}</span></button>
            <button className={activeTab === 'community' ? 'tab active' : 'tab'} data-target="community">Community</button>
            <button className={activeTab === 'prayer' ? 'tab active' : 'tab'} data-target="prayer">Prayer Wall</button>
            <button className={activeTab === 'volunteer' ? 'tab active' : 'tab'} data-target="volunteer">Volunteer</button>
          </div>

          <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`} id="tab-overview">
            <section className="about-section">
              <h2>About This Event</h2>
              <p>{event.description}</p>
            </section>
            {event.expectations?.length > 0 && (
              <section className="expect-section">
                <h2>What to Expect</h2>
                <div className="expect-grid">
                  {event.expectations.map((item, i) => (
                    <div key={i} className="expect-card">
                      <div className="expect-icon">{item.icon || '✨'}</div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {event.highlights?.length > 0 && (
              <section className="highlights-section">
                <h2>Event Highlights</h2>
                <div className="highlights-gallery">
                  {event.highlights.slice(0, 4).map((img, i) => (
                    <img key={i} src={img} alt="Highlight" className="highlight-img" />
                  ))}
                  {event.highlights.length > 4 && (
                    <div className="highlight-more">+{event.highlights.length - 4} more</div>
                  )}
                </div>
              </section>
            )}
            {event.testimonial && (
              <blockquote className="testimonial">
                <p>"{event.testimonial.quote}"</p>
                <cite>— {event.testimonial.author}</cite>
              </blockquote>
            )}
            {event.network_stats && (
              <section className="network-stats">
                <h3>Part of a Growing Network</h3>
                <div className="network-grid">
                  <div className="network-stat"><span className="network-value">{event.network_stats.years_running}</span><span className="network-label">Years Running</span></div>
                  <div className="network-stat"><span className="network-value">{event.network_stats.total_attendees?.toLocaleString()}</span><span className="network-label">Total Attendees</span></div>
                  <div className="network-stat"><span className="network-value">{event.network_stats.churches_reached}</span><span className="network-label">Churches Reached</span></div>
                </div>
              </section>
            )}
          </div>

          <div className={`tab-content ${activeTab === 'speakers' ? 'active' : ''}`} id="tab-speakers">
            <h2>Featured Speakers</h2>
            <div className="speakers-grid">
              {event.speakers?.map((speaker, i) => (
                <div key={i} className="speaker-card">
                  <img src={speaker.image || 'https://via.placeholder.com/150'} alt={speaker.name} onError={(e) => e.target.src = 'https://via.placeholder.com/150'} />
                  <h3>{speaker.name}</h3>
                  <p className="speaker-role">{speaker.role}</p>
                  <p className="speaker-bio">{speaker.bio}</p>
                  {speaker.topics?.length > 0 && (
                    <div className="speaker-topics">
                      {speaker.topics.map((t, j) => <span key={j} className="topic-chip">{t}</span>)}
                    </div>
                  )}
                  {speaker.session_time && <p className="speaker-time">📅 {speaker.session_time}</p>}
                  {speaker.slug && (
                    <Link to={`/${speaker.type === 'pastor' ? 'pastors' : 'worship-leaders'}/${speaker.slug}`} className="speaker-link">View Profile →</Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'agenda' ? 'active' : ''}`} id="tab-agenda">
            <h2>Event Agenda</h2>
            <div className="agenda-timeline">
              {event.sessions?.map((session, i) => (
                <div key={i} className="timeline-item" style={{'--color': session.color || '#7c3aed'}}>
                  <div className="timeline-time">{session.time}</div>
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <h3>{session.title}</h3>
                    <p>{session.description}</p>
                    {session.speaker && <p className="session-speaker">🎤 {session.speaker}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'tickets' ? 'active' : ''}`} id="tab-tickets">
            <h2>Ticket Options</h2>
            {aiInsights?.ticket_recommendation && (
              <div className="ai-recommendation">
                <span className="ai-badge">AI Recommendation</span>
                <p>{aiInsights.ticket_recommendation}</p>
              </div>
            )}
            <div className="tickets-grid">
              {event.ticket_options?.map((ticket, i) => (
                <div key={i} className={`ticket-card ${selectedTicket === i ? 'selected' : ''}`} onClick={() => setSelectedTicket(i)}>
                  {selectedTicket === i && <div className="ticket-check">✓</div>}
                  <h3>{ticket.name}</h3>
                  <p className="ticket-price">{ticket.price === 0 ? 'Free' : `£${ticket.price}`}</p>
                  <ul className="ticket-features">
                    {ticket.features?.map((f, j) => <li key={j}>{f}</li>)}
                  </ul>
                  <button className="btn-select-ticket" onClick={(e) => { e.stopPropagation(); handleRegister(); }}>Select</button>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'ai' ? 'active' : ''}`} id="tab-ai">
            <h2>AI Intelligence</h2>
            {aiInsights && (
              <>
                <section className="ai-section">
                  <h3>Attendance Prediction</h3>
                  <div className="prediction-range">
                    <div className="prediction-item"><span className="prediction-label">Conservative</span><span className="prediction-value">{aiInsights.attendance_prediction?.conservative || 0}</span></div>
                    <div className="prediction-item"><span className="prediction-label">Optimistic</span><span className="prediction-value">{aiInsights.attendance_prediction?.optimistic || 0}</span></div>
                  </div>
                </section>
                <section className="ai-section">
                  <h3>Audience Breakdown</h3>
                  {aiInsights.audience_breakdown?.map((item, i) => (
                    <div key={i} className="breakdown-bar">
                      <label>{item.label}</label>
                      <div className="bar-track"><div className="bar-fill" style={{width: `${item.percentage}%`}}></div></div>
                      <span>{item.percentage}%</span>
                    </div>
                  ))}
                </section>
                <section className="ai-section">
                  <h3>AI Promotion Recommendations</h3>
                  <ul className="ai-recs">
                    {aiInsights.promotion_recommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </section>
                <section className="ai-section">
                  <h3>Post-Event Planning</h3>
                  <p>{aiInsights.post_event_plan}</p>
                </section>
              </>
            )}
          </div>

          <div className={`tab-content ${activeTab === 'reviews' ? 'active' : ''}`} id="tab-reviews">
            <h2>Reviews</h2>
            <div className="reviews-summary">
              <div className="avg-rating">{avgRating} ⭐</div>
              <p>{reviews.length} reviews</p>
            </div>
            <div className="reviews-list">
              {reviews.map((review, i) => (
                <div key={i} className="review-card">
                  <div className="review-header">
                    <span className="review-author">{review.author}</span>
                    <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p className="review-text">{review.text}</p>
                  <div className="review-reactions">
                    {['🔥', '🙏', '❤️', '🙌', '✝️'].map((emoji, j) => (
                      <button key={j} className="reaction-btn">{emoji} {review.reactions?.[emoji] || 0}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'community' ? 'active' : ''}`} id="tab-community">
            <h2>Community</h2>
            {event.church_groups?.length > 0 && (
              <section className="community-section">
                <h3>Church Groups Attending</h3>
                <div className="church-groups">
                  {event.church_groups.map((group, i) => (
                    <Link key={i} to={`/churches/${group.slug}`} className="church-group-card">
                      <img src={group.logo} alt={group.name} />
                      <h4>{group.name}</h4>
                      <p>{group.count} members registered</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {event.locations?.length > 0 && (
              <section className="community-section">
                <h3>Travelling From</h3>
                <div className="location-chips">
                  {event.locations.map((loc, i) => <span key={i} className="location-chip">{loc}</span>)}
                </div>
              </section>
            )}
            <section className="community-section">
              <h3>"I Was There" Badge Preview</h3>
              <div className="badge-preview">
                <img src="/images/i-was-there-badge.png" alt="I Was There Badge" />
                <p>Unlock this badge by checking in at the event!</p>
              </div>
            </section>
          </div>

          <div className={`tab-content ${activeTab === 'prayer' ? 'active' : ''}`} id="tab-prayer">
            <h2>Prayer Wall</h2>
            <form className="prayer-form" onSubmit={handlePrayerSubmit}>
              <textarea value={prayerInput} onChange={(e) => setPrayerInput(e.target.value)} placeholder="Share your prayer request..." required />
              <div className="prayer-form-footer">
                <label><input type="checkbox" checked={prayerAnon} onChange={(e) => setPrayerAnon(e.target.checked)} /> Post anonymously</label>
                {!prayerAnon && <input type="text" value={prayerName} onChange={(e) => setPrayerName(e.target.value)} placeholder="Your name" required />}
                <button type="submit" className="btn-submit-prayer">Submit Prayer</button>
              </div>
            </form>
            <div className="prayer-list">
              {prayerWall.map((prayer, i) => (
                <div key={i} className="prayer-card">
                  <p className="prayer-message">{prayer.message}</p>
                  <div className="prayer-footer">
                    <span className="prayer-author">{prayer.author_name}</span>
                    <button className="btn-pray" onClick={() => handlePrayerReact(prayer._id)}>🙏 Praying ({prayer.praying_count || 0})</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'volunteer' ? 'active' : ''}`} id="tab-volunteer">
            <h2>Volunteer Opportunities</h2>
            <div className="volunteer-roles">
              {['Welcome Team', 'Prayer Ministry', 'Media Team', 'Children Ministry', 'Check-in Team', 'Offering Team'].map((role, i) => {
                const roleData = event.volunteer_roles?.find(r => r.name === role) || { filled: 0, total: 10 };
                return (
                  <div key={i} className="volunteer-card">
                    <h3>{role}</h3>
                    <div className="volunteer-progress">
                      <div className="progress-bar"><div className="progress-fill" style={{width: `${(roleData.filled / roleData.total) * 100}%`}}></div></div>
                      <span>{roleData.filled} / {roleData.total} filled</span>
                    </div>
                    <button className="btn-volunteer" onClick={() => setVolunteerRole(role)}>Sign Up</button>
                  </div>
                );
              })}
            </div>
            {volunteerRole && (
              <div className="volunteer-modal">
                <div className="modal-content">
                  <h3>Sign Up for {volunteerRole}</h3>
                  <form onSubmit={handleVolunteerSubmit}>
                    <input type="text" value={volunteerForm.name} onChange={(e) => setVolunteerForm({...volunteerForm, name: e.target.value})} placeholder="Your name" required />
                    <input type="email" value={volunteerForm.email} onChange={(e) => setVolunteerForm({...volunteerForm, email: e.target.value})} placeholder="Your email" required />
                    <div className="modal-actions">
                      <button type="submit" className="btn-submit">Submit</button>
                      <button type="button" className="btn-cancel" onClick={() => setVolunteerRole(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="event-sidebar">
          <div className="sidebar-card secure-spot">
            <h3>Secure Your Spot</h3>
            {spotsLeft !== null && (
              <div className="capacity-bar">
                <div className="capacity-fill" style={{width: `${((event.registered_count || 0) / event.capacity) * 100}%`}}></div>
              </div>
            )}
            <p>{spotsLeft !== null ? `${spotsLeft} spots remaining` : 'Unlimited capacity'}</p>
            <button className="btn-register-sidebar" onClick={handleRegister}>Register Now</button>
          </div>

          {event.location && (
            <div className="sidebar-card map-card">
              <h3>Location</h3>
              <iframe src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location.lng - 0.01},${event.location.lat - 0.01},${event.location.lng + 0.01},${event.location.lat + 0.01}&layer=mapnik&marker=${event.location.lat},${event.location.lng}`} width="100%" height="200" frameBorder="0" title="Event Location"></iframe>
              <p>{event.location.address}</p>
            </div>
          )}

          <div className="sidebar-card qr-card">
            <h3>QR Check-in</h3>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.href}`} alt="QR Code" />
            <p>Save this QR for quick check-in</p>
          </div>

          {event.organiser && (
            <div className="sidebar-card organiser-card">
              <h3>Organised By</h3>
              <Link to={`/churches/${event.organiser.slug}`} className="organiser-link">
                <img src={event.organiser.logo} alt={event.organiser.name} />
                <h4>{event.organiser.name}</h4>
              </Link>
            </div>
          )}

          <div className="sidebar-card promo-card">
            <h3>AI Promotion Engine</h3>
            <div className="promo-buttons">
              {['whatsapp', 'instagram', 'facebook', 'email'].map((channel) => (
                <button key={channel} className="btn-promo" onClick={() => handlePromoGenerate(channel)}>{channel.charAt(0).toUpperCase() + channel.slice(1)}</button>
              ))}
            </div>
            {promoResult && (
              <div className="promo-result">
                <p>{promoResult.text}</p>
                <button className="btn-copy" onClick={() => navigator.clipboard.writeText(promoResult.text)}>Copy</button>
              </div>
            )}
          </div>

          <div className="sidebar-card donate-card">
            <h3>Support This Event</h3>
            <p>Your donation helps cover event costs</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${API_BASE}/api/events/${slug}/donate`} alt="Donation QR" />
            <p className="gift-aid">UK taxpayers: Gift Aid increases your donation by 25%</p>
          </div>
        </aside>
      </div>

      <section className="similar-events-section">
        <h2>Similar Events</h2>
        <div className="similar-events-grid">
          {similarEvents.map((sim, i) => (
            <Link key={i} to={`/events/${sim.slug}`} className="similar-event-card">
              <div className="similar-header" style={{background: 'linear-gradient(135deg, #7c3aed, #3b1f8c)'}}>
                <span className="similar-date">{new Date(sim.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </div>
              <h3>{sim.title}</h3>
              <p className="similar-location">📍 {sim.location?.address}</p>
              {sim.topics?.length > 0 && (
                <div className="similar-topics">
                  {sim.topics.slice(0, 3).map((t, j) => <span key={j} className="topic-chip">{t}</span>)}
                </div>
              )}
              <p className="similar-attendees">👥 {sim.registered_count || 0} registered</p>
              <button className="btn-register-similar">Register</button>
            </Link>
          ))}
        </div>
      </section>

      {chatOpen && (
        <div className="chat-widget open">
          <div className="chat-header">
            <h3>Event Assistant</h3>
            <button className="chat-close" onClick={() => setChatOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-message ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="chat-quick-replies">
            {['Parking info?', 'Dress code?', 'Food provided?', 'Childcare available?'].map((q, i) => (
              <button key={i} className="quick-reply" onClick={() => { setChatInput(q); handleChatSend(); }}>{q}</button>
            ))}
          </div>
          <div className="chat-input">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleChatSend()} placeholder="Ask anything..." />
            <button onClick={handleChatSend}>Send</button>
          </div>
        </div>
      )}
      {!chatOpen && (
        <button className="chat-toggle" onClick={() => setChatOpen(true)}>
          <div className="chat-ring"></div>
          💬
        </button>
      )}

      {fullscreenMode && (
        <div className="fs-overlay" onClick={(e) => e.target.className === 'fs-overlay' && setFullscreenMode(null)}>
          {fullscreenMode === 'cover' && (
            <div className="fs-cover" onClick={() => setFullscreenMode('page')}>
              <h1>{event.title}</h1>
              <div className="fs-stats">
                <span>{event.registered_count || 0} registered</span>
                <span>{spotsLeft !== null ? `${spotsLeft} spots left` : 'Unlimited'}</span>
                <span>{isFree ? 'Free' : `£${event.price}`}</span>
              </div>
              <p>Click to expand</p>
            </div>
          )}
          {fullscreenMode === 'page' && (
            <div className="fs-page">
              <div className="fs-controls">
                <button onClick={() => setFullscreenMode('cover')}>Minimise</button>
                <button onClick={() => setFullscreenMode(null)}>Close</button>
              </div>
              <div className="fs-inner" dangerouslySetInnerHTML={{__html: document.querySelector('.event-detail-page').innerHTML}}></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetailPage;