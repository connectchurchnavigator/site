import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Discover',
      links: [
        { label: 'Browse Churches', path: '/churches' },
        { label: 'Find Events', path: '/events' },
        { label: 'Worship Leaders', path: '/worship-leaders' },
        { label: 'Media Teams', path: '/media-teams' }
      ]
    },
    {
      title: 'Tools',
      links: [
        { label: 'Service Planner', path: '/planner' },
        { label: 'AI Assistant', path: '/ai-tools' },
        { label: 'QR Check-In', path: '/check-in' },
        { label: 'Analytics', path: '/analytics' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', path: '/about' },
        { label: 'Pricing', path: '/pricing' },
        { label: 'Contact', path: '/contact' },
        { label: 'Careers', path: '/careers' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Terms of Service', path: '/terms' },
        { label: 'Cookie Policy', path: '/privacy#cookies' },
        { label: 'GDPR', path: '/privacy#gdpr' }
      ]
    }
  ];

  const socialLinks = [
    { icon: Facebook, href: 'https://facebook.com/churchnavigator', label: 'Facebook' },
    { icon: Twitter, href: 'https://twitter.com/churchnav', label: 'Twitter' },
    { icon: Instagram, href: 'https://instagram.com/churchnavigator', label: 'Instagram' },
    { icon: Youtube, href: 'https://youtube.com/@churchnavigator', label: 'YouTube' }
  ];

  return (
    <footer className="bg-gradient-to-br from-purple-900 to-purple-800 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <h2 className="text-2xl font-bold">ChurchNavigator</h2>
              <p className="text-purple-200 text-sm">UK's Leading Church Directory</p>
            </Link>
            <p className="text-purple-100 mb-4">
              Connecting communities with churches across the United Kingdom. Discover, engage, and grow in faith.
            </p>
            <div className="space-y-2 text-sm text-purple-200">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@churchnavigator.com" className="hover:text-white transition-colors">
                  hello@churchnavigator.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:+442012345678" className="hover:text-white transition-colors">
                  +44 20 1234 5678
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>London, United Kingdom</span>
              </div>
            </div>
          </div>

          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="font-semibold text-lg mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      to={link.path}
                      className="text-purple-200 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-purple-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-purple-800 hover:bg-purple-700 flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-purple-200">
                © {currentYear} ChurchNavigator Ltd. All rights reserved.
              </p>
              <p className="text-xs text-purple-300 mt-1">
                Registered in England & Wales • Company No. 12345678
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-purple-300">
              Built with ❤️ for the UK church community •{' '}
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              {' • '}
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              {' • '}
              <Link to="/sitemap.xml" className="hover:text-white transition-colors">Sitemap</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;