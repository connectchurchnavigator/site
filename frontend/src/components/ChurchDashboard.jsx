import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Trash2, Plus, Users, Calendar, Video, Mail, X, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const ChurchDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [church, setChurch] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '', description: '', leader_name: '', leader_contact: '',
    meeting_day: '', meeting_time: '', frequency: 'Weekly',
    location_type: 'in-person', address_or_link: '', capacity: 12,
    current_members: 0, age_group: '', topics: '', is_open_to_join: true
  });

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'small-groups') {
      fetchGroups();
      fetchJoinRequests();
    }
  }, [activeTab]);

  const fetchChurch = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/churches/${slug}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChurch(response.data);
      setLoading(false);
    } catch (error) {
      alert('Failed to load church');
      navigate('/');
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${slug}/small-groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups');
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/churches/${slug}/join-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJoinRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch join requests');
    }
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...groupFormData,
        topics: groupFormData.topics ? groupFormData.topics.split(',').map(t => t.trim()) : [],
        church_id: church.id
      };

      if (editingGroup) {
        await axios.put(`${API_URL}/api/small-groups/${editingGroup.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/churches/${slug}/small-groups`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowGroupForm(false);
      setEditingGroup(null);
      resetGroupForm();
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/small-groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
    } catch (error) {
      alert('Failed to delete group');
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '', description: '', leader_name: '', leader_contact: '',
      meeting_day: '', meeting_time: '', frequency: 'Weekly',
      location_type: 'in-person', address_or_link: '', capacity: 12,
      current_members: 0, age_group: '', topics: '', is_open_to_join: true
    });
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      ...group,
      topics: group.topics?.join(', ') || ''
    });
    setShowGroupForm(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Manage {church?.name}</h1>
        
        <div className="bg-white rounded-lg shadow mb-6">
          <nav className="flex space-x-8 px-6 border-b">
            <button onClick={() => setActiveTab('overview')} className={`py-4 border-b-2 ${activeTab === 'overview' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}>Overview</button>
            <button onClick={() => setActiveTab('small-groups')} className={`py-4 border-b-2 ${activeTab === 'small-groups' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500'}`}>Small Groups</button>
          </nav>
        </div>

        {activeTab === 'small-groups' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Small Groups</h2>
              <button onClick={() => { resetGroupForm(); setShowGroupForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus className="w-5 h-5" /> Add Group
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map(group => (
                <div key={group.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">{group.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditGroup(group)} className="text-blue-600 hover:text-blue-700"><Edit className="w-5 h-5" /></button>
                      <button onClick={() => handleDeleteGroup(group.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{group.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-600" /> {group.current_members}/{group.capacity} members</div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-600" /> {group.meeting_day}s at {group.meeting_time}</div>
                    <div className="capitalize">{group.location_type}</div>
                  </div>
                  <span className={`inline-block mt-4 px-2 py-1 text-xs rounded-full ${group.is_open_to_join ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {group.is_open_to_join ? 'Open' : 'Closed'}
                  </span>
                </div>
              ))}
            </div>

            {joinRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h3 className="text-xl font-semibold mb-4">Join Requests ({joinRequests.length})</h3>
                <div className="space-y-3">
                  {joinRequests.map(req => (
                    <div key={req.id} className="border-b pb-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{req.name}</p>
                          <p className="text-sm text-gray-600">{req.email}</p>
                          <p className="text-sm text-gray-500">Group: {req.group_name}</p>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      {req.message && <p className="text-sm text-gray-600 mt-2 italic">"{req.message}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showGroupForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold">{editingGroup ? 'Edit Group' : 'Create Group'}</h3>
                <button onClick={() => { setShowGroupForm(false); setEditingGroup(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleGroupSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Group Name</label>
                    <input type="text" required value={groupFormData.name} onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea required value={groupFormData.description} onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Leader Name</label>
                    <input type="text" required value={groupFormData.leader_name} onChange={(e) => setGroupFormData({...groupFormData, leader_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Leader Email</label>
                    <input type="email" required value={groupFormData.leader_contact} onChange={(e) => setGroupFormData({...groupFormData, leader_contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Meeting Day</label>
                    <input type="text" required value={groupFormData.meeting_day} onChange={(e) => setGroupFormData({...groupFormData, meeting_day: e.target.value})} placeholder="e.g., Wednesday" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Meeting Time</label>
                    <input type="text" required value={groupFormData.meeting_time} onChange={(e) => setGroupFormData({...groupFormData, meeting_time: e.target.value})} placeholder="e.g., 7:00 PM" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Frequency</label>
                    <input type="text" required value={groupFormData.frequency} onChange={(e) => setGroupFormData({...groupFormData, frequency: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location Type</label>
                    <select required value={groupFormData.location_type} onChange={(e) => setGroupFormData({...groupFormData, location_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                      <option value="in-person">In-Person</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Address or Link</label>
                    <input type="text" required value={groupFormData.address_or_link} onChange={(e) => setGroupFormData({...groupFormData, address_or_link: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Capacity</label>
                    <input type="number" required min="2" max="100" value={groupFormData.capacity} onChange={(e) => setGroupFormData({...groupFormData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Members</label>
                    <input type="number" required min="0" value={groupFormData.current_members} onChange={(e) => setGroupFormData({...groupFormData, current_members: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Age Group (Optional)</label>
                    <input type="text" value={groupFormData.age_group} onChange={(e) => setGroupFormData({...groupFormData, age_group: e.target.value})} placeholder="e.g., Young Adults" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Topics (comma-separated)</label>
                    <input type="text" value={groupFormData.topics} onChange={(e) => setGroupFormData({...groupFormData, topics: e.target.value})} placeholder="Bible Study, Prayer, Fellowship" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" checked={groupFormData.is_open_to_join} onChange={(e) => setGroupFormData({...groupFormData, is_open_to_join: e.target.checked})} className="w-4 h-4" />
                    <label className="text-sm font-medium">Open to new members</label>
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchDashboard;