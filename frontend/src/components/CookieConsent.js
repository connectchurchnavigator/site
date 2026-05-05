import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Cookie, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Delay appearance slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice) => {
    localStorage.setItem('cookie-consent', choice);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[9999]"
        >
          <Card className="p-6 bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
            {/* Subtle Gradient Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="flex items-start gap-4 mb-4 relative z-10">
              <div className="p-3 bg-brand/10 rounded-2xl text-brand">
                <Cookie className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Cookie Policy</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We use cookies to enhance your experience, analyze site traffic, and serve targeted advertisements. By clicking "Accept All", you consent to our use of cookies.
                </p>
              </div>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <Button 
                onClick={() => handleConsent('all')}
                className="flex-1 bg-brand hover:bg-brand/90 text-white font-semibold py-6"
              >
                Accept All
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleConsent('essential')}
                className="flex-1 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-6"
              >
                Decline All
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <button className="text-xs text-slate-400 hover:text-brand transition-colors underline underline-offset-4">
                View Privacy Policy
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
