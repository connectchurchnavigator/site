import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

export default function ChurchVisit() {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadChurch();
  }, [slug]);

  const loadChurch = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/churches/slug/${slug}`);
      setChurch(data);
    } catch (error) {
      console.error('Failed to load church:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Please provide your name and phone number');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/visitors/checkin`, {
        church_id: church._id,
        name,
        phone,
        email,
        whatsapp_opt_in: whatsappOptIn,
        source: 'web_visit'
      });
      setSubmitted(true);
    } catch (error) {
      alert('Failed to check in: ' + error.message);
    }
    setLoading(false);
  };

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to {church.name}!</h2>
          <p className="text-gray-600 mb-4">We're so glad you're here.</p>
          {whatsappOptIn && (
            <p className="text-sm text-green-600 mb-4">Check your WhatsApp for a welcome message!</p>
          )}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Service Time:</strong> {church.service_times?.[0]?.time || 'Contact church for details'}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Address:</strong> {church.address}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {church.logo_url && (
          <div className="bg-blue-600 p-6 text-center">
            <img src={church.logo_url} alt={church.name} className="h-20 mx-auto" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{church.name}</h1>
          <p className="text-gray-600 mb-6">We're excited to meet you!</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+44 7700 900000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="whatsapp-opt-in"
                  checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-1 w-5 h-5 text-blue-600"
                />
                <label htmlFor="whatsapp-opt-in" className="text-sm text-gray-700">
                  Send me WhatsApp updates from this church (service reminders, events, daily devotionals)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking In...' : 'Check In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
