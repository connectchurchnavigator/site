import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (dismissed || isStandalone) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const views = parseInt(sessionStorage.getItem('page-views') || '0');
    setPageViews(views + 1);
    sessionStorage.setItem('page-views', (views + 1).toString());

    if (views + 1 >= 2) {
      setTimeout(() => setShowPrompt(true), 1000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#7c3aed',
      color: '#ffffff',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(124, 58, 237, 0.3)',
      zIndex: 9999,
      maxWidth: '90%',
      width: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      animation: 'slideUp 0.4s ease-out'
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>
          📱 Install ChurchNavigator
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>
          Add to your home screen for quick access
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            backgroundColor: '#ffffff',
            color: '#7c3aed',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
            e.target.style.borderColor = 'rgba(255,255,255,0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = 'rgba(255,255,255,0.3)';
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;