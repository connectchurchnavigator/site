import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];
const DENOMINATIONS = ['Any', 'Anglican', 'Baptist', 'Catholic', 'Methodist', 'Pentecostal', 'Presbyterian', 'Other'];

const VisitPreferencesSettings = ({ listingType, listingSlug }) => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState({
    open_to_visits: false,
    preferred_days: [],
    preferred_times: [],
    denomination_preference: 'Any',
    min_notice_weeks: 2,
    max_visits_per_month: 2,
    welcome_message: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const endpoint = listingType === 'church' ? 'churches' : 'pastors';
        const response = await fetch(`${process.env.REACT_APP_API_URL}/${endpoint}/${listingSlug}`);
        if (response.ok) {
          const data = await response.json();
          if (data.visit_preferences) {
            setPreferences(data.visit_preferences);
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, [listingType, listingSlug]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = await currentUser.getIdToken();
      const endpoint = listingType === 'church' ? 'churches' : 'pastors';
      const response = await fetch(`${process.env.REACT_APP_API_URL}/${endpoint}/${listingSlug}/visit-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setMessage('Visit preferences saved successfully!');
      } else {
        setMessage('Failed to save preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    setPreferences(prev => ({
      ...prev,
      preferred_days: prev.preferred_days.includes(day)
        ? prev.preferred_days.filter(d => d !== day)
        : [...prev.preferred_days, day]
    }));
  };

  const toggleTime = (time) => {
    setPreferences(prev => ({
      ...prev,
      preferred_times: prev.preferred_times.includes(time)
        ? prev.preferred_times.filter(t => t !== time)
        : [...prev.preferred_times, time]
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Visit Preferences</h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Open to Receiving Visit Requests</h3>
            <p className="text-sm text-gray-600">Allow other churches and ministers to invite you for visits</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.open_to_visits}
              onChange={(e) => setPreferences({ ...preferences, open_to_visits: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {preferences.open_to_visits && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      preferences.preferred_days.includes(day)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Best Times</label>
              <div className="flex flex-wrap gap-2">
                {TIMES.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(time)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      preferences.preferred_times.includes(time)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Denomination Preference</label>
              <select
                value={preferences.denomination_preference || 'Any'}
                onChange={(e) => setPreferences({ ...preferences, denomination_preference: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {DENOMINATIONS.map(denom => (
                  <option key={denom} value={denom}>{denom}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Notice (weeks)</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={preferences.min_notice_weeks}
                  onChange={(e) => setPreferences({ ...preferences, min_notice_weeks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Visits Per Month</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={preferences.max_visits_per_month}
                  onChange={(e) => setPreferences({ ...preferences, max_visits_per_month: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message to Visiting Ministers</label>
              <textarea
                value={preferences.welcome_message || ''}
                onChange={(e) => setPreferences({ ...preferences, welcome_message: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Share why you welcome visiting ministers and what they can expect..."
              />
            </div>
          </>
        )}

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : 'Save Visit Preferences'}
        </button>
      </div>
    </div>
  );
};

export default VisitPreferencesSettings;