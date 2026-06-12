import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VisitorRegistration.css';

function VisitorRegistration() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    how_did_you_hear: '',
    first_time_visitor: false,
    would_like_followup: false,
    prayer_request: ''
  });

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      const response = await fetch(`https://api.churchnavigator.com/api/churches/${slug}`);
      if (!response.ok) throw new Error('Church not found');
      const data = await response.json();
      setChurch(data);
    } catch (err) {
      setError('Church not found');
    } finally {
      setLoading(false);
    }
  };

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
    setError(null);

    try {
      const response = await fetch('https://api.churchnavigator.com/api/visitors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_id: church._id,
          church_slug: slug,
          church_name: church.name,
          ...formData,
          checked_in_via: 'Online Form'
        })
      });

      if (!response.ok) throw new Error('Registration failed');
      setSubmitted(true);
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="visitor-loading">Loading...</div>;
  if (error && !church) return <div className="visitor-error">{error}</div>;

  if (submitted) {
    return (
      <div className="visitor-container">
        <div className="visitor-card success-card">
          <div className="success-icon">✓</div>
          <h1>Thank You for Visiting!</h1>
          <p className="success-message">
            We're so glad you joined us at <strong>{church.name}</strong>!
          </p>
          {formData.would_like_followup && (
            <p className="followup-note">Someone from our team will be in touch soon.</p>
          )}
          <div className="church-info">
            <h3>Visit Us Again:</h3>
            {church.address && <p>📍 {church.address}</p>}
            {church.service_times && <p>⏰ {church.service_times}</p>}
            {church.phone && <p>📞 {church.phone}</p>}
          </div>
          <button onClick={() => navigate(`/church/${slug}`)} className="btn-primary">
            View Church Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="visitor-container">
      <div className="visitor-card">
        <h1>Welcome to {church.name}!</h1>
        <p className="subtitle">We're glad you're here. Please fill out this quick form.</p>

        <form onSubmit={handleSubmit} className="visitor-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>How did you hear about us? *</label>
            <select
              name="how_did_you_hear"
              value={formData.how_did_you_hear}
              onChange={handleChange}
              required
            >
              <option value="">Select...</option>
              <option value="Google">Google Search</option>
              <option value="Friend">Friend / Family</option>
              <option value="Social Media">Social Media</option>
              <option value="Walked Past">Walked Past</option>
              <option value="ChurchNavigator">ChurchNavigator.com</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="first_time_visitor"
                checked={formData.first_time_visitor}
                onChange={handleChange}
              />
              <span>This is my first time visiting</span>
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="would_like_followup"
                checked={formData.would_like_followup}
                onChange={handleChange}
              />
              <span>I'd like someone to follow up with me</span>
            </label>
          </div>

          <div className="form-group">
            <label>Prayer Request (optional)</label>
            <textarea
              name="prayer_request"
              value={formData.prayer_request}
              onChange={handleChange}
              rows="4"
              placeholder="How can we pray for you?"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" disabled={submitting} className="btn-submit">
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default VisitorRegistration;