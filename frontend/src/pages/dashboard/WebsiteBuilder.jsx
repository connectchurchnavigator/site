import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiEye, FiShare2, FiSettings, FiCheck, FiX } from 'react-icons/fi';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

function WebsiteBuilder({ churchSlug, isPro }) {
  const [settings, setSettings] = useState(null);
  const [themes, setThemes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [churchSlug]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/website/${churchSlug}/settings`);
      setSettings(response.data.settings);
      setThemes(response.data.themes);
      setCustomDomain(response.data.settings.custom_domain || '');
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/api/website/${churchSlug}/settings`, newSettings);
      setSettings(newSettings);
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (themeKey) => {
    const newSettings = { ...settings, theme: themeKey };
    updateSettings(newSettings);
  };

  const toggleSection = (section) => {
    const newSections = { ...settings.sections, [section]: !settings.sections[section] };
    const newSettings = { ...settings, sections: newSections };
    updateSettings(newSettings);
  };

  const publishWebsite = async () => {
    try {
      await axios.post(`${API_URL}/api/website/${churchSlug}/publish`);
      alert('Website published successfully!');
      fetchSettings();
    } catch (error) {
      alert('Failed to publish website');
    }
  };

  const generateQRCode = async () => {
    const url = `https://churchnavigator.com/site/${churchSlug}`;
    const qr = await QRCode.toDataURL(url, { width: 300 });
    setQrCode(qr);
    setShowQR(true);
  };

  const addCustomDomain = async () => {
    if (!isPro) {
      alert('Custom domains require a Pro subscription');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/website/${churchSlug}/domain`, { domain: customDomain });
      alert(`Domain added! Point your DNS:\nType: ${response.data.dns_instructions.type}\nName: ${response.data.dns_instructions.name}\nValue: ${response.data.dns_instructions.value}`);
      fetchSettings();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add domain');
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading website builder...</div>;
  if (!settings) return <div style={{ padding: '40px', textAlign: 'center' }}>Failed to load settings</div>;

  const websiteUrl = `https://churchnavigator.com/site/${churchSlug}`;

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Website Builder</h1>
        <p style={{ color: '#666' }}>Customize your auto-generated church website</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
        <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiSettings /> Website Settings
          </h2>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>Theme</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              {Object.entries(themes).map(([key, theme]) => (
                <div
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  style={{
                    padding: '20px',
                    border: settings.theme === key ? '3px solid #9333ea' : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    position: 'relative',
                    background: theme.colors.bg
                  }}
                >
                  {settings.theme === key && (
                    <FiCheck style={{ position: 'absolute', top: '10px', right: '10px', color: '#9333ea', fontSize: '1.5rem' }} />
                  )}
                  <div style={{ fontWeight: '600', marginBottom: '10px', color: theme.colors.primary }}>{theme.name}</div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {Object.values(theme.colors).slice(0, 5).map((color, i) => (
                      <div key={i} style={{ width: '20px', height: '20px', background: color, borderRadius: '3px' }}></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: '15px' }}>Page Sections</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(settings.sections).map(([section, enabled]) => (
                <div key={section} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: '#f9fafb', borderRadius: '8px' }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{section.replace('_', ' ')}</span>
                  <button
                    onClick={() => toggleSection(section)}
                    style={{
                      background: enabled ? '#10b981' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {enabled ? <><FiCheck /> Enabled</> : <><FiX /> Disabled</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Actions</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <a
              href={`${API_URL}/api/website/${churchSlug}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#9333ea', color: '#fff', padding: '15px', borderRadius: '8px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <FiEye /> Preview Website
            </a>

            <button
              onClick={publishWebsite}
              disabled={settings.published}
              style={{
                background: settings.published ? '#10b981' : '#3b82f6',
                color: '#fff',
                padding: '15px',
                border: 'none',
                borderRadius: '8px',
                cursor: settings.published ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {settings.published ? <><FiCheck /> Published</> : 'Publish Website'}
            </button>

            <button
              onClick={generateQRCode}
              style={{ background: '#6366f1', color: '#fff', padding: '15px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <FiShare2 /> Generate QR Code
            </button>
          </div>

          {settings.published && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #10b981' }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>Your Website URL:</div>
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#9333ea', wordBreak: 'break-all' }}>{websiteUrl}</a>
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              Custom Domain {!isPro && <span style={{ background: '#fbbf24', color: '#fff', padding: '3px 8px', borderRadius: '5px', fontSize: '0.75rem' }}>PRO</span>}
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.yourchurch.com"
                disabled={!isPro}
                style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '5px' }}
              />
              <button
                onClick={addCustomDomain}
                disabled={!isPro || !customDomain}
                style={{ background: isPro ? '#9333ea' : '#d1d5db', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: isPro && customDomain ? 'pointer' : 'not-allowed' }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQR && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowQR(false)}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '15px', textAlign: 'center', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>Website QR Code</h2>
            <img src={qrCode} alt="QR Code" style={{ width: '100%', marginBottom: '20px' }} />
            <p style={{ color: '#666', marginBottom: '20px' }}>Share this QR code to let people visit your website</p>
            <button onClick={() => setShowQR(false)} style={{ background: '#9333ea', color: '#fff', padding: '10px 30px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {saving && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#10b981', color: '#fff', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          Saving changes...
        </div>
      )}
    </div>
  );
}

export default WebsiteBuilder;
