import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Globe, Clock, Users, Calendar } from 'lucide-react';
import VisitInvitationModal from './VisitInvitationModal';

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const fetchChurch = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/churches/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setChurch(data);
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
    return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!church) {
    return <div className="container mx-auto px-4 py-16 text-center"><h2 className="text-2xl font-bold text-gray-900">Church not found</h2></div>;
  }

  const imageUrl = church.image_url || 'https://ik.imagekit.io/cuizrvzly/church_navigator/default-church.jpg';
  const isOpenToVisits = church.visit_preferences?.open_to_visits;

  return (
    <>
      <Helmet>
        <title>{church.name} | ChurchNavigator</title>
        <meta name="description" content={church.description || `Find service times, contact details and more for ${church.name} in ${church.city}.`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="relative h-96 bg-gradient-to-r from-blue-900 to-indigo-800">
          <img src={imageUrl} alt={church.name} className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="container mx-auto">
              <div className="flex items-center gap-3 mb-2">
                {church.verified && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    ✓ Verified
                  </span>
                )}
                {isOpenToVisits && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                    🟢 Open to Visits
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{church.name}</h1>
              <p className="text-xl text-gray-200">{church.denomination}</p>
              <div className="flex items-center text-gray-300 mt-2">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{church.city}, {church.postcode}</span>
              </div>
              {isOpenToVisits && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Invite to Visit My Church
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {church.description && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-700 leading-relaxed">{church.description}</p>
                </div>
              )}

              {isOpenToVisits && church.visit_preferences?.welcome_message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Welcome to Visiting Ministers</h3>
                  <p className="text-gray-700">{church.visit_preferences.welcome_message}</p>
                  {church.visit_preferences.preferred_days?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preferred Days:</p>
                      <div className="flex flex-wrap gap-2">
                        {church.visit_preferences.preferred_days.map(day => (
                          <span key={day} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">{day}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {church.visit_preferences.preferred_times?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preferred Times:</p>
                      <div className="flex flex-wrap gap-2">
                        {church.visit_preferences.preferred_times.map(time => (
                          <span key={time} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">{time}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-4">Minimum notice: {church.visit_preferences.min_notice_weeks} weeks</p>
                </div>
              )}

              {church.service_times && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <Clock className="h-6 w-6 mr-2 text-blue-600" />
                    Service Times
                  </h2>
                  <p className="text-gray-700 whitespace-pre-line">{church.service_times}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-4">
                  {church.address && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Address</p>
                        <p className="text-sm text-gray-600">{church.address}</p>
                        <p className="text-sm text-gray-600">{church.city}, {church.postcode}</p>
                      </div>
                    </div>
                  )}
                  {church.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Phone</p>
                        <a href={`tel:${church.phone}`} className="text-sm text-blue-600 hover:underline">{church.phone}</a>
                      </div>
                    </div>
                  )}
                  {church.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Email</p>
                        <a href={`mailto:${church.email}`} className="text-sm text-blue-600 hover:underline break-all">{church.email}</a>
                      </div>
                    </div>
                  )}
                  {church.website && (
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Website</p>
                        <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{church.website}</a>
                      </div>
                    </div>
                  )}
                  {church.pastor_name && (
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Pastor</p>
                        <p className="text-sm text-gray-600">{church.pastor_name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <VisitInvitationModal
          targetType="church"
          targetSlug={church.slug}
          targetName={church.name}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
};

export default ChurchDetailPage;