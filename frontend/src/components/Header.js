import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
              <i className="ti ti-building-church text-white text-2xl"></i>
            </div>
            <span className="text-xl font-bold text-gray-900">ChurchNavigator</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              Home
            </Link>
            <Link to="/spaces" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              Find a Space
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              Contact
            </Link>
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            <i className={`ti ${mobileMenuOpen ? 'ti-x' : 'ti-menu-2'} text-2xl`}></i>
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200">
            <Link to="/" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/spaces" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Find a Space
            </Link>
            <Link to="/about" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
              About
            </Link>
            <Link to="/contact" className="block py-2 text-gray-700 hover:text-emerald-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
              Contact
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;