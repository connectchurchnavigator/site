import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MapPinIcon, ClockIcon, UserGroupIcon, CalendarIcon, VideoCameraIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsSection = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load small groups');
      setLoading(false);
    }
  };

  const handleJoinClick = (group) => {
    setSelectedGroup(group);
    setShowJoinModal(true);
    setSubmitSuccess(false);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/small-groups/${selectedGroup._id}/join`, joinForm);
      setSubmitSuccess(true);
      setJoinForm({ name: '', email: '', message: '' });
      setTimeout(() => {
        setShowJoinModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      alert('Failed to send join request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocationIcon = (locationType) => {
    switch (locationType) {
      case 'online': return <VideoCameraIcon className="h-5 w-5" />;
      case 'in-person': return <BuildingOfficeIcon className="h-5 w-5" />;
      case 'hybrid': return <MapPinIcon className="h-5 w-5" />;
      default: return <MapPinIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No small groups</h3>
        <p className="mt-1 text-sm text-gray-500">This church hasn't added any small groups yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                {group.is_open_to_join && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Open
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-700">
                  <UserGroupIcon className="h-4 w-4 mr-2 text-violet-600" />
                  <span className="font-medium">{group.leader_name}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2 text-violet-600" />
                  <span>{group.meeting_day}s, {group.meeting_time}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-2 text-violet-600" />
                  <span>{group.frequency}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  {getLocationIcon(group.location_type)}
                  <span className="ml-2 capitalize">{group.location_type}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <UserGroupIcon className="h-4 w-4 mr-2 text-violet-600" />
                  <span>{group.current_members}/{group.capacity} members</span>
                </div>
                
                {group.age_group && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Age group:</span> {group.age_group}
                  </div>
                )}
              </div>
              
              {group.topics && group.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {group.topics.map((topic, idx) => (
                    <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
              
              {group.is_open_to_join && group.current_members < group.capacity && (
                <button
                  onClick={() => handleJoinClick(group)}
                  className="w-full bg-violet-600 text-white px-4 py-2 rounded-md hover:bg-violet-700 transition-colors duration-200 font-medium"
                >
                  Join Group
                </button>
              )}
              
              {group.current_members >= group.capacity && (
                <div className="w-full text-center text-sm text-gray-500 py-2">
                  Group is full
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showJoinModal} onClose={() => setShowJoinModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-6 border-b">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Join {selectedGroup?.name}
              </Dialog.Title>
              <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {submitSuccess ? (
              <div className="p-6">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Request sent successfully!</h3>
                      <p className="mt-2 text-sm text-green-700">
                        The group leader will contact you soon.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={joinForm.name}
                      onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={joinForm.email}
                      onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message (optional)
                    </label>
                    <textarea
                      value={joinForm.message}
                      onChange={(e) => setJoinForm({ ...joinForm, message: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500"
                      placeholder="Tell the leader a bit about yourself..."
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default SmallGroupsSection;