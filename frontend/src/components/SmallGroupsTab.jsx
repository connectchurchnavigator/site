import React, { useState, useEffect } from 'react';
import { Mail, MapPin, Users, Clock, Calendar, Globe, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsTab = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joinForm, setJoinForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load small groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (group) => {
    setSelectedGroup(group);
    setSubmitSuccess(false);
    setJoinForm({ name: '', email: '', message: '' });
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/small-groups/${selectedGroup.id}/join`, joinForm);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedGroup(null);
        setSubmitSuccess(false);
      }, 3000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit join request');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocationIcon = (type) => {
    if (type === 'online') return <Globe className="w-4 h-4" />;
    if (type === 'hybrid') return <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /><Globe className="w-4 h-4" /></span>;
    return <MapPin className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">No small groups available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
          const isFull = group.current_members >= group.capacity;
          const isOpen = group.is_open_to_join && !isFull;

          return (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-100"
            >
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-white">
                <h3 className="font-bold text-lg mb-1">{group.name}</h3>
                <p className="text-sm text-violet-100">Led by {group.leader_name}</p>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-gray-700 text-sm line-clamp-3">{group.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-violet-500" />
                    <span>{group.meeting_day}s, {group.frequency}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-violet-500" />
                    <span>{group.meeting_time}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-violet-500">{getLocationIcon(group.location_type)}</span>
                    <span className="capitalize truncate">{group.location_type}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 text-violet-500" />
                    <span>
                      {group.current_members}/{group.capacity} members
                      {isFull && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Full</span>}
                    </span>
                  </div>

                  {group.age_group && (
                    <div className="text-gray-600">
                      <span className="font-medium">Age:</span> {group.age_group}
                    </div>
                  )}
                </div>

                {group.topics && group.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {group.topics.slice(0, 4).map((topic, idx) => (
                      <span
                        key={idx}
                        className="bg-violet-50 text-violet-700 text-xs px-2 py-1 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                    {group.topics.length > 4 && (
                      <span className="text-xs text-gray-500 self-center">+{group.topics.length - 4}</span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleJoinClick(group)}
                  disabled={!isOpen}
                  className={`w-full mt-4 py-2.5 px-4 rounded-lg font-medium transition-colors duration-200 ${
                    isOpen
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isFull ? 'Group Full' : !group.is_open_to_join ? 'Not Accepting Members' : 'Join Group'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Join {selectedGroup.name}</h3>

            {submitSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                <p className="font-medium">Request Submitted Successfully!</p>
                <p className="text-sm mt-1">The group leader will contact you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={joinForm.name}
                    onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                  <input
                    type="email"
                    required
                    value={joinForm.email}
                    onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                  <textarea
                    value={joinForm.message}
                    onChange={(e) => setJoinForm({ ...joinForm, message: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Tell the leader a bit about yourself..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallGroupsTab;
