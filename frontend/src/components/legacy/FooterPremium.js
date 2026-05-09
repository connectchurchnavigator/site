import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Sparkles } from 'lucide-react';

export const FooterPremium = () => {
  return (
    <footer className="bg-white text-slate-900 pt-32 pb-16 overflow-hidden relative border-t border-slate-100">
      {/* Soft Light Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-20 mb-32">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-10">
            <Link to="/" className="flex items-center space-x-3 group w-fit">
              <img src="/logo.png" alt="Church Navigator" className="h-10 w-auto group-hover:scale-105 transition-transform" />
            </Link>
            <p className="text-slate-500 text-xl leading-relaxed max-w-md font-light">
              Redefining spiritual connection through <span className="text-brand font-medium">high-fidelity</span> verification and premium user experiences.
            </p>
            <div className="flex space-x-5">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-brand transition-all border border-slate-100 hover:border-brand/30 group">
                  <Icon className="h-4 w-4 text-slate-400 group-hover:text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-[10px] font-bold mb-10 text-slate-400 uppercase tracking-[0.3em] font-sans">Platform</h4>
            <ul className="space-y-6">
              {['Explore Hub', 'Featured Shepherds', 'Ministry Portal', 'Our Vision'].map((link) => (
                <li key={link}>
                  <Link to="#" className="text-slate-500 hover:text-brand transition-all flex items-center group text-sm font-medium">
                    <span className="w-0 group-hover:w-3 h-[1.5px] bg-brand mr-0 group-hover:mr-3 transition-all"></span>
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold mb-10 text-slate-400 uppercase tracking-[0.3em] font-sans">Direct</h4>
            <ul className="space-y-8">
              <li className="flex items-start space-x-4 text-slate-500 group cursor-default">
                <MapPin className="h-4 w-4 text-brand mt-1" />
                <span className="text-sm group-hover:text-slate-900 transition-colors font-medium">Banjara Hills, Road No. 1<br />Hyderabad, TG 500034</span>
              </li>
              <li className="flex items-center space-x-4 text-slate-500 group cursor-pointer">
                <Mail className="h-4 w-4 text-brand" />
                <span className="text-sm group-hover:text-slate-900 transition-colors font-medium">hello@churchnavigator.org</span>
              </li>
              <li className="flex items-center space-x-4 text-slate-500 group cursor-pointer">
                <Phone className="h-4 w-4 text-brand" />
                <span className="text-sm group-hover:text-slate-900 transition-colors font-medium">+91 9800 120 450</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-16 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             <span>© 2026 Church Navigator</span>
             <span className="h-1 w-1 bg-brand rounded-full"></span>
             <span className="flex items-center"><Sparkles className="h-3 w-3 mr-1 text-brand" /> Powered by Faith</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex space-x-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
            </div>
            <div className="flex flex-col items-center md:items-end text-[8px] text-slate-300 uppercase tracking-[0.15em] font-medium leading-loose">
              <a href="https://www.flaticon.com/free-icons/pastor" title="pastor icons" className="hover:text-brand transition-colors">Pastor icons created by Mayor Icons - Flaticon</a>
              <a href="https://www.flaticon.com/free-icons/chruch" title="chruch icons" className="hover:text-brand transition-colors">Chruch icons created by blinixsolutions - Flaticon</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
