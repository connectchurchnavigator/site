import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, Users, Tag, Mail, Video, Home } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsTab = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching small groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (group) => {
    setSelectedGroup(group);
    setShowJoinForm(true);
    setSubmitStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus('submitting');
    try {
      await axios.post(`${API_URL}/api/small-groups/${selectedGroup.id}/join`, formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => {
        setShowJoinForm(false);
        setSelectedGroup(null);
        setSubmitStatus(null);
      }, 3000);
    } catch (error) {
      console.error('Error submitting join request:', error);
      setSubmitStatus('error');
    }
  };

  const getLocationIcon = (type) => {
    if (type === 'online') return <Video className="w-4 h-4" />;
    if (type === 'hybrid') return <Home className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Small Groups Yet</h3>
        <p className="text-gray-500">Check back later for small group opportunities.</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => {
          const isFull = group.capacity && group.current_members >= group.capacity;
          return (
            <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{group.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{group.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-700">
                    <Users className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="font-medium">Leader:</span>
                    <span className="ml-1">{group.leader_name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                    <span>{group.meeting_day} • {group.frequency}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 mr-2 text-purple-600" />
                    <span>{group.meeting_time}</span>
                  </div>
                  <div className="flex items-start text-sm text-gray-700">
                    {getLocationIcon(group.location_type)}
                    <span className="ml-2 capitalize">{group.location_type}</span>
                  </div>
                  {group.capacity && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Users className="w-4 h-4 mr-2 text-purple-600" />
                      <span>{group.current_members} / {group.capacity} members</span>
                      {isFull && <span className="ml-2 text-xs text-red-600 font-semibold">(Full)</span>}
                    </div>
                  )}
                  {group.age_group && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Age Group:</span> {group.age_group}
                    </div>
                  )}
                </div>
                {group.topics && group.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {group.topics.map((topic, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Tag className="w-3 h-3 mr-1" />
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleJoinClick(group)}
                  disabled={!group.is_open_to_join || isFull}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    !group.is_open_to_join || isFull
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isFull ? 'Group Full' : !group.is_open_to_join ? 'Not Accepting Members' : 'Join Group'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Join {selectedGroup?.name}</h3>
            <p className="text-gray-600 mb-6 text-sm">Fill out this form and the group leader will contact you.</p>
            {submitStatus === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">Request sent successfully! The group leader will contact you soon.</p>
              </div>
            ) : submitStatus === 'error' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 font-medium">Failed to send request. Please try again.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Tell the leader a bit about yourself..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinForm(false);
                      setSelectedGroup(null);
                      setFormData({ name: '', email: '', message: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitStatus === 'submitting'}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-purple-300"
                  >
                    {submitStatus === 'submitting' ? 'Sending...' : 'Send Request'}
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
