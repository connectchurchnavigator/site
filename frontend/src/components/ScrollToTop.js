import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate progress percentage
      const progress = height > 0 ? (scrollY / height) * 100 : 0;
      setScrollProgress(progress);
      
      // Show button after 400px scroll
      setShowScrollTop(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showScrollTop) return null;

  return (
    <button 
      onClick={scrollToTop}
      className="fixed bottom-10 right-10 z-[120] w-14 h-14 flex items-center justify-center group pointer-events-auto"
      aria-label="Scroll to top"
    >
      <svg className="absolute w-full h-full transform -rotate-90 pointer-events-none">
        <circle 
          cx="28" 
          cy="28" 
          r="26" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          fill="transparent" 
          className="text-slate-200/50" 
        />
        <circle 
          cx="28" 
          cy="28" 
          r="26" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          fill="transparent" 
          strokeDasharray={163.36} 
          strokeDashoffset={163.36 - (163.36 * scrollProgress) / 100} 
          className="text-brand transition-all duration-150 ease-out" 
          strokeLinecap="round"
        />
      </svg>
      <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
        <ArrowUp className="h-5 w-5" />
      </div>
    </button>
  );
};

export default ScrollToTop;
