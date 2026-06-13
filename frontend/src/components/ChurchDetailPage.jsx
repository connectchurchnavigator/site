import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SmallGroupsTab from './SmallGroupsTab';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchChurchDetails();
  }, [slug]);

  const fetchChurchDetails = async () => {
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
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div></div>;
  }

  if (!church) {
    return <div className="text-center py-20 text-gray-600">Church not found</div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'small-groups', label: 'Small Groups' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{church.name}</h1>
          <p className="text-lg text-violet-100">{church.address}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Church</h2>
                  <p className="text-gray-700 leading-relaxed">{church.description || 'No description available.'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {church.website && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Website</h3>
                      <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                        {church.website}
                      </a>
                    </div>
                  )}
                  {church.phone && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                      <p className="text-gray-700">{church.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'small-groups' && <SmallGroupsTab churchSlug={slug} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchDetailPage;
