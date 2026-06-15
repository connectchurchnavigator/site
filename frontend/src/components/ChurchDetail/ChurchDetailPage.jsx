import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SocialTab from './SocialTab';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasSocial, setHasSocial] = useState(false);

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/churches/${slug}`);
      setChurch(response.data);
      
      const socialResponse = await axios.get(`${API_BASE}/api/social/posts/${slug}`);
      setHasSocial(socialResponse.data.posts.length > 0);
    } catch (error) {
      console.error('Error fetching church:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Church Not Found</h1>
          <a href="/" className="text-blue-600 hover:underline">Return to homepage</a>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    { id: 'contact', label: 'Contact' },
  ];

  if (hasSocial) {
    tabs.push({ id: 'social', label: 'Social' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {church.image_url && (
            <img
              src={church.image_url}
              alt={church.name}
              className="w-full h-96 object-cover"
            />
          )}
          
          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{church.name}</h1>
            {church.denomination && (
              <p className="text-xl text-gray-600 mb-6">{church.denomination}</p>
            )}

            <div className="border-b border-gray-200 mb-6">
              <div className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {activeTab === 'overview' && (
                <div>
                  <p className="text-gray-700 text-lg mb-6">{church.description}</p>
                  {church.facilities && church.facilities.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-3">Facilities</h3>
                      <div className="flex flex-wrap gap-2">
                        {church.facilities.map((facility, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'services' && (
                <div>
                  {church.services && church.services.length > 0 ? (
                    <div className="space-y-4">
                      {church.services.map((service, idx) => (
                        <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <p className="text-gray-600">{service.time}</p>
                          {service.description && <p className="text-gray-700 mt-1">{service.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No service times available</p>
                  )}
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-4">
                  {church.address && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Address</h3>
                      <p className="text-gray-700">
                        {church.address.street}<br />
                        {church.address.city}, {church.address.postcode}
                      </p>
                    </div>
                  )}
                  {church.phone && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Phone</h3>
                      <a href={`tel:${church.phone}`} className="text-blue-600 hover:underline">
                        {church.phone}
                      </a>
                    </div>
                  )}
                  {church.email && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Email</h3>
                      <a href={`mailto:${church.email}`} className="text-blue-600 hover:underline">
                        {church.email}
                      </a>
                    </div>
                  )}
                  {church.website && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Website</h3>
                      <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {church.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'social' && hasSocial && (
                <SocialTab churchSlug={slug} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchDetailPage;