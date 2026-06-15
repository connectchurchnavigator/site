import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Globe, Clock, ChevronLeft, Instagram, Facebook } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [socialPosts, setSocialPosts] = useState({ instagram: [], facebook: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  useEffect(() => {
    if (church && (church.social_connections?.instagram?.connected || church.social_connections?.facebook?.connected)) {
      fetchSocialPosts();
    }
  }, [church]);

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

  const fetchSocialPosts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/social/posts/${slug}`);
      const posts = response.data.posts;
      setSocialPosts({
        instagram: posts.filter(p => p.platform === 'instagram').slice(0, 9),
        facebook: posts.filter(p => p.platform === 'facebook').slice(0, 6)
      });
    } catch (error) {
      console.error('Error fetching social posts:', error);
    }
  };

  const hasSocialContent = () => {
    return socialPosts.instagram.length > 0 || socialPosts.facebook.length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Church not found</h2>
          <Link to="/" className="text-blue-600 hover:underline">Return to home</Link>
        </div>
      </div>
    );
  }

  const mainImage = church.images && church.images.length > 0 ? church.images[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to search
          </Link>
        </div>
      </div>

      {mainImage && (
        <div className="w-full h-96 bg-gray-200">
          <img
            src={mainImage}
            alt={church.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{church.name}</h1>
                {church.denomination && (
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {church.denomination}
                  </span>
                )}
              </div>
              {church.verified && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Verified
                </span>
              )}
            </div>

            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('about')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'about'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  About
                </button>
                {hasSocialContent() && (
                  <button
                    onClick={() => setActiveTab('social')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'social'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Social Media
                  </button>
                )}
              </nav>
            </div>

            {activeTab === 'about' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  {church.description && (
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{church.description}</p>
                    </div>
                  )}

                  {church.service_times && (
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Times</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{church.service_times}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      {church.address && (
                        <div className="flex items-start">
                          <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                          <div className="text-gray-700">
                            <div>{church.address}</div>
                            {church.city && <div>{church.city}</div>}
                            {church.postcode && <div>{church.postcode}</div>}
                          </div>
                        </div>
                      )}

                      {church.phone && (
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          <a href={`tel:${church.phone}`} className="text-blue-600 hover:underline">
                            {church.phone}
                          </a>
                        </div>
                      )}

                      {church.email && (
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          <a href={`mailto:${church.email}`} className="text-blue-600 hover:underline break-all">
                            {church.email}
                          </a>
                        </div>
                      )}

                      {church.website && (
                        <div className="flex items-center">
                          <Globe className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                          <a
                            href={church.website.startsWith('http') ? church.website : `https://${church.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline break-all"
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

            {activeTab === 'social' && hasSocialContent() && (
              <div className="space-y-8">
                {socialPosts.instagram.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <Instagram className="w-6 h-6 text-pink-600 mr-2" />
                      <h2 className="text-2xl font-bold text-gray-900">Instagram</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {socialPosts.instagram.map((post) => (
                        <a
                          key={post.post_id}
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition"
                        >
                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt={post.caption || 'Instagram post'}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {socialPosts.facebook.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <Facebook className="w-6 h-6 text-blue-600 mr-2" />
                      <h2 className="text-2xl font-bold text-gray-900">Facebook</h2>
                    </div>
                    <div className="space-y-4">
                      {socialPosts.facebook.map((post) => (
                        <a
                          key={post.post_id}
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition"
                        >
                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt={post.caption || 'Facebook post'}
                              className="w-full h-64 object-cover"
                            />
                          )}
                          {post.caption && (
                            <div className="p-4">
                              <p className="text-gray-700 line-clamp-3">{post.caption}</p>
                              <p className="text-sm text-gray-500 mt-2">
                                {new Date(post.posted_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {!hasSocialContent() && (
                  <div className="text-center py-12 text-gray-500">
                    No recent posts
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchDetailPage;