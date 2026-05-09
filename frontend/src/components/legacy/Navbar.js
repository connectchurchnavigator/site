import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Menu, X, User, LayoutDashboard, BookMarked, Settings, LogOut, Plus } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (user) => {
    if (!user) return 'U';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" data-testid="nav-logo">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">CN</span>
            </div>
            <span className="font-bold text-xl hidden sm:block">Church Navigator</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-slate-600 hover:text-brand transition-colors"
              data-testid="nav-home"
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="text-slate-600 hover:text-brand transition-colors"
              data-testid="nav-about"
            >
              About Us
            </Link>
            <Link 
              to="/explore" 
              className="text-slate-600 hover:text-brand transition-colors"
              data-testid="nav-explore"
            >
              Explore
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => navigate('/add-listing')}
                  className="bg-brand hover:bg-brand-hover text-white rounded-full"
                  data-testid="nav-add-listing-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Listing
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus:outline-none" data-testid="nav-user-menu">
                      <Avatar className="h-10 w-10 border-2 border-brand/20 hover:border-brand transition-colors">
                        <AvatarImage src={user?.display_picture} />
                        <AvatarFallback className="bg-brand text-white">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium">{user?.first_name || user?.email}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} data-testid="nav-dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    {user?.role === 'super_admin' && (
                      <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="nav-admin">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/dashboard/bookmarks')} data-testid="nav-bookmarks">
                      <BookMarked className="h-4 w-4 mr-2" />
                      Bookmarks
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/account')} data-testid="nav-account">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-brand" data-testid="nav-logout">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth/login')}
                  data-testid="nav-signin-btn"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth/register')}
                  className="bg-brand hover:bg-brand-hover text-white rounded-full"
                  data-testid="nav-register-btn"
                >
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="nav-mobile-menu-btn"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white" data-testid="nav-mobile-menu">
          <div className="px-4 py-4 space-y-3">
            <Link 
              to="/" 
              className="block py-2 text-slate-600 hover:text-brand"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className="block py-2 text-slate-600 hover:text-brand"
              onClick={() => setMobileMenuOpen(false)}
            >
              About Us
            </Link>
            <Link 
              to="/explore" 
              className="block py-2 text-slate-600 hover:text-brand"
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore
            </Link>
            
            {isAuthenticated ? (
              <>
                <Button
                  onClick={() => {
                    navigate('/add-listing');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-brand hover:bg-brand-hover text-white rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Listing
                </Button>
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-slate-600 hover:text-brand"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      navigate('/dashboard/bookmarks');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-slate-600 hover:text-brand"
                  >
                    Bookmarks
                  </button>
                  <button
                    onClick={() => {
                      navigate('/dashboard/account');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-slate-600 hover:text-brand"
                  >
                    Account Details
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-brand"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/auth/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    navigate('/auth/register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-brand hover:bg-brand-hover text-white rounded-full"
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};