import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsManager = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leader_name: '',
    leader_contact: '',
    meeting_day: 'Monday',
    meeting_time: '',
    frequency: 'Weekly',
    location_type: 'in-person',
    address_or_link: '',
    capacity: 12,
    current_members: 0,
    age_group: '',
    topics: [],
    is_open_to_join: true
  });
  const [topicInput, setTopicInput] = useState('');

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await axios.put(`${API_URL}/api/small-groups/${editingGroup._id}`, formData);
      } else {
        await axios.post(`${API_URL}/api/churches/${churchSlug}/small-groups`, {
          ...formData,
          church_id: churchSlug
        });
      }
      setShowModal(false);
      resetForm();
      fetchGroups();
    } catch (err) {
      alert('Failed to save group. Please try again.');
    }
  };

  const handleDelete = async (groupId) => {
    if (!confirm('Are you sure you want to delete this small group?')) return;
    try {
      await axios.delete(`${API_URL}/api/small-groups/${groupId}`);
      fetchGroups();
    } catch (err) {
      alert('Failed to delete group.');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      leader_name: group.leader_name,
      leader_contact: group.leader_contact,
      meeting_day: group.meeting_day,
      meeting_time: group.meeting_time,
      frequency: group.frequency,
      location_type: group.location_type,
      address_or_link: group.address_or_link,
      capacity: group.capacity,
      current_members: group.current_members,
      age_group: group.age_group || '',
      topics: group.topics || [],
      is_open_to_join: group.is_open_to_join
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      leader_name: '',
      leader_contact: '',
      meeting_day: 'Monday',
      meeting_time: '',
      frequency: 'Weekly',
      location_type: 'in-person',
      address_or_link: '',
      capacity: 12,
      current_members: 0,
      age_group: '',
      topics: [],
      is_open_to_join: true
    });
    setTopicInput('');
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData({ ...formData, topics: [...formData.topics, topicInput.trim()] });
      setTopicInput('');
    }
  };

  const removeTopic = (topic) => {
    setFormData({ ...formData, topics: formData.topics.filter(t => t !== topic) });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Small Groups</h2>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No small groups yet. Create your first one!</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {groups.map((group) => (
              <li key={group._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.is_open_to_join ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.is_open_to_join ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">{group.leader_name}</span> • {group.meeting_day}s, {group.meeting_time} • {group.current_members}/{group.capacity} members
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-2 text-violet-600 hover:bg-violet-50 rounded"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(group._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
          <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-lg shadow-xl my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {editingGroup ? 'Edit Small Group' : 'Create Small Group'}
              </Dialog.Title>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leader Name *</label>
                  <input type="text" required value={formData.leader_name} onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leader Email *</label>
                  <input type="email" required value={formData.leader_contact} onChange={(e) => setFormData({ ...formData, leader_contact: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Day *</label>
                  <select required value={formData.meeting_day} onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Time *</label>
                  <input type="text" required value={formData.meeting_time} onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })} placeholder="e.g., 7:00 PM" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                  <select required value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500">
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Type *</label>
                  <select required value={formData.location_type} onChange={(e) => setFormData({ ...formData, location_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500">
                    <option value="in-person">In-Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.location_type === 'online' ? 'Meeting Link *' : 'Address *'}
                  </label>
                  <input type="text" required value={formData.address_or_link} onChange={(e) => setFormData({ ...formData, address_or_link: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
                  <input type="number" required min="1" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Members *</label>
                  <input type="number" required min="0" value={formData.current_members} onChange={(e) => setFormData({ ...formData, current_members: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                  <input type="text" value={formData.age_group} onChange={(e) => setFormData({ ...formData, age_group: e.target.value })} placeholder="e.g., 18-30, Families, Seniors" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topics</label>
                  <div className="flex gap-2">
                    <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())} placeholder="Add topic" className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    <button type="button" onClick={addTopic} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.topics.map((topic, idx) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-violet-100 text-violet-800">
                        {topic}
                        <button type="button" onClick={() => removeTopic(topic)} className="ml-2 text-violet-600 hover:text-violet-800">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center">
                    <input type="checkbox" checked={formData.is_open_to_join} onChange={(e) => setFormData({ ...formData, is_open_to_join: e.target.checked })} className="rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <span className="ml-2 text-sm text-gray-700">Open to new members</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700">
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default SmallGroupsManager;