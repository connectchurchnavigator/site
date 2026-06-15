import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const SitesWizard = () => {
  const { churchSlug } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [tld, setTld] = useState('co.uk');
  const [template, setTemplate] = useState('modern');
  const [plan, setPlan] = useState('standard');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [price, setPrice] = useState(0);

  const checkDomain = async () => {
    if (!domain) return;
    setChecking(true);
    try {
      const response = await api.get(`/sites/domain/check?domain=${domain}&tld=${tld}`);
      setAvailable(response.data.available);
      setPrice(response.data.price);
      setAlternatives(response.data.alternatives || []);
    } catch (error) {
      console.error('Domain check failed:', error);
    }
    setChecking(false);
  };

  const handleSubscribe = async () => {
    try {
      const response = await api.post('/sites/subscribe', {
        church_id: churchSlug,
        plan,
        domain,
        tld,
        template
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Subscription failed:', error);
      alert('Failed to create subscription. Please try again.');
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (domain && step === 2) checkDomain();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [domain, tld]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e0a4a 0%, #3b1f8c 100%)', color: '#fff', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', marginBottom: '30px' }}>Your church deserves a beautiful website 🌟</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', margin: '40px 0' }}>
              <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <h3>We build it</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>AI generates 6 pages from your listing</p>
              </div>
              <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <h3>We buy the domain</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>You just pick the name</p>
              </div>
              <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <h3>We host it</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Nothing to install, ever</p>
              </div>
              <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                <h3>Updates automatically</h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Edit your listing, site updates</p>
              </div>
            </div>
            <button onClick={() => setStep(2)} style={{ background: '#7c3aed', color: '#fff', padding: '16px 40px', fontSize: '18px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Let's create your website →</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>What should your website address be?</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" value={domain} onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="libertychristian" style={{ flex: 1, padding: '16px', fontSize: '18px', borderRadius: '8px', border: '2px solid rgba(167, 139, 250, 0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              <select value={tld} onChange={(e) => setTld(e.target.value)} style={{ padding: '16px', fontSize: '18px', borderRadius: '8px', border: '2px solid rgba(167, 139, 250, 0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                <option value="co.uk">.co.uk</option>
                <option value="com">.com</option>
                <option value="org.uk">.org.uk</option>
                <option value="church">.church</option>
              </select>
            </div>
            {checking && <p>🔍 Checking availability...</p>}
            {available === true && <p style={{ color: '#10b981', fontSize: '18px' }}>✅ Available! Included in your £9/month subscription</p>}
            {available === false && (
              <div>
                <p style={{ color: '#ef4444', fontSize: '18px' }}>❌ Taken, try these alternatives:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                  {alternatives.map((alt, idx) => (
                    <button key={idx} onClick={() => { setDomain(alt.split('.')[0]); setTld(alt.split('.').slice(1).join('.')); }} style={{ padding: '12px', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>{alt}</button>
                  ))}
                </div>
              </div>
            )}
            {available === true && (
              <button onClick={() => setStep(3)} style={{ background: '#7c3aed', color: '#fff', padding: '16px 40px', fontSize: '18px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' }}>Continue →</button>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Choose your style</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              {['modern', 'classic', 'bold', 'minimal'].map((t) => (
                <div key={t} onClick={() => setTemplate(t)} style={{ padding: '20px', background: template === t ? 'rgba(124, 58, 237, 0.4)' : 'rgba(124, 58, 237, 0.2)', border: template === t ? '2px solid #7c3aed' : '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', textTransform: 'capitalize' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
                  <h3>{t}</h3>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(4)} style={{ background: '#7c3aed', color: '#fff', padding: '16px 40px', fontSize: '18px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Continue →</button>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Review & Pay</h2>
            <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)', marginBottom: '30px' }}>
              <div style={{ marginBottom: '15px', fontSize: '18px' }}>🌐 Your website: <strong>{domain}.{tld}</strong></div>
              <div style={{ marginBottom: '15px', fontSize: '18px' }}>🎨 Design: <strong style={{ textTransform: 'capitalize' }}>{template}</strong></div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(167, 139, 250, 0.3)', margin: '20px 0' }} />
              <div style={{ marginBottom: '10px' }}>Website building: <strong>FREE</strong></div>
              <div style={{ marginBottom: '10px' }}>Domain (first year): <strong>included</strong></div>
              <div style={{ marginBottom: '10px' }}>Hosting: <strong>included</strong></div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(167, 139, 250, 0.3)', margin: '20px 0' }} />
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Total: £9/month</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Cancel anytime</div>
            </div>
            <button onClick={handleSubscribe} style={{ background: '#7c3aed', color: '#fff', padding: '16px 40px', fontSize: '18px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>Start My Website — £9/month</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SitesWizard;