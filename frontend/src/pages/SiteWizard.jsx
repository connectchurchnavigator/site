import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SiteWizard = ({ churchId, churchSlug, onClose }) => {
  const [step, setStep] = useState(1);
  const [domain, setDomain] = useState('');
  const [tld, setTld] = useState('co.uk');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [template, setTemplate] = useState('modern');
  const [plan, setPlan] = useState('standard');
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const checkDomain = async () => {
    if (!domain) return;
    setChecking(true);
    try {
      const res = await axios.get(`${API_URL}/api/sites/domain/check?domain=${domain}&tld=${tld}`);
      setAvailable(res.data.available);
      setAlternatives(res.data.alternatives || []);
      if (res.data.available) {
        setTimeout(() => setStep(3), 1000);
      }
    } catch (err) {
      console.error(err);
    }
    setChecking(false);
  };

  const subscribe = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/sites/subscribe`, {
        church_id: churchId,
        plan,
        domain,
        tld,
        email
      });
      if (res.data.success && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {step === 1 && (
          <div style={styles.step}>
            <div style={styles.icon}>⛪</div>
            <h1 style={styles.title}>Your church deserves a beautiful website</h1>
            <div style={styles.promises}>
              <div style={styles.promise}>
                <span style={styles.check}>✓</span>
                <span>We build it — AI generates 6 pages from your listing</span>
              </div>
              <div style={styles.promise}>
                <span style={styles.check}>✓</span>
                <span>We buy the domain — you just pick the name</span>
              </div>
              <div style={styles.promise}>
                <span style={styles.check}>✓</span>
                <span>We host it — nothing to install, ever</span>
              </div>
              <div style={styles.promise}>
                <span style={styles.check}>✓</span>
                <span>Updates automatically — edit your listing, site updates</span>
              </div>
            </div>
            <button style={styles.btn} onClick={() => setStep(2)}>Let's create your website →</button>
          </div>
        )}

        {step === 2 && (
          <div style={styles.step}>
            <h2 style={styles.subtitle}>What should your website address be?</h2>
            <div style={styles.domainInput}>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                placeholder="libertychurch"
                style={styles.input}
              />
              <select value={tld} onChange={(e) => setTld(e.target.value)} style={styles.select}>
                <option value="co.uk">.co.uk</option>
                <option value="com">.com</option>
                <option value="church">.church</option>
                <option value="org.uk">.org.uk</option>
              </select>
            </div>
            <button style={styles.btn} onClick={checkDomain} disabled={checking || !domain}>
              {checking ? '⏳ Checking...' : 'Check Availability'}
            </button>
            {available === false && (
              <div style={styles.unavailable}>
                <p>✗ {domain}.{tld} is taken. Try these:</p>
                {alternatives.map(alt => (
                  <button key={alt} style={styles.altBtn} onClick={() => {
                    const parts = alt.split('.');
                    setDomain(parts[0]);
                    setTld(parts.slice(1).join('.'));
                    checkDomain();
                  }}>{alt}</button>
                ))}
              </div>
            )}
            {available === true && (
              <div style={styles.available}>✓ Available!</div>
            )}
            <button style={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
          </div>
        )}

        {step === 3 && (
          <div style={styles.step}>
            <h2 style={styles.subtitle}>Choose your design style</h2>
            <div style={styles.templates}>
              {['modern', 'classic', 'bold', 'minimal'].map(t => (
                <div
                  key={t}
                  style={{
                    ...styles.template,
                    border: template === t ? '3px solid #7c3aed' : '1px solid #ddd'
                  }}
                  onClick={() => setTemplate(t)}
                >
                  <div style={styles.templatePreview}>{t.toUpperCase()}</div>
                  <div style={styles.templateName}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>
                </div>
              ))}
            </div>
            <button style={styles.btn} onClick={() => setStep(4)}>Continue →</button>
            <button style={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
          </div>
        )}

        {step === 4 && (
          <div style={styles.step}>
            <h2 style={styles.subtitle}>Review & Pay</h2>
            <div style={styles.summary}>
              <div style={styles.summaryRow}>
                <span>Your website:</span>
                <strong>{domain}.{tld}</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Design:</span>
                <strong>{template.charAt(0).toUpperCase() + template.slice(1)}</strong>
              </div>
              <hr style={styles.hr} />
              <div style={styles.summaryRow}>
                <span>Website building:</span>
                <strong>FREE</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Domain (first year):</span>
                <strong>included</strong>
              </div>
              <div style={styles.summaryRow}>
                <span>Hosting:</span>
                <strong>included</strong>
              </div>
              <hr style={styles.hr} />
              <div style={styles.summaryRow}>
                <span style={styles.total}>Total:</span>
                <strong style={styles.total}>£9/month</strong>
              </div>
              <div style={styles.cancel}>Cancel anytime</div>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={styles.emailInput}
            />
            <button style={styles.btn} onClick={subscribe} disabled={!email}>Start My Website — £9/month</button>
            <button style={styles.backBtn} onClick={() => setStep(3)}>← Back</button>
          </div>
        )}

        <button style={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  modal: {
    background: 'linear-gradient(135deg, #1e0a4a, #3b1f8c)',
    borderRadius: '20px',
    padding: '60px',
    maxWidth: '700px',
    width: '90%',
    color: 'white',
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer'
  },
  step: {
    textAlign: 'center'
  },
  icon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    marginBottom: '30px'
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '30px'
  },
  promises: {
    textAlign: 'left',
    marginBottom: '40px'
  },
  promise: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    fontSize: '16px'
  },
  check: {
    background: 'rgba(124, 58, 237, 0.3)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  btn: {
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '12px',
    cursor: 'pointer',
    width: '100%',
    marginTop: '20px'
  },
  backBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    border: 'none',
    padding: '12px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '12px'
  },
  domainInput: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  input: {
    flex: 1,
    padding: '16px',
    fontSize: '18px',
    borderRadius: '12px',
    border: '2px solid rgba(167, 139, 250, 0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white'
  },
  select: {
    padding: '16px',
    fontSize: '18px',
    borderRadius: '12px',
    border: '2px solid rgba(167, 139, 250, 0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white'
  },
  unavailable: {
    marginTop: '20px',
    padding: '20px',
    background: 'rgba(239, 68, 68, 0.2)',
    borderRadius: '12px'
  },
  available: {
    marginTop: '20px',
    padding: '20px',
    background: 'rgba(34, 197, 94, 0.2)',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700'
  },
  altBtn: {
    background: 'rgba(124, 58, 237, 0.3)',
    color: 'white',
    border: '1px solid rgba(167, 139, 250, 0.4)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    margin: '8px 4px',
    fontSize: '14px'
  },
  templates: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '30px'
  },
  template: {
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  templatePreview: {
    width: '100%',
    height: '150px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '800',
    marginBottom: '12px'
  },
  templateName: {
    fontSize: '16px',
    fontWeight: '600'
  },
  summary: {
    background: 'rgba(255,255,255,0.1)',
    padding: '30px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '16px'
  },
  hr: {
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    margin: '16px 0'
  },
  total: {
    fontSize: '20px',
    fontWeight: '800'
  },
  cancel: {
    textAlign: 'center',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '12px'
  },
  emailInput: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    borderRadius: '12px',
    border: '2px solid rgba(167, 139, 250, 0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    marginBottom: '12px'
  }
};

export default SiteWizard;