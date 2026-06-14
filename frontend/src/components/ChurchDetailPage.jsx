import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { MapPinIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import SmallGroupsSection from './SmallGroupsSection';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';
const IMAGE_CDN = 'https://ik.imagekit.io/cuizrvzly/church_navigator';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${slug}`);
      setChurch(response.data);
      setLoading(false);
    } catch (err) {
      setError('Church not found');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Church Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-violet-600 hover:text-violet-700">Return to Home</Link>
        </div>
      </div>
    );
  }

  const churchImageUrl = church.image_url || `${IMAGE_CDN}/default-church.jpg`;
  const fullAddress = `${church.address}, ${church.city}, ${church.postcode}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Church",
    "name": church.name,
    "description": church.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": church.address,
      "addressLocality": church.city,
      "postalCode": church.postcode,
      "addressCountry": "GB"
    },
    "telephone": church.phone,
    "email": church.email,
    "url": church.website,
    "image": churchImageUrl
  };

  const tabs = [
    { id: 'about', label: 'About', icon: null },
    { id: 'small-groups', label: 'Small Groups', icon: UserGroupIcon }
  ];

  return (
    <>
      <Helmet>
        <title>{church.name} - ChurchNavigator</title>
        <meta name="description" content={church.description || `Find service times, contact details, and more for ${church.name} in ${church.city}.`} />
        <meta property="og:title" content={`${church.name} - ChurchNavigator`} />
        <meta property="og:description" content={church.description || `Church in ${church.city}`} />
        <meta property="og:image" content={churchImageUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="relative h-64 md:h-96 bg-gradient-to-r from-violet-600 to-purple-600">
          <img
            src={churchImageUrl}
            alt={church.name}
            className="w-full h-full object-cover opacity-40"
            onError={(e) => { e.target.src = `${IMAGE_CDN}/default-church.jpg`; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{church.name}</h1>
              <div className="flex items-center text-white/90">
                <MapPinIcon className="h-5 w-5 mr-2" />
                <span>{church.city}, {church.postcode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-violet-600 text-violet-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      {Icon && <Icon className="h-5 w-5 mr-2" />}
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'about' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About {church.name}</h2>
                    <p className="text-gray-700 mb-6 whitespace-pre-line">{church.description}</p>
                    
                    {church.denomination && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Denomination</h3>
                        <p className="text-gray-700">{church.denomination}</p>
                      </div>
                    )}
                    
                    {church.service_times && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Times</h3>
                        <div className="flex items-start">
                          <ClockIcon className="h-5 w-5 text-violet-600 mr-2 mt-0.5" />
                          <p className="text-gray-700 whitespace-pre-line">{church.service_times}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                      <div className="space-y-3">
                        {church.address && (
                          <div className="flex items-start">
                            <MapPinIcon className="h-5 w-5 text-violet-600 mr-3 mt-0.5 flex-shrink-0" />
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 hover:text-violet-600"
                            >
                              {fullAddress}
                            </a>
                          </div>
                        )}
                        
                        {church.phone && (
                          <div className="flex items-center">
                            <PhoneIcon className="h-5 w-5 text-violet-600 mr-3 flex-shrink-0" />
                            <a href={`tel:${church.phone}`} className="text-gray-700 hover:text-violet-600">
                              {church.phone}
                            </a>
                          </div>
                        )}
                        
                        {church.email && (
                          <div className="flex items-center">
                            <EnvelopeIcon className="h-5 w-5 text-violet-600 mr-3 flex-shrink-0" />
                            <a href={`mailto:${church.email}`} className="text-gray-700 hover:text-violet-600">
                              {church.email}
                            </a>
                          </div>
                        )}
                        
                        {church.website && (
                          <div className="flex items-center">
                            <GlobeAltIcon className="h-5 w-5 text-violet-600 mr-3 flex-shrink-0" />
                            <a
                              href={church.website.startsWith('http') ? church.website : `https://${church.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 hover:text-violet-600"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'small-groups' && (
                <SmallGroupsSection churchSlug={slug} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChurchDetailPage;