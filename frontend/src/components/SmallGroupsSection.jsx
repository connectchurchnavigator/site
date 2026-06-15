import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Users, Calendar, MapPin, Globe, Home, Video, Search, Filter, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsSection = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joinFormData, setJoinFormData] = useState({ name: '', email: '', message: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  useEffect(() => {
    let filtered = groups;
    if (searchTerm) {
      filtered = filtered.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.topics?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filterOpen !== null) {
      filtered = filtered.filter(g => g.is_open_to_join === true);
    }
    setFilteredGroups(filtered);
  }, [searchTerm, filterOpen, groups]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
      setFilteredGroups(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load small groups');
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await axios.post(`${API_URL}/api/small-groups/${selectedGroup.id}/join`, joinFormData);
      setSubmitSuccess(true);
      setJoinFormData({ name: '', email: '', message: '' });
      setTimeout(() => {
        setSelectedGroup(null);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit join request');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getLocationIcon = (type) => {
    if (type === 'online') return <Globe className="w-4 h-4" />;
    if (type === 'hybrid') return <Video className="w-4 h-4" />;
    return <Home className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div></div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="text-center py-12 text-gray-500">No small groups available yet. Check back soon!</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search groups by name, description, or topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setFilterOpen(filterOpen === null ? true : null)}
          className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${filterOpen ? 'bg-purple-100 border-purple-500' : 'border-gray-300 hover:bg-gray-50'}`}
        >
          <Filter className="w-4 h-4" />
          {filterOpen ? 'Show All' : 'Open Only'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                {group.is_open_to_join ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Open</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Closed</span>
                )}
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-2">{group.description}</p>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{group.leader_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>{group.meeting_day}s at {group.meeting_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getLocationIcon(group.location_type)}
                  <span className="capitalize">{group.location_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>{group.current_members}/{group.capacity} members</span>
                </div>
              </div>

              {group.topics && group.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {group.topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">{topic}</span>
                  ))}
                  {group.topics.length > 3 && <span className="text-xs text-gray-500">+{group.topics.length - 3} more</span>}
                </div>
              )}

              {group.age_group && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Age Group:</span> {group.age_group}
                </div>
              )}

              <button
                onClick={() => setSelectedGroup(group)}
                disabled={!group.is_open_to_join}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {group.is_open_to_join ? 'Join Group' : 'Not Accepting Members'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 text-gray-500">No groups match your search criteria.</div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
            <button onClick={() => setSelectedGroup(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Join {selectedGroup.name}</h3>
            
            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-5xl mb-4">✓</div>
                <p className="text-lg font-medium text-gray-900">Request Submitted!</p>
                <p className="text-gray-600 mt-2">The group leader will contact you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={joinFormData.name}
                    onChange={(e) => setJoinFormData({...joinFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                  <input
                    type="email"
                    required
                    value={joinFormData.email}
                    onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                  <textarea
                    rows={3}
                    value={joinFormData.message}
                    onChange={(e) => setJoinFormData({...joinFormData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tell the group leader a bit about yourself..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium rounded-lg transition-colors"
                >
                  {submitLoading ? 'Submitting...' : 'Submit Join Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallGroupsSection;