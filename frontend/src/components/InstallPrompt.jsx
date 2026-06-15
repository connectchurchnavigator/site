import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const installed = localStorage.getItem('pwa-installed');
    const views = parseInt(localStorage.getItem('pwa-page-views') || '0', 10);

    setPageViews(views + 1);
    localStorage.setItem('pwa-page-views', String(views + 1));

    if (dismissed || installed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (views >= 1) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  useEffect(() => {
    if (deferredPrompt && pageViews >= 2) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, [pageViews, deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-2xl p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl">
            ⛪
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Install ChurchNavigator</h3>
            <p className="text-sm text-purple-100 mb-3">
              Get quick access from your home screen - works offline!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-purple-50 transition-colors"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white hover:bg-white/10 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;