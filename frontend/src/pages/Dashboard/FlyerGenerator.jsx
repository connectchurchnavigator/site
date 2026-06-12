import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './FlyerGenerator.css';

const FLYER_TYPES = [
  { id: 'sunday_service', name: 'Sunday Service', icon: '⛪', desc: 'Join us this Sunday' },
  { id: 'event', name: 'Event', icon: '🎉', desc: 'Promote your event' },
  { id: 'pastor_intro', name: 'Pastor Intro', icon: '👨‍💼', desc: 'Meet our pastor' },
  { id: 'church_intro', name: 'Church Intro', icon: '🏛️', desc: "You're invited" },
  { id: 'first_visitor', name: 'Welcome', icon: '👋', desc: 'First time visitor' },
  { id: 'prayer_request', name: 'Prayer Line', icon: '🙏', desc: 'Share prayer line' }
];

const SIZES = [
  { id: 'a4', name: 'A4 Print', icon: '📄', size: '210×297mm' },
  { id: 'a5', name: 'A5 Print', icon: '📃', size: '148×210mm' },
  { id: 'square', name: 'Instagram', icon: '📱', size: '1080×1080' },
  { id: 'story', name: 'Story', icon: '📲', size: '1080×1920' },
  { id: 'banner', name: 'Banner', icon: '🖼️', size: '1200×630' }
];

const FlyerGenerator = () => {
  const { church } = useAuth();
  const [selectedType, setSelectedType] = useState('sunday_service');
  const [selectedSize, setSelectedSize] = useState('square');
  const [loading, setLoading] = useState(false);
  const [generatedFlyer, setGeneratedFlyer] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [customText, setCustomText] = useState({});
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadHistory();
    if (selectedType === 'event') {
      loadEvents();
    }
  }, [selectedType]);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.churchnavigator.com/api/flyers/${church._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.churchnavigator.com/api/events?church_id=${church._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const generateFlyer = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://api.churchnavigator.com/api/flyers/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          church_id: church._id,
          flyer_type: selectedType,
          size: selectedSize,
          event_id: selectedEvent,
          custom_text: Object.keys(customText).length > 0 ? customText : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedFlyer(data);
        loadHistory();
        setShowEditor(false);
      } else {
        alert('Failed to generate flyer');
      }
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Failed to generate flyer');
    } finally {
      setLoading(false);
    }
  };

  const downloadFlyer = () => {
    if (!generatedFlyer) return;
    const link = document.createElement('a');
    link.href = generatedFlyer.flyer_url;
    link.download = `flyer_${selectedType}_${selectedSize}.png`;
    link.click();
  };

  const shareWhatsApp = () => {
    if (!generatedFlyer) return;
    const text = `Check out our ${FLYER_TYPES.find(t => t.id === selectedType)?.name} flyer!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + generatedFlyer.flyer_url)}`;
    window.open(url, '_blank');
  };

  const copyLink = () => {
    if (!generatedFlyer) return;
    navigator.clipboard.writeText(generatedFlyer.flyer_url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="flyer-generator">
      <div className="flyer-header">
        <h1>🎨 Flyer Generator</h1>
        <p>Create professional flyers in seconds</p>
      </div>

      <div className="flyer-layout">
        <div className="flyer-controls">
          <div className="control-section">
            <h3>1. Choose Flyer Type</h3>
            <div className="type-grid">
              {FLYER_TYPES.map(type => (
                <button
                  key={type.id}
                  className={`type-card ${selectedType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-name">{type.name}</span>
                  <span className="type-desc">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedType === 'event' && events.length > 0 && (
            <div className="control-section">
              <h3>Select Event</h3>
              <select
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="event-select"
              >
                <option value="">Choose an event...</option>
                {events.map(evt => (
                  <option key={evt._id} value={evt._id}>{evt.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="control-section">
            <h3>2. Choose Size</h3>
            <div className="size-grid">
              {SIZES.map(size => (
                <button
                  key={size.id}
                  className={`size-card ${selectedSize === size.id ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size.id)}
                >
                  <span className="size-icon">{size.icon}</span>
                  <span className="size-name">{size.name}</span>
                  <span className="size-dim">{size.size}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h3>3. Customize (Optional)</h3>
            <button
              className="customize-btn"
              onClick={() => setShowEditor(!showEditor)}
            >
              {showEditor ? '✖️ Close Editor' : '✏️ Edit Text'}
            </button>
            {showEditor && (
              <div className="text-editor">
                <input
                  type="text"
                  placeholder="Custom Title"
                  value={customText.title || ''}
                  onChange={(e) => setCustomText({...customText, title: e.target.value})}
                  className="editor-input"
                />
                <textarea
                  placeholder="Custom Message"
                  value={customText.message || ''}
                  onChange={(e) => setCustomText({...customText, message: e.target.value})}
                  className="editor-textarea"
                  rows="3"
                />
              </div>
            )}
          </div>

          <button
            className="generate-btn"
            onClick={generateFlyer}
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '✨ Generate Flyer'}
          </button>
        </div>

        <div className="flyer-preview">
          <div className="preview-card">
            {generatedFlyer ? (
              <>
                <img src={generatedFlyer.flyer_url} alt="Generated flyer" className="preview-image" />
                <div className="preview-actions">
                  <button onClick={downloadFlyer} className="action-btn primary">
                    ⬇️ Download PNG
                  </button>
                  <button onClick={shareWhatsApp} className="action-btn success">
                    📱 Share WhatsApp
                  </button>
                  <button onClick={copyLink} className="action-btn secondary">
                    🔗 Copy Link
                  </button>
                </div>
              </>
            ) : (
              <div className="preview-placeholder">
                <span className="placeholder-icon">🎨</span>
                <p>Your flyer will appear here</p>
                <p className="placeholder-hint">Select type and size, then click generate</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flyer-history">
          <h3>📚 Recent Flyers</h3>
          <div className="history-grid">
            {history.map(flyer => (
              <div key={flyer.flyer_id} className="history-card">
                <img src={flyer.preview_url} alt={flyer.flyer_type} />
                <div className="history-info">
                  <span className="history-type">{FLYER_TYPES.find(t => t.id === flyer.flyer_type)?.name}</span>
                  <span className="history-size">{SIZES.find(s => s.id === flyer.size)?.name}</span>
                </div>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = flyer.flyer_url;
                    link.download = `${flyer.flyer_type}_${flyer.size}.png`;
                    link.click();
                  }}
                  className="history-download"
                >
                  ⬇️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlyerGenerator;