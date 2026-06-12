import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCodeDisplay from '../components/QRCodeDisplay';
import '../styles/ChurchDetailPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

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

  const handleCheckIn = () => {
    navigate(`/church/${slug}/visit`);
  };

  const handleGetQR = () => {
    setShowQRModal(true);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!church) return <div className="error">Church not found</div>;

  return (
    <div className="church-detail-page">
      <div className="church-header" style={{
        backgroundImage: church.cover_image_url ? `url(${church.cover_image_url})` : 'none'
      }}>
        <div className="header-overlay">
          <div className="header-content">
            {church.logo_url && (
              <img src={church.logo_url} alt={church.name} className="church-logo" />
            )}
            <h1>{church.name}</h1>
            {church.denomination && <p className="denomination">{church.denomination}</p>}
            {church.tagline && <p className="tagline">{church.tagline}</p>}
          </div>
        </div>
      </div>

      <div className="church-content">
        <div className="main-content">
          <div className="action-buttons">
            <button onClick={handleCheckIn} className="btn-primary">
              Check In
            </button>
            <button onClick={handleGetQR} className="btn-secondary">
              Get QR Code
            </button>
          </div>

          {church.description && (
            <section className="section">
              <h2>About Us</h2>
              <p>{church.description}</p>
            </section>
          )}

          {church.service_times && church.service_times.length > 0 && (
            <section className="section">
              <h2>Service Times</h2>
              <ul className="service-times">
                {church.service_times.map((service, idx) => (
                  <li key={idx}>
                    <strong>{service.day}</strong>: {service.time}
                    {service.type && ` - ${service.type}`}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {church.beliefs && church.beliefs.length > 0 && (
            <section className="section">
              <h2>What We Believe</h2>
              <ul>
                {church.beliefs.map((belief, idx) => (
                  <li key={idx}>{belief}</li>
                ))}
              </ul>
            </section>
          )}

          {church.ministries && church.ministries.length > 0 && (
            <section className="section">
              <h2>Ministries</h2>
              <ul>
                {church.ministries.map((ministry, idx) => (
                  <li key={idx}>{ministry}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="sidebar">
          <div className="info-card">
            <h3>Contact Information</h3>
            {church.address && (
              <div className="info-item">
                <strong>📍 Address</strong>
                <p>{church.address}</p>
              </div>
            )}
            {church.phone && (
              <div className="info-item">
                <strong>📞 Phone</strong>
                <p><a href={`tel:${church.phone}`}>{church.phone}</a></p>
              </div>
            )}
            {church.email && (
              <div className="info-item">
                <strong>📧 Email</strong>
                <p><a href={`mailto:${church.email}`}>{church.email}</a></p>
              </div>
            )}
            {church.website && (
              <div className="info-item">
                <strong>🌐 Website</strong>
                <p><a href={church.website} target="_blank" rel="noopener noreferrer">Visit Website</a></p>
              </div>
            )}
          </div>

          {church.pastor && (
            <div className="info-card">
              <h3>Leadership</h3>
              <div className="info-item">
                <strong>Pastor</strong>
                <p>{church.pastor}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQRModal(false)}>×</button>
            <QRCodeDisplay church={church} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchDetailPage;