import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PlannerNewPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const PlannerNewPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [freeText, setFreeText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!freeText.trim()) {
      setError('Please describe your trip');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/api/planner/extract`, {
        text: freeText
      });
      setExtracted(response.data);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process trip description');
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async () => {
    setLoading(true);
    setStep(3);
    const steps = [
      'Finding Pentecostal churches in East London...',
      'Checking event availability...',
      'Calculating travel times...',
      'Building optimised itinerary...',
      'Feasibility check complete'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      setLoadingStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    try {
      const response = await axios.post(`${API_URL}/api/planner/build`, extracted);
      navigate(`/planner/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to build itinerary');
      setLoading(false);
    }
  };

  const getConfirmationIcon = (field) => {
    if (field.missing) return '⚠️';
    return '✅';
  };

  return (
    <div className="planner-new-page">
      <div className="planner-container">
        <div className="planner-header">
          <h1>🗓️ Trip Planner</h1>
          <p>AI-powered church visit planning for leaders and groups</p>
        </div>

        {step === 1 && (
          <div className="planner-step step-input">
            <h2>Describe Your Trip</h2>
            <textarea
              className="trip-textarea"
              placeholder="Describe your trip freely, for example:\n\nBishop Adewale is visiting London from Lagos, Jun 20-25.\nHe wants to visit 6 Pentecostal churches in East London,\nmeet Pastor James Okafor, attend the Gospel Conference on Jun 21,\nand needs airport pickup from Heathrow on Jun 20 at 2pm.\nStaying in Ilford."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={12}
            />
            {error && <div className="error-message">{error}</div>}
            <button 
              className="btn-primary btn-large"
              onClick={handleExtract}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue →'}
            </button>
          </div>
        )}

        {step === 2 && extracted && (
          <div className="planner-step step-confirm">
            <h2>Confirm Trip Details</h2>
            <div className="confirmation-cards">
              <div className="confirm-card">
                <span className="confirm-icon">{getConfirmationIcon(extracted.visitor)}</span>
                <div className="confirm-content">
                  <strong>Visitor:</strong> {extracted.visitor?.value || 'Not specified'}
                </div>
              </div>
              <div className="confirm-card">
                <span className="confirm-icon">{getConfirmationIcon(extracted.dates)}</span>
                <div className="confirm-content">
                  <strong>Dates:</strong> {extracted.dates?.value || 'Not specified'}
                  {extracted.dates?.days && ` (${extracted.dates.days} days)`}
                </div>
              </div>
              <div className="confirm-card">
                <span className="confirm-icon">{getConfirmationIcon(extracted.location)}</span>
                <div className="confirm-content">
                  <strong>Base:</strong> {extracted.location?.value || 'Not specified'}
                </div>
              </div>
              {extracted.mustAttend && (
                <div className="confirm-card">
                  <span className="confirm-icon">✅</span>
                  <div className="confirm-content">
                    <strong>Must attend:</strong> {extracted.mustAttend.value}
                  </div>
                </div>
              )}
              {extracted.mustMeet && (
                <div className="confirm-card">
                  <span className="confirm-icon">✅</span>
                  <div className="confirm-content">
                    <strong>Must meet:</strong> {extracted.mustMeet.value}
                  </div>
                </div>
              )}
              {extracted.accommodation?.missing && (
                <div className="confirm-card warn">
                  <span className="confirm-icon">⚠️</span>
                  <div className="confirm-content">
                    <strong>Accommodation:</strong> not specified — enter manually
                  </div>
                </div>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button 
                className="btn-primary btn-large"
                onClick={handleBuild}
                disabled={loading}
              >
                Build My Itinerary →
              </button>
            </div>
          </div>
        )}

        {step === 3 && loading && (
          <div className="planner-step step-loading">
            <div className="loading-animation">
              <div className="spinner"></div>
              <p className="loading-text">🤖 {loadingStep}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerNewPage;