import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Calendar, MapPin } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsManagement = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', leader_name: '', leader_contact: '',
    meeting_day: 'Monday', meeting_time: '19:00', frequency: 'weekly',
    location_type: 'in-person', address_or_link: '', capacity: 12,
    current_members: 0, age_group: '', topics: [], is_open_to_join: true
  });

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, topics: formData.topics.filter(t => t.trim()) };
      if (editingGroup) {
        await axios.put(`${API_URL}/api/small-groups/${editingGroup.id}`, payload);
      } else {
        await axios.post(`${API_URL}/api/churches/${churchSlug}/small-groups`, { ...payload, church_id: churchSlug });
      }
      setShowForm(false);
      setEditingGroup(null);
      resetForm();
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to save group');
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await axios.delete(`${API_URL}/api/small-groups/${groupId}`);
      fetchGroups();
    } catch (error) {
      alert('Failed to delete group');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name, description: group.description,
      leader_name: group.leader_name, leader_contact: group.leader_contact,
      meeting_day: group.meeting_day, meeting_time: group.meeting_time,
      frequency: group.frequency, location_type: group.location_type,
      address_or_link: group.address_or_link, capacity: group.capacity,
      current_members: group.current_members, age_group: group.age_group || '',
      topics: group.topics || [], is_open_to_join: group.is_open_to_join
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', leader_name: '', leader_contact: '',
      meeting_day: 'Monday', meeting_time: '19:00', frequency: 'weekly',
      location_type: 'in-person', address_or_link: '', capacity: 12,
      current_members: 0, age_group: '', topics: [], is_open_to_join: true
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Small Groups Management</h2>
        <button
          onClick={() => { setShowForm(true); setEditingGroup(null); resetForm(); }}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-500">Led by {group.leader_name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(group)} className="text-blue-600 hover:text-blue-800">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(group.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{group.meeting_day}s at {group.meeting_time}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="capitalize">{group.location_type}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{group.current_members}/{group.capacity} members</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className={`text-xs px-2 py-1 rounded-full ${group.is_open_to_join ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {group.is_open_to_join ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h3 className="text-xl font-bold mb-4">{editingGroup ? 'Edit Group' : 'Create New Group'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Group Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Leader Name *</label>
                  <input type="text" required value={formData.leader_name} onChange={(e) => setFormData({...formData, leader_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Leader Email *</label>
                  <input type="email" required value={formData.leader_contact} onChange={(e) => setFormData({...formData, leader_contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Day *</label>
                  <select required value={formData.meeting_day} onChange={(e) => setFormData({...formData, meeting_day: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Time *</label>
                  <input type="time" required value={formData.meeting_time} onChange={(e) => setFormData({...formData, meeting_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency *</label>
                  <select required value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location Type *</label>
                  <select required value={formData.location_type} onChange={(e) => setFormData({...formData, location_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                    <option value="in-person">In-Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">{formData.location_type === 'online' ? 'Meeting Link' : 'Address'} *</label>
                  <input type="text" required value={formData.address_or_link} onChange={(e) => setFormData({...formData, address_or_link: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity *</label>
                  <input type="number" required min="2" max="100" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Members</label>
                  <input type="number" min="0" value={formData.current_members} onChange={(e) => setFormData({...formData, current_members: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age Group</label>
                  <input type="text" value={formData.age_group} onChange={(e) => setFormData({...formData, age_group: e.target.value})} placeholder="e.g., 18-35, Young Adults" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Open to Join?</label>
                  <input type="checkbox" checked={formData.is_open_to_join} onChange={(e) => setFormData({...formData, is_open_to_join: e.target.checked})} className="w-4 h-4" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowForm(false); setEditingGroup(null); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Save Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmallGroupsManagement;
