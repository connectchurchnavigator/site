import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { MapPin, Phone, Mail, Globe, Clock, Share2, Instagram } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [socialPosts, setSocialPosts] = useState({ instagram: [], facebook: [] });

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/churches/${slug}`);
        setChurch(response.data);
        
        const hasSocial = response.data.social_connections?.instagram?.connected || 
                         response.data.social_connections?.facebook?.connected;
        
        if (hasSocial) {
          const socialResponse = await axios.get(`${API_URL}/api/social/posts/${slug}`);
          setSocialPosts(socialResponse.data);
        }
      } catch (error) {
        console.error('Error fetching church:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChurch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Church not found</div>
      </div>
    );
  }

  const hasInstagram = church.social_connections?.instagram?.connected && socialPosts.instagram.length > 0;
  const hasFacebook = church.social_connections?.facebook?.connected && socialPosts.facebook.length > 0;
  const hasSocial = hasInstagram || hasFacebook;

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Service Times' },
  ];
  
  if (hasSocial) {
    tabs.push({ id: 'social', label: 'Social' });
  }

  return (
    <>
      <Helmet>
        <title>{church.name} - Church Navigator</title>
        <meta name="description" content={church.description || `Find service times and information for ${church.name} in ${church.city}`} />
        <meta property="og:title" content={`${church.name} - Church Navigator`} />
        <meta property="og:description" content={church.description || `Find service times and information for ${church.name}`} />
        {church.image_url && <meta property="og:image" content={church.image_url} />}
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {church.image_url && (
          <div className="w-full h-64 md:h-96 bg-gray-200">
            <img src={church.image_url} alt={church.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 -mt-16 relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{church.name}</h1>
                {church.denomination && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {church.denomination}
                  </span>
                )}
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="border-b border-gray-200 mb-6">
              <div className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-4 px-1 border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'about' && (
              <div className="space-y-6">
                {church.description && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">About</h2>
                    <p className="text-gray-700 leading-relaxed">{church.description}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {church.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Address</div>
                        <div className="text-gray-600">
                          {church.address}<br />
                          {church.city} {church.postcode}
                        </div>
                      </div>
                    </div>
                  )}

                  {church.phone && (
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Phone</div>
                        <a href={`tel:${church.phone}`} className="text-blue-600 hover:underline">
                          {church.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {church.email && (
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Email</div>
                        <a href={`mailto:${church.email}`} className="text-blue-600 hover:underline">
                          {church.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {church.website && (
                    <div className="flex items-start space-x-3">
                      <Globe className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Website</div>
                        <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Visit Website
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Service Times</h2>
                {church.service_times && church.service_times.length > 0 ? (
                  <div className="space-y-2">
                    {church.service_times.map((time, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">{time}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Service times not available</p>
                )}
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-8">
                {hasInstagram && (
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <Instagram className="w-6 h-6 text-pink-600" />
                      <h2 className="text-xl font-semibold">Instagram</h2>
                      {church.social_connections.instagram.username && (
                        <a
                          href={`https://instagram.com/${church.social_connections.instagram.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          @{church.social_connections.instagram.username}
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {socialPosts.instagram.map((post) => (
                        <a
                          key={post.post_id}
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square bg-gray-200 rounded-lg overflow-hidden hover:opacity-90 transition"
                        >
                          <img src={post.image_url} alt={post.caption || 'Instagram post'} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {hasFacebook && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Facebook</h2>
                    <div className="space-y-4">
                      {socialPosts.facebook.map((post) => (
                        <a
                          key={post.post_id}
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                        >
                          {post.image_url && (
                            <img src={post.image_url} alt="Facebook post" className="w-full h-48 object-cover rounded-lg mb-3" />
                          )}
                          {post.message && (
                            <p className="text-gray-700 line-clamp-3">{post.message}</p>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(post.posted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!hasInstagram && !hasFacebook && (
                  <p className="text-gray-600 text-center py-8">No recent posts</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChurchDetailPage;