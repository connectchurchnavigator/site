import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export const Footer = () => {
  const navigate = useNavigate();
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="pt-20 pb-10 bg-slate-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={scrollToTop}>
          <img src="/logo-white.png" alt="Church Navigator" className="h-14 w-auto transition-all group-hover:scale-105" />
        </div>

        <div className="flex items-center gap-10 text-white/50 text-xs font-medium uppercase tracking-[0.1em]">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
          <Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
        </div>

        <Button 
          variant="ghost" 
          className="rounded-full bg-white text-slate-900 hover:bg-slate-100 px-10 h-14 font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
          onClick={() => navigate('/add-listing')}
        >
          Add Listing
        </Button>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-[11px] font-medium tracking-[0.15em] uppercase text-center md:text-left">
            © 2026 Church Navigator. Professional Spiritual Directory Network.
          </p>
          <div className="flex flex-col items-center md:items-end gap-1">
            <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest transition-colors group-hover:text-brand">
              Email ID: <a href="mailto:hello@churchnavigator.com" className="ml-1">hello@churchnavigator.com</a>
            </span>
            <div className="flex flex-col items-center md:items-end text-[9px] text-white/20 mt-1 uppercase tracking-wider">
              <a href="https://www.flaticon.com/free-icons/pastor" title="pastor icons" className="hover:text-white transition-colors">Pastor icons created by Mayor Icons - Flaticon</a>
              <a href="https://www.flaticon.com/free-icons/chruch" title="chruch icons" className="hover:text-white transition-colors">Chruch icons created by blinixsolutions - Flaticon</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};