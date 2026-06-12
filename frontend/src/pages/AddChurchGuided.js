import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddChurchGuided.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

function AddChurchGuided() {
  const [sessionId, setSessionId] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState({});
  const [serviceTimes, setServiceTimes] = useState([]);
  const [contactData, setContactData] = useState({ phone: '', email: '', website: '' });
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/listing/guided/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setCurrentQuestion(data);
      setMessages([{ type: 'ai', text: data.question }]);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
    setLoading(false);
  };

  const submitAnswer = async (answer) => {
    if (!sessionId) return;
    
    setMessages(prev => [...prev, { type: 'user', text: formatAnswerForDisplay(answer) }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/listing/guided/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          step: currentStep,
          answer: answer
        })
      });
      const data = await res.json();
      
      setCurrentStep(data.step);
      setCurrentQuestion(data);
      
      if (data.type === 'preview' || data.type === 'ready') {
        setPreviewData(data.data);
      }
      
      setMessages(prev => [...prev, { type: 'ai', text: data.question, data: data }]);
      setInputValue('');
      setServiceTimes([]);
      setContactData({ phone: '', email: '', website: '' });
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setMessages(prev => [...prev, { type: 'error', text: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const formatAnswerForDisplay = (answer) => {
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) return answer.map(s => `${s.day} ${s.start_time}-${s.end_time}`).join(', ');
    if (typeof answer === 'object') {
      return Object.entries(answer).filter(([k, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
    }
    return JSON.stringify(answer);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      submitAnswer(inputValue.trim());
    }
  };

  const handleSelectOption = (option) => {
    submitAnswer(option);
  };

  const addServiceTime = () => {
    const newService = { day: 'Sunday', start_time: '10:00 AM', end_time: '12:00 PM' };
    setServiceTimes([...serviceTimes, newService]);
  };

  const updateServiceTime = (index, field, value) => {
    const updated = [...serviceTimes];
    updated[index][field] = value;
    setServiceTimes(updated);
  };

  const removeServiceTime = (index) => {
    setServiceTimes(serviceTimes.filter((_, i) => i !== index));
  };

  const submitServiceTimes = () => {
    if (serviceTimes.length > 0) {
      submitAnswer(serviceTimes);
    }
  };

  const handleContactSubmit = () => {
    submitAnswer(contactData);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        submitAnswer(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const skipStep = () => {
    submitAnswer(null);
  };

  const publishListing = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/listing/guided/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      
      if (data.success) {
        navigate(`/church/${data.slug}`);
      }
    } catch (err) {
      console.error('Failed to publish:', err);
      alert('Failed to publish listing. Please try again.');
    }
    setLoading(false);
  };

  const renderInput = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'text':
        return (
          <form onSubmit={handleTextSubmit} className="input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentQuestion.placeholder}
              disabled={loading}
              autoFocus
            />
            <button type="submit" disabled={loading || !inputValue.trim()}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        );

      case 'select':
        return (
          <div className="select-options">
            {currentQuestion.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(option)}
                disabled={loading}
                className="option-btn"
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'service_times':
        return (
          <div className="service-times-input">
            {serviceTimes.map((service, i) => (
              <div key={i} className="service-time-row">
                <select value={service.day} onChange={(e) => updateServiceTime(i, 'day', e.target.value)}>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={service.start_time}
                  onChange={(e) => updateServiceTime(i, 'start_time', e.target.value)}
                />
                <span>to</span>
                <input
                  type="time"
                  value={service.end_time}
                  onChange={(e) => updateServiceTime(i, 'end_time', e.target.value)}
                />
                <button onClick={() => removeServiceTime(i)} className="remove-btn">×</button>
              </div>
            ))}
            <button onClick={addServiceTime} className="add-btn">+ Add Service</button>
            {serviceTimes.length > 0 && (
              <button onClick={submitServiceTimes} className="submit-btn" disabled={loading}>Continue</button>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="contact-input">
            <input
              type="tel"
              placeholder="Phone number"
              value={contactData.phone}
              onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email address"
              value={contactData.email}
              onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
            />
            <input
              type="url"
              placeholder="Website (optional)"
              value={contactData.website}
              onChange={(e) => setContactData({ ...contactData, website: e.target.value })}
            />
            <button onClick={handleContactSubmit} disabled={loading}>Continue</button>
          </div>
        );

      case 'image':
        return (
          <div className="image-input">
            <input type="file" accept="image/*" onChange={handleImageUpload} id="image-upload" />
            <label htmlFor="image-upload" className="upload-btn">Upload Photo</label>
            <button onClick={skipStep} className="skip-btn">Skip for now</button>
          </div>
        );

      case 'preview':
        return (
          <div className="preview-edit">
            <textarea
              value={previewData.description || ''}
              onChange={(e) => setPreviewData({ ...previewData, description: e.target.value })}
              rows="6"
            />
            <button onClick={() => submitAnswer({ edit_description: previewData.description })}>Save & Continue</button>
          </div>
        );

      case 'ready':
        return (
          <div className="publish-actions">
            <button onClick={publishListing} disabled={loading} className="publish-btn">
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="add-church-guided">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(currentStep / 8) * 100}%` }}></div>
      </div>

      <div className="guided-container">
        <div className="chat-section">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.type}`}>
                {msg.type === 'ai' && <div className="avatar">🤖</div>}
                <div className="message-content">
                  {msg.text}
                </div>
                {msg.type === 'user' && <div className="avatar">👤</div>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-section">
            {renderInput()}
          </div>
        </div>

        {Object.keys(previewData).length > 0 && (
          <div className="preview-section">
            <h3>Live Preview</h3>
            <div className="preview-card">
              {previewData.cover_image && <img src={previewData.cover_image} alt="Cover" />}
              <h2>{previewData.name}</h2>
              <p className="location">{previewData.city}</p>
              <p className="denomination">{previewData.denomination}</p>
              <p className="description">{previewData.description}</p>
              {previewData.service_times && previewData.service_times.length > 0 && (
                <div className="services">
                  <strong>Service Times:</strong>
                  {previewData.service_times.map((s, i) => (
                    <div key={i}>{s.day}: {s.start_time} - {s.end_time}</div>
                  ))}
                </div>
              )}
              {previewData.phone && <p>📞 {previewData.phone}</p>}
              {previewData.email && <p>📧 {previewData.email}</p>}
              {previewData.website && <p>🌐 {previewData.website}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddChurchGuided;