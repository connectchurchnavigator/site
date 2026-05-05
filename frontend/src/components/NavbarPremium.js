import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Menu, X, LayoutDashboard, Settings, LogOut, Plus, Sparkles, Heart } from 'lucide-react';

export const NavbarPremium = ({ variant = 'dark', fixed = true }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitials = (user) => {
    if (!user) return 'U';
    if (user.first_name && user.last_name) return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    return user.email[0].toUpperCase();
  };

  const isLight = variant === 'light';
  const displayScrolled = scrolled || isLight;

  return (
    <nav className={`${fixed ? 'fixed top-0 left-0 right-0 z-[100]' : 'relative z-[100]'} transition-all duration-300 ${
      displayScrolled ? 'py-1.5 bg-white border-b border-slate-200' : 'py-3 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center">
          {/* Branded Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative transition-all group-hover:scale-105">
              <img 
                src="/logo.png" 
                alt="Church Navigator" 
                className={`h-10 md:h-12 w-auto transition-all ${
                  displayScrolled ? '' : 'brightness-0 invert'
                }`}
              />
              <div className="absolute inset-0 bg-brand/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </Link>

          {/* Ultra-Slim Nav Links - solid */}
          <div className="hidden md:flex items-center space-x-10">
            {['Home', 'Explore', 'About Us'].map((item) => (
              <Link 
                key={item}
                to={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '')}`}
                className={`text-[12px] font-bold tracking-[0.14em] uppercase transition-all hover:tracking-[0.18em] relative group ${
                  displayScrolled ? 'text-slate-900' : 'text-white'
                }`}
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-brand transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* Premium Actions - Light */}
          <div className="hidden md:flex items-center space-x-5">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate('/add-listing')}
                  className={`border rounded-xl px-5 h-10 text-xs font-bold transition-all hover:scale-105 hover:bg-brand hover:text-white ${
                    displayScrolled ? 'bg-brand/5 text-brand border-brand/20 shadow-sm' : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Listing
                </Button>

                <Link 
                  to="/dashboard/bookmarks"
                  className={`p-2 rounded-full transition-all hover:bg-slate-100/10 group flex items-center justify-center ${
                    displayScrolled ? 'text-brand' : 'text-white'
                  }`}
                  title="My Favorites"
                >
                  <Heart className={`h-5 w-5 transition-all group-hover:scale-110 ${displayScrolled ? 'fill-brand/10' : 'fill-white/10'}`} />
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none ring-1 ring-slate-200 rounded-full p-0.5 hover:ring-brand/50 transition-all">
                      <Avatar className="h-9 w-9 border-2 border-transparent">
                        <AvatarImage src={user?.display_picture} />
                        <AvatarFallback className="bg-brand text-white font-bold text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border-slate-100 rounded-2xl p-2 shadow-2xl text-slate-900 z-[110]">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="rounded-xl p-3 focus:bg-slate-50 text-sm">
                      <LayoutDashboard className="h-4 w-4 mr-2 text-brand" />
                      Dashboard
                    </DropdownMenuItem>
                    {user?.role === 'super_admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl p-3 focus:bg-slate-50 text-sm">
                        <Sparkles className="h-4 w-4 mr-2 text-brand" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/dashboard/account')} className="rounded-xl p-3 focus:bg-slate-50 text-sm">
                      <Settings className="h-4 w-4 mr-2 text-brand" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem onClick={logout} className="rounded-xl p-3 text-red-500 focus:bg-red-50 focus:text-red-600 text-sm">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth/login')}
                  className={`font-bold transition-all text-[12px] ${
                    displayScrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white hover:text-white/80'
                  }`}
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => {
                     if (isAuthenticated) {
                        navigate('/add-listing');
                     } else {
                        toast.info('Please sign in to add a listing');
                        navigate('/auth/login', { state: { from: { pathname: '/add-listing' } } });
                     }
                  }}
                  className="bg-brand hover:bg-brand-hover text-white rounded-xl px-6 h-10 text-[12px] font-bold shadow-xl shadow-brand/20 transition-all hover:translate-y-[-2px] border border-brand/10"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Listing
                </Button>

                <Link 
                  to="/dashboard/bookmarks"
                  className={`hidden sm:flex p-2 rounded-full transition-all hover:bg-slate-100/10 group items-center justify-center ${
                    displayScrolled ? 'text-brand' : 'text-white'
                  }`}
                  title="My Favorites"
                >
                  <Heart className={`h-5 w-5 transition-all group-hover:scale-110 ${displayScrolled ? 'fill-brand/10' : 'fill-white/10'}`} />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 transition-all hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel - Light */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[150] bg-white backdrop-blur-3xl animate-in fade-in zoom-in duration-300">
          <div className="flex justify-end p-8">
             <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 h-12 w-12 flex items-center justify-center rounded-full bg-slate-50"><X /></button>
          </div>
          <div className="px-10 py-10 space-y-10">
            {['Home', 'Explore', 'About Us'].map((item) => (
              <Link 
                key={item}
                to={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '')}`}
                className="block text-4xl font-serif font-bold text-slate-900 hover:text-brand transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="pt-10 border-t border-slate-100 space-y-6">
              <Button 
                onClick={() => { 
                   if (isAuthenticated) {
                      navigate('/add-listing');
                   } else {
                      toast.info('Please sign in to add a listing');
                      navigate('/auth/login', { state: { from: { pathname: '/add-listing' } } }); 
                   }
                   setMobileMenuOpen(false); 
                }}
                className="w-full bg-brand text-white rounded-2xl h-14 text-lg font-bold shadow-lg shadow-brand/20"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
