import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/VisitorRegisterPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.churchnavigator.com';

const VisitorRegisterPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_first_visit: true,
    how_heard: '',
    prayer_request: '',
    wants_followup: true
  });

  const hearAboutOptions = [
    'Friend or Family',
    'Google Search',
    'Social Media',
    'Driving By',
    'Church Website',
    'Event or Outreach',
    'Other'
  ];

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/churches/slug/${slug}`);
        setChurch(response.data);
        setLoading(false);
      } catch (err) {
        setError('Church not found');
        setLoading(false);
      }
    };
    fetchChurch();
  }, [slug]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/visitors`, {
        church_id: church._id,
        ...formData
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="visitor-loading">Loading...</div>;
  }

  if (error && !church) {
    return <div className="visitor-error">{error}</div>;
  }

  if (submitted) {
    return (
      <div className="visitor-thank-you">
        <div className="thank-you-card">
          <img src={church.logo_url} alt={church.name} className="thank-you-logo" />
          <h1>Thank You for Visiting!</h1>
          <p className="thank-you-message">
            We're so glad you're here at {church.name}. We look forward to meeting you!
          </p>
          
          {church.service_times && church.service_times.length > 0 && (
            <div className="service-times-section">
              <h2>Our Service Times</h2>
              <ul className="service-times-list">
                {church.service_times.map((service, idx) => (
                  <li key={idx}>
                    <strong>{service.day}</strong>: {service.time}
                    {service.type && ` - ${service.type}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {church.address && (
            <div className="church-address">
              <h3>Location</h3>
              <p>{church.address}</p>
            </div>
          )}

          <button onClick={() => navigate(`/church/${slug}`)} className="btn-primary">
            View Church Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-register-page">
      <div className="visitor-header" style={{
        backgroundImage: church.cover_image_url ? `url(${church.cover_image_url})` : 'none'
      }}>
        <div className="header-overlay">
          {church.logo_url && (
            <img src={church.logo_url} alt={church.name} className="church-logo" />
          )}
          <h1>Welcome to {church.name}</h1>
          <p>We're excited to meet you!</p>
        </div>
      </div>

      <div className="visitor-form-container">
        <form onSubmit={handleSubmit} className="visitor-form">
          <h2>Visitor Registration</h2>
          
          {error && <div className="form-error">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="is_first_visit"
                checked={formData.is_first_visit}
                onChange={handleChange}
              />
              <span>This is my first time visiting</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="how_heard">How did you hear about us?</label>
            <select
              id="how_heard"
              name="how_heard"
              value={formData.how_heard}
              onChange={handleChange}
            >
              <option value="">Select an option</option>
              {hearAboutOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="prayer_request">Prayer Request (Optional)</label>
            <textarea
              id="prayer_request"
              name="prayer_request"
              value={formData.prayer_request}
              onChange={handleChange}
              rows="4"
              placeholder="Share any prayer requests you may have..."
            />
          </div>

          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="wants_followup"
                checked={formData.wants_followup}
                onChange={handleChange}
              />
              <span>I'd like someone from the church to follow up with me</span>
            </label>
          </div>

          <button type="submit" disabled={submitting} className="btn-submit">
            {submitting ? 'Submitting...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VisitorRegisterPage;