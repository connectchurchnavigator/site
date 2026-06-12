import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import SpaceRentalBadge from '../components/SpaceRentalBadge';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const ChurchDetailPage = () => {
  const { id } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    preferred_dates: '',
    capacity_needed: ''
  });
  const [enquiryStatus, setEnquiryStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchChurch();
    const hash = window.location.hash.substring(1);
    if (hash === 'space-rental' || hash === 'space-needed') {
      setActiveTab('profile');
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [id]);

  const fetchChurch = async () => {
    try {
      const res = await fetch(`${API_URL}/api/churches/${id}`);
      const data = await res.json();
      setChurch(data);
    } catch (error) {
      console.error('Error fetching church:', error);
    }
    setLoading(false);
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setEnquiryStatus({ type: 'loading', message: 'Sending enquiry...' });
    
    try {
      const res = await fetch(`${API_URL}/api/spaces/enquire/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquiryData)
      });
      
      if (res.ok) {
        setEnquiryStatus({ type: 'success', message: 'Enquiry sent successfully! The church will contact you soon.' });
        setEnquiryData({ name: '', email: '', phone: '', message: '', preferred_dates: '', capacity_needed: '' });
        setTimeout(() => {
          setShowEnquiryModal(false);
          setEnquiryStatus({ type: '', message: '' });
        }, 3000);
      } else {
        setEnquiryStatus({ type: 'error', message: 'Failed to send enquiry. Please try again.' });
      }
    } catch (error) {
      setEnquiryStatus({ type: 'error', message: 'Network error. Please try again.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Church not found</h1>
          <Link to="/" className="text-emerald-600 hover:underline">Return to home</Link>
        </div>
      </div>
    );
  }

  const rental = church.space_rental || {};
  const needed = church.space_needed || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{church.name} - ChurchNavigator</title>
        <meta name="description" content={church.description || `Find service times, location and contact details for ${church.name}.`} />
      </Helmet>

      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start gap-4 mb-4">
            {church.logo && (
              <img src={church.logo} alt={church.name} className="w-20 h-20 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{church.name}</h1>
              {church.denomination && (
                <p className="text-gray-600 mb-2">{church.denomination}</p>
              )}
              <SpaceRentalBadge church={church} size="normal" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {rental.enabled && (
              <div id="space-rental" className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-emerald-600 text-white px-6 py-4">
                  <div className="flex items-center gap-2">
                    <i className="ti ti-building text-2xl"></i>
                    <h2 className="text-xl font-bold">Space Available for Hire</h2>
                  </div>
                </div>
                <div className="p-6">
                  {rental.space_name && (
                    <h3 className="text-2xl font-bold mb-2">{rental.space_name}</h3>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {rental.capacity && (
                      <div className="flex items-center gap-2">
                        <i className="ti ti-users text-emerald-600 text-xl"></i>
                        <div>
                          <p className="text-sm text-gray-600">Capacity</p>
                          <p className="font-semibold">{rental.capacity} people</p>
                        </div>
                      </div>
                    )}
                    {rental.price_per_hour && (
                      <div className="flex items-center gap-2">
                        <i className="ti ti-coin text-emerald-600 text-xl"></i>
                        <div>
                          <p className="text-sm text-gray-600">Price per hour</p>
                          <p className="font-semibold">£{rental.price_per_hour}</p>
                        </div>
                      </div>
                    )}
                    {rental.price_per_day && (
                      <div className="flex items-center gap-2">
                        <i className="ti ti-calendar text-emerald-600 text-xl"></i>
                        <div>
                          <p className="text-sm text-gray-600">Price per day</p>
                          <p className="font-semibold">£{rental.price_per_day}</p>
                        </div>
                      </div>
                    )}
                    {rental.minimum_hours && (
                      <div className="flex items-center gap-2">
                        <i className="ti ti-clock text-emerald-600 text-xl"></i>
                        <div>
                          <p className="text-sm text-gray-600">Minimum booking</p>
                          <p className="font-semibold">{rental.minimum_hours} hours</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {rental.available_days && rental.available_days.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Available days:</p>
                      <div className="flex flex-wrap gap-2">
                        {rental.available_days.map(day => (
                          <span key={day} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                            {day}
                          </span>
                        ))}
                      </div>
                      {rental.available_times && (
                        <p className="text-sm text-gray-600 mt-2">{rental.available_times}</p>
                      )}
                    </div>
                  )}

                  {rental.facilities_included && rental.facilities_included.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Facilities included:</p>
                      <div className="flex flex-wrap gap-2">
                        {rental.facilities_included.map(facility => (
                          <span key={facility} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rental.suitable_for && rental.suitable_for.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Suitable for:</p>
                      <div className="flex flex-wrap gap-2">
                        {rental.suitable_for.map(use => (
                          <span key={use} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {use}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rental.description && (
                    <div className="mb-6">
                      <p className="text-gray-700 whitespace-pre-line">{rental.description}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowEnquiryModal(true)}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    Enquire About This Space
                  </button>
                </div>
              </div>
            )}

            {needed.enabled && (
              <div id="space-needed" className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4">
                  <div className="flex items-center gap-2">
                    <i className="ti ti-search text-2xl"></i>
                    <h2 className="text-xl font-bold">Looking for a Space</h2>
                  </div>
                </div>
                <div className="p-6">
                  {needed.looking_for && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">Looking for:</p>
                      <p className="font-semibold capitalize">{needed.looking_for}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {needed.required_capacity && (
                      <div>
                        <p className="text-sm text-gray-600">Required capacity</p>
                        <p className="font-semibold">{needed.required_capacity} people</p>
                      </div>
                    )}
                    {needed.budget_per_hour && (
                      <div>
                        <p className="text-sm text-gray-600">Budget per hour</p>
                        <p className="font-semibold">£{needed.budget_per_hour}</p>
                      </div>
                    )}
                    {needed.budget_per_month && (
                      <div>
                        <p className="text-sm text-gray-600">Budget per month</p>
                        <p className="font-semibold">£{needed.budget_per_month}</p>
                      </div>
                    )}
                    {needed.needed_from && (
                      <div>
                        <p className="text-sm text-gray-600">Needed from</p>
                        <p className="font-semibold">{needed.needed_from}</p>
                      </div>
                    )}
                  </div>

                  {needed.preferred_days && needed.preferred_days.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Preferred days:</p>
                      <div className="flex flex-wrap gap-2">
                        {needed.preferred_days.map(day => (
                          <span key={day} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {needed.preferred_location && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Preferred location:</p>
                      <p className="text-gray-700">{needed.preferred_location}</p>
                    </div>
                  )}

                  {needed.description && (
                    <div className="mb-6">
                      <p className="text-gray-700 whitespace-pre-line">{needed.description}</p>
                    </div>
                  )}

                  {(needed.contact_email || church.email) && (
                    <a
                      href={`mailto:${needed.contact_email || church.email}`}
                      className="block w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
                    >
                      Can You Help? Get in Touch
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4">Contact Information</h3>
              {church.address && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Address</p>
                  <p className="text-gray-900">{church.address}</p>
                  <p className="text-gray-900">{church.city}, {church.postcode}</p>
                </div>
              )}
              {church.phone && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Phone</p>
                  <a href={`tel:${church.phone}`} className="text-emerald-600 hover:underline">{church.phone}</a>
                </div>
              )}
              {church.email && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Email</p>
                  <a href={`mailto:${church.email}`} className="text-emerald-600 hover:underline">{church.email}</a>
                </div>
              )}
              {church.website && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-1">Website</p>
                  <a href={church.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">{church.website}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEnquiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Enquire About Space</h3>
                <button onClick={() => setShowEnquiryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <i className="ti ti-x text-2xl"></i>
                </button>
              </div>
              
              {enquiryStatus.message && (
                <div className={`p-4 rounded-lg mb-4 ${
                  enquiryStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                  enquiryStatus.type === 'error' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {enquiryStatus.message}
                </div>
              )}

              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={enquiryData.name}
                    onChange={(e) => setEnquiryData({...enquiryData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={enquiryData.email}
                    onChange={(e) => setEnquiryData({...enquiryData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={enquiryData.phone}
                    onChange={(e) => setEnquiryData({...enquiryData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity Needed</label>
                  <input
                    type="number"
                    value={enquiryData.capacity_needed}
                    onChange={(e) => setEnquiryData({...enquiryData, capacity_needed: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Dates</label>
                  <input
                    type="text"
                    placeholder="e.g. Every Sunday, 15th March 2024"
                    value={enquiryData.preferred_dates}
                    onChange={(e) => setEnquiryData({...enquiryData, preferred_dates: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                  <textarea
                    required
                    rows={4}
                    value={enquiryData.message}
                    onChange={(e) => setEnquiryData({...enquiryData, message: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEnquiryModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enquiryStatus.type === 'loading'}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {enquiryStatus.type === 'loading' ? 'Sending...' : 'Send Enquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchDetailPage;