import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwaInstallDismissed');
    if (dismissed === 'true') return;

    const views = parseInt(localStorage.getItem('pageViews') || '0', 10);
    const newViews = views + 1;
    setPageViews(newViews);
    localStorage.setItem('pageViews', newViews.toString());

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (newViews >= 2) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      localStorage.setItem('pwaInstallDismissed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>📱</div>
        <div style={styles.text}>
          <div style={styles.title}>Install ChurchNavigator</div>
          <div style={styles.subtitle}>Get quick access from your home screen</div>
        </div>
        <button onClick={handleInstallClick} style={styles.installButton}>
          Install
        </button>
        <button onClick={handleDismiss} style={styles.closeButton} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    maxWidth: '500px',
    width: 'calc(100% - 40px)',
    animation: 'slideUp 0.3s ease-out'
  },
  content: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative'
  },
  icon: {
    fontSize: '32px',
    flexShrink: 0
  },
  text: {
    flex: 1,
    color: 'white'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.95
  },
  installButton: {
    background: 'white',
    color: '#7c3aed',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.2s'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
    marginLeft: '-8px',
    opacity: 0.8,
    transition: 'opacity 0.2s'
  }
};

export default InstallPrompt;