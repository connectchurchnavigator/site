import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import HeroSection from '../components/homepage/HeroSection';
import StatsCounter from '../components/homepage/StatsCounter';
import ActivityFeed from '../components/homepage/ActivityFeed';
import FeaturedSection from '../components/homepage/FeaturedSection';
import EventsSection from '../components/homepage/EventsSection';
import ListingExplorer from '../components/homepage/ListingExplorer';
import HowItWorks from '../components/homepage/HowItWorks';
import PlannerCTA from '../components/homepage/PlannerCTA';
import Testimonials from '../components/homepage/Testimonials';
import LoadingSpinner from '../components/common/LoadingSpinner';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://api.churchnavigator.com';

const HomePage = () => {
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await axios.get(`${API_BASE}/homepage/mode`);
        setMode(response.data.mode);
      } catch (error) {
        console.error('Error fetching homepage mode:', error);
        setMode('curated');
      } finally {
        setLoading(false);
      }
    };
    fetchMode();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Helmet>
        <title>ChurchNavigator - Discover 29,000+ UK Churches, Events & Ministries</title>
        <meta name="description" content="Explore 29,000+ churches, pastors, events and ministries across the UK. Free church directory, event registration, ministry trip planner and more." />
        <meta property="og:title" content="ChurchNavigator - UK's Leading Church Directory" />
        <meta property="og:description" content="Discover churches, events, pastors and ministries across the UK. All in one place, free to explore." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://churchnavigator.com" />
      </Helmet>

      <div className="homepage">
        <HeroSection />
        <StatsCounter />
        {mode === 'live' ? (
          <ActivityFeed />
        ) : (
          <FeaturedSection />
        )}
        <EventsSection />
        <ListingExplorer />
        <HowItWorks />
        <PlannerCTA />
        <Testimonials />
      </div>
    </>
  );
};

export default HomePage;