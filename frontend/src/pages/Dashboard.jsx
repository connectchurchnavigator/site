import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FiHome, FiSettings, FiUsers, FiCalendar, FiImage, FiGlobe } from 'react-icons/fi';
import DashboardHome from './dashboard/DashboardHome';
import ChurchSettings from './dashboard/ChurchSettings';
import TeamManagement from './dashboard/TeamManagement';
import EventManagement from './dashboard/EventManagement';
import GalleryManagement from './dashboard/GalleryManagement';
import WebsiteBuilder from './dashboard/WebsiteBuilder';

function Dashboard() {
  const location = useLocation();
  const [churchSlug] = useState('demo-church-1');
  const [isPro] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Overview' },
    { path: '/dashboard/settings', icon: FiSettings, label: 'Church Settings' },
    { path: '/dashboard/website', icon: FiGlobe, label: 'Website Builder' },
    { path: '/dashboard/team', icon: FiUsers, label: 'Team' },
    { path: '/dashboard/events', icon: FiCalendar, label: 'Events' },
    { path: '/dashboard/gallery', icon: FiImage, label: 'Gallery' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ width: '250px', background: '#1a202c', color: '#fff', padding: '20px' }}>
        <h2 style={{ marginBottom: '30px', fontSize: '1.5rem' }}>Dashboard</h2>
        <nav>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '15px',
                marginBottom: '5px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: location.pathname === item.path ? '#fff' : '#a0aec0',
                background: location.pathname === item.path ? '#9333ea' : 'transparent',
              }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/settings" element={<ChurchSettings />} />
          <Route path="/website" element={<WebsiteBuilder churchSlug={churchSlug} isPro={isPro} />} />
          <Route path="/team" element={<TeamManagement />} />
          <Route path="/events" element={<EventManagement />} />
          <Route path="/gallery" element={<GalleryManagement />} />
        </Routes>
      </div>
    </div>
  );
}

export default Dashboard;
