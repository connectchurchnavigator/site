import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('installPromptDismissed');
    const pageViews = parseInt(localStorage.getItem('pageViews') || '0', 10);
    
    localStorage.setItem('pageViews', (pageViews + 1).toString());

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (!isDismissed && pageViews >= 1) {
      if (isIOSDevice) {
        const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandalone) {
          setShowPrompt(true);
        }
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed && pageViews >= 1) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      return;
    }
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg shadow-2xl p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="pr-6">
        <h3 className="font-semibold text-lg mb-1">Install ChurchNavigator</h3>
        {isIOS ? (
          <p className="text-sm text-white/90 mb-3">
            Tap the share button <span className="inline-block mx-1">📤</span> and select "Add to Home Screen"
          </p>
        ) : (
          <>
            <p className="text-sm text-white/90 mb-3">
              Get quick access to churches near you with our app
            </p>
            <button
              onClick={handleInstall}
              className="bg-white text-purple-600 px-4 py-2 rounded-full font-medium text-sm hover:bg-purple-50 transition-colors"
            >
              Install Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;