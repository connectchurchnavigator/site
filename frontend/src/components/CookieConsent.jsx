import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPrefs = JSON.parse(consent);
      setPreferences(savedPrefs);
      loadScripts(savedPrefs);
    }
  }, []);

  const loadScripts = (prefs) => {
    if (prefs.analytics) {
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    }
  };

  const saveConsent = (prefs) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs));
    localStorage.setItem('cookie_consent_date', new Date().toISOString());
    setPreferences(prefs);
    loadScripts(prefs);
    setShowBanner(false);
    setShowCustomize(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true
    });
  };

  const handleNecessaryOnly = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900 to-purple-700 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-8 h-8 text-purple-200 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-1">🍪 We Value Your Privacy</h3>
                <p className="text-sm text-purple-100">
                  ChurchNavigator uses cookies to enhance your experience, analyse site usage, and improve our services. 
                  Essential cookies are required for the site to function. You can customise your preferences or accept all cookies.
                  {' '}
                  <Link to="/privacy" className="underline hover:text-white font-medium">
                    Read our Privacy Policy
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-800 hover:bg-purple-600 rounded-lg transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                Customize
              </button>
              <button
                onClick={handleNecessaryOnly}
                className="px-4 py-2 bg-purple-800 hover:bg-purple-600 rounded-lg transition-colors text-sm font-medium"
              >
                Necessary Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-6 py-2 bg-white text-purple-900 hover:bg-purple-50 rounded-lg transition-colors text-sm font-semibold shadow-lg"
              >
                Accept All
              </button>
            </div>
          </div>

          {showCustomize && (
            <div className="mt-6 pt-6 border-t border-purple-600">
              <h4 className="font-semibold mb-4 text-lg">Cookie Preferences</h4>
              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 bg-purple-800/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Essential Cookies</span>
                      <span className="text-xs bg-purple-600 px-2 py-1 rounded">Required</span>
                    </div>
                    <p className="text-sm text-purple-100">
                      Necessary for the website to function. Used for login, security, and core features. Cannot be disabled.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="mt-1 w-5 h-5"
                  />
                </div>

                <div className="flex items-start justify-between p-4 bg-purple-800/50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium block mb-1">Analytics Cookies</span>
                    <p className="text-sm text-purple-100">
                      Help us understand how visitors use the site. Used to improve our services and user experience. All data is anonymised.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                </div>

                <div className="flex items-start justify-between p-4 bg-purple-800/50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium block mb-1">Marketing Cookies</span>
                    <p className="text-sm text-purple-100">
                      Used to show relevant content and advertisements. Help us reach people interested in church resources.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveCustom}
                  className="px-6 py-2 bg-white text-purple-900 hover:bg-purple-50 rounded-lg transition-colors font-semibold"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="px-6 py-2 bg-purple-800 hover:bg-purple-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CookieConsent;