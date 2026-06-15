import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Phone, Globe, Mail, Facebook, Instagram, Clock, Users, Calendar, Heart, Share2, ChevronRight } from 'lucide-react';
import SmallGroupsSection from './SmallGroupsSection';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';
const CDN_URL = 'https://ik.imagekit.io/cuizrvzly/church_navigator';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchChurchDetails();
  }, [slug]);

  const fetchChurchDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${slug}`);
      setChurch(response.data);
      document.title = `${response.data.name} - ChurchNavigator`;
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Church not found');
      setLoading(false);
    }
  };

  const getImageUrl = (filename) => {
    if (!filename) return `${CDN_URL}/default-church.jpg`;
    if (filename.startsWith('http')) return filename;
    return `${CDN_URL}/${filename}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-bold text-gray-900 mb-2">Church Not Found</h2><p className="text-gray-600 mb-4">{error}</p><button onClick={() => navigate('/')} className="text-purple-600 hover:text-purple-700">← Back to Home</button></div></div>;
  if (!church) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'small-groups', label: 'Small Groups', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-96 bg-gradient-to-r from-purple-600 to-indigo-600">
        <img src={getImageUrl(church.image)} alt={church.name} className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{church.name}</h1>
            <div className="flex items-center text-white/90 gap-2">
              <MapPin className="w-5 h-5" />
              <span>{church.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-700 leading-relaxed">{church.description}</p>
                </div>
                {church.denomination && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Denomination</h3>
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{church.denomination}</span>
                  </div>
                )}
                {church.service_times && church.service_times.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Times</h3>
                    <div className="space-y-2">
                      {church.service_times.map((time, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-5 h-5 text-purple-600" />
                          <span>{time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'small-groups' && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Small Groups</h2>
                <SmallGroupsSection churchSlug={slug} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              {church.phone && (
                <a href={`tel:${church.phone}`} className="flex items-center gap-3 text-gray-700 hover:text-purple-600 transition-colors">
                  <Phone className="w-5 h-5" />
                  <span>{church.phone}</span>
                </a>
              )}
              {church.email && (
                <a href={`mailto:${church.email}`} className="flex items-center gap-3 text-gray-700 hover:text-purple-600 transition-colors">
                  <Mail className="w-5 h-5" />
                  <span>{church.email}</span>
                </a>
              )}
              {church.website && (
                <a href={church.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-purple-600 transition-colors">
                  <Globe className="w-5 h-5" />
                  <span>Visit Website</span>
                </a>
              )}
            </div>

            {(church.facebook || church.instagram) && (
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
                {church.facebook && (
                  <a href={church.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-purple-600 transition-colors">
                    <Facebook className="w-5 h-5" />
                    <span>Facebook</span>
                  </a>
                )}
                {church.instagram && (
                  <a href={church.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-purple-600 transition-colors">
                    <Instagram className="w-5 h-5" />
                    <span>Instagram</span>
                  </a>
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