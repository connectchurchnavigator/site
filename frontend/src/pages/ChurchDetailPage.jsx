import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Globe, Mail, Clock, Users, Calendar, Briefcase, Video } from 'lucide-react';
import EventsTab from '../components/EventsTab';
import SmallGroupsTab from '../components/SmallGroupsTab';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${slug}`);
      setChurch(response.data);
    } catch (error) {
      console.error('Error fetching church:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Church Not Found</h1>
          <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">Return to Home</Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: church.name,
    description: church.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: church.address,
      addressLocality: church.city,
      postalCode: church.postcode,
      addressCountry: 'GB'
    },
    telephone: church.phone,
    url: church.website,
    email: church.email
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: null },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'small-groups', label: 'Small Groups', icon: Users },
    { id: 'worship', label: 'Worship Team', icon: Briefcase },
    { id: 'media', label: 'Media Team', icon: Video }
  ];

  return (
    <>
      <Helmet>
        <title>{church.name} - ChurchNavigator</title>
        <meta name="description" content={church.description || `Find service times, contact info, and events for ${church.name} in ${church.city}`} />
        <meta property="og:title" content={`${church.name} - ChurchNavigator`} />
        <meta property="og:description" content={church.description || `Find service times, contact info, and events for ${church.name}`} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={`https://churchnavigator.com/churches/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {church.image_url && (
              <div className="mb-6">
                <img src={church.image_url} alt={church.name} className="w-full h-64 object-cover rounded-lg shadow-lg" />
              </div>
            )}
            <h1 className="text-4xl font-bold mb-4">{church.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-purple-100">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                <span>{church.city}, {church.postcode}</span>
              </div>
              {church.denomination && (
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  <span>{church.denomination}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-purple-600 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {church.description && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                      <p className="text-gray-700 leading-relaxed">{church.description}</p>
                    </div>
                  )}

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Times</h2>
                    {church.service_times && church.service_times.length > 0 ? (
                      <div className="space-y-3">
                        {church.service_times.map((service, idx) => (
                          <div key={idx} className="flex items-start bg-purple-50 p-4 rounded-lg">
                            <Clock className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900">{service.day}</p>
                              <p className="text-gray-700">{service.time}</p>
                              {service.description && <p className="text-sm text-gray-600 mt-1">{service.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No service times listed</p>
                    )}
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700">
                        <MapPin className="w-5 h-5 text-purple-600 mr-3" />
                        <span>{church.address}, {church.city}, {church.postcode}</span>
                      </div>
                      {church.phone && (
                        <div className="flex items-center text-gray-700">
                          <Phone className="w-5 h-5 text-purple-600 mr-3" />
                          <a href={`tel:${church.phone}`} className="hover:text-purple-600">{church.phone}</a>
                        </div>
                      )}
                      {church.email && (
                        <div className="flex items-center text-gray-700">
                          <Mail className="w-5 h-5 text-purple-600 mr-3" />
                          <a href={`mailto:${church.email}`} className="hover:text-purple-600">{church.email}</a>
                        </div>
                      )}
                      {church.website && (
                        <div className="flex items-center text-gray-700">
                          <Globe className="w-5 h-5 text-purple-600 mr-3" />
                          <a href={church.website} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">{church.website}</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'events' && <EventsTab churchSlug={slug} />}
              {activeTab === 'small-groups' && <SmallGroupsTab churchSlug={slug} />}
              {activeTab === 'worship' && (
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Worship team listings coming soon</p>
                </div>
              )}
              {activeTab === 'media' && (
                <div className="text-center py-12 text-gray-500">
                  <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Media team listings coming soon</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChurchDetailPage;
