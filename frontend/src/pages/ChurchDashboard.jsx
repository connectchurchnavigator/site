import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FiHome, FiUsers, FiMail, FiHeart, FiEdit, FiCalendar, FiBarChart2, FiSettings, FiDownload, FiSend, FiArchive, FiMapPin } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ChurchDashboard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({});

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, slug]);

  const loadTabData = async (tab) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/church/${slug}/${tab}`);
      setData(prev => ({ ...prev, [tab]: response.data }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiHome },
    { id: 'visitors', label: 'Visitors', icon: FiUsers },
    { id: 'messages', label: 'Messages', icon: FiMail },
    { id: 'followers', label: 'Followers', icon: FiHeart },
    { id: 'posts', label: 'Posts', icon: FiEdit },
    { id: 'space-rental', label: 'Space Rental', icon: FiCalendar },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    { id: 'settings', label: 'Settings', icon: FiSettings }
  ];

  const markMessageRead = async (messageId, isRead) => {
    try {
      await axios.patch(`${API_URL}/api/dashboard/church/${slug}/messages/${messageId}`, { is_read: isRead });
      loadTabData('messages');
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const archiveMessage = async (messageId) => {
    try {
      await axios.patch(`${API_URL}/api/dashboard/church/${slug}/messages/${messageId}`, { is_archived: true });
      loadTabData('messages');
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  };

  const exportVisitorsCSV = () => {
    const visitors = data.visitors?.visitors || [];
    const csv = [
      ['Name', 'Email', 'Phone', 'Date', 'First Time', 'Notes'],
      ...visitors.map(v => [v.name, v.email || '', v.phone || '', new Date(v.date).toLocaleDateString(), v.is_first_time ? 'Yes' : 'No', v.notes || ''])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors-${slug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const createPost = async (postData) => {
    try {
      await axios.post(`${API_URL}/api/dashboard/church/${slug}/posts`, postData);
      loadTabData('posts');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const updateSpaceRental = async (enabled, details) => {
    try {
      await axios.patch(`${API_URL}/api/dashboard/church/${slug}/space-rental`, { enabled, details });
      loadTabData('space-rental');
    } catch (error) {
      console.error('Error updating space rental:', error);
    }
  };

  const updateSettings = async (settings) => {
    try {
      await axios.patch(`${API_URL}/api/dashboard/church/${slug}/settings`, settings);
      loadTabData('settings');
      alert('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const renderOverview = () => {
    const overview = data.overview || {};
    const stats = overview.this_week || {};
    const completion = overview.completion_score || {};

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Profile Completion</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="bg-white/30 h-4 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{ width: `${completion.percentage || 0}%` }} />
              </div>
            </div>
            <span className="text-2xl font-bold">{completion.percentage || 0}%</span>
          </div>
          {completion.tips?.length > 0 && (
            <div className="mt-3 space-y-1">
              {completion.tips.map((tip, i) => <p key={i} className="text-sm">• {tip}</p>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Views</div>
            <div className="text-3xl font-bold text-blue-600">{stats.views || 0}</div>
            <div className="text-xs text-gray-400">This week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Messages</div>
            <div className="text-3xl font-bold text-green-600">{stats.messages || 0}</div>
            <div className="text-xs text-gray-400">This week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Followers</div>
            <div className="text-3xl font-bold text-purple-600">{stats.followers || 0}</div>
            <div className="text-xs text-gray-400">This week</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Visits</div>
            <div className="text-3xl font-bold text-orange-600">{stats.visits || 0}</div>
            <div className="text-xs text-gray-400">This week</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate(`/church/${slug}/edit`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Profile</button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Generate Flyer</button>
            <button onClick={() => window.open(`/church/${slug}`, '_blank')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">View Website</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(overview.recent_activity || []).map((activity, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'message' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <p className="text-sm">{activity.text}</p>
                  <p className="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderVisitors = () => {
    const visitors = data.visitors || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Total Check-ins</div>
            <div className="text-3xl font-bold">{visitors.total_checkins || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">First Time Visitors</div>
            <div className="text-3xl font-bold text-blue-600">{visitors.first_time_count || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm">Returning Visitors</div>
            <div className="text-3xl font-bold text-green-600">{visitors.returning_count || 0}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Visitor List</h3>
            <button onClick={exportVisitorsCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <FiDownload /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">First Time?</th>
                </tr>
              </thead>
              <tbody>
                {(visitors.visitors || []).map(visitor => (
                  <tr key={visitor.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">{visitor.name}</td>
                    <td className="py-3">{visitor.email}</td>
                    <td className="py-3">{new Date(visitor.date).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${visitor.is_first_time ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {visitor.is_first_time ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Check-in QR Code</h3>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://churchnavigator.com/checkin/${slug}`)}`} alt="QR Code" className="border" />
          <p className="text-sm text-gray-600 mt-2">Visitors can scan this to check in</p>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const messages = data.messages?.messages || [];
    const [filter, setFilter] = useState('all');

    const filteredMessages = messages.filter(msg => {
      if (filter === 'unread') return !msg.is_read;
      if (filter === 'archived') return msg.is_archived;
      return !msg.is_archived;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow flex gap-3">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>All</button>
          <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Unread</button>
          <button onClick={() => setFilter('archived')} className={`px-4 py-2 rounded ${filter === 'archived' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Archived</button>
        </div>

        <div className="space-y-3">
          {filteredMessages.map(message => (
            <div key={message.id} className={`bg-white p-6 rounded-lg shadow ${!message.is_read ? 'border-l-4 border-blue-600' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold">{message.sender_name}</h4>
                  <p className="text-sm text-gray-600">{message.sender_email}</p>
                </div>
                <div className="text-sm text-gray-400">{new Date(message.received_at).toLocaleDateString()}</div>
              </div>
              <p className="text-gray-700 mb-4">{message.message}</p>
              <div className="flex gap-2">
                <button onClick={() => window.location.href = `mailto:${message.sender_email}`} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  <FiSend /> Reply
                </button>
                <button onClick={() => markMessageRead(message.id, !message.is_read)} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
                  Mark as {message.is_read ? 'Unread' : 'Read'}
                </button>
                <button onClick={() => archiveMessage(message.id)} className="flex items-center gap-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
                  <FiArchive /> Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFollowers = () => {
    const followers = data.followers || {};

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Total Followers: {followers.total_count || 0}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={followers.growth_chart || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Follower List</h3>
          <div className="space-y-3">
            {(followers.followers || []).map(follower => (
              <div key={follower.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div>
                  <div className="font-medium">{follower.name}</div>
                  <div className="text-sm text-gray-600">{follower.email}</div>
                </div>
                <div className="text-sm text-gray-400">
                  Joined {new Date(follower.joined_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPosts = () => {
    const posts = data.posts?.posts || [];
    const [showNewPost, setShowNewPost] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', image_url: '', is_published: false });

    const handleCreatePost = () => {
      createPost(newPost);
      setShowNewPost(false);
      setNewPost({ title: '', content: '', image_url: '', is_published: false });
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <button onClick={() => setShowNewPost(!showNewPost)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {showNewPost ? 'Cancel' : 'Create New Post'}
          </button>
        </div>

        {showNewPost && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">New Post</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Post title" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} className="w-full p-3 border rounded" />
              <textarea placeholder="Post content" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} rows={5} className="w-full p-3 border rounded" />
              <input type="text" placeholder="Image URL (optional)" value={newPost.image_url} onChange={e => setNewPost({ ...newPost, image_url: e.target.value })} className="w-full p-3 border rounded" />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={newPost.is_published} onChange={e => setNewPost({ ...newPost, is_published: e.target.checked })} />
                Publish immediately
              </label>
              <button onClick={handleCreatePost} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">Create Post</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-xl font-bold">{post.title}</h4>
                <span className={`px-3 py-1 rounded text-sm ${post.is_published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {post.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              {post.image_url && <img src={post.image_url} alt={post.title} className="w-full h-48 object-cover rounded mb-3" />}
              <p className="text-gray-700 mb-4">{post.content}</p>
              <div className="flex gap-6 text-sm text-gray-600">
                <span>{post.views} views</span>
                <span>{post.likes} likes</span>
                <span>{post.shares} shares</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSpaceRental = () => {
    const spaceRental = data['space-rental'] || {};
    const [enabled, setEnabled] = useState(spaceRental.enabled || false);
    const [details, setDetails] = useState(spaceRental.details || { capacity: '', rate: '', description: '' });

    const handleSave = () => {
      updateSpaceRental(enabled, details);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <label className="flex items-center gap-3 mb-4">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="w-5 h-5" />
            <span className="font-bold">Space Available for Rental</span>
          </label>
          {enabled && (
            <div className="space-y-4">
              <input type="number" placeholder="Capacity" value={details.capacity} onChange={e => setDetails({ ...details, capacity: e.target.value })} className="w-full p-3 border rounded" />
              <input type="text" placeholder="Rate (e.g., £100/hour)" value={details.rate} onChange={e => setDetails({ ...details, rate: e.target.value })} className="w-full p-3 border rounded" />
              <textarea placeholder="Description" value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} rows={4} className="w-full p-3 border rounded" />
              <button onClick={handleSave} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Enquiries ({(spaceRental.enquiries || []).length})</h3>
          <div className="space-y-3">
            {(spaceRental.enquiries || []).map(enq => (
              <div key={enq.id} className="p-4 border rounded">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{enq.name}</div>
                  <span className={`px-2 py-1 rounded text-xs ${enq.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                    {enq.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{enq.email} • {enq.phone}</p>
                  <p>{enq.event_type} • {enq.guest_count} guests</p>
                  <p>{enq.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const analytics = data.analytics || {};

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Page Views (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.daily_views || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Top Referral Sources</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.top_referrers || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={analytics.device_breakdown || []} dataKey="count" nameKey="device" cx="50%" cy="50%" outerRadius={80} label>
                  {(analytics.device_breakdown || []).map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Top Search Terms</h3>
          <div className="space-y-2">
            {(analytics.top_search_terms || []).map((term, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>{term.term}</span>
                <span className="font-bold text-blue-600">{term.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const settings = data.settings || {};
    const [formData, setFormData] = useState(settings);

    const handleSave = () => {
      updateSettings(formData);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={formData.notification_email} onChange={e => setFormData({ ...formData, notification_email: e.target.checked })} />
              Email notifications
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={formData.notification_sms} onChange={e => setFormData({ ...formData, notification_sms: e.target.checked })} />
              SMS notifications
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Connected Accounts</h3>
          <div className="space-y-3">
            <input type="url" placeholder="Facebook URL" value={formData.facebook_url || ''} onChange={e => setFormData({ ...formData, facebook_url: e.target.value })} className="w-full p-3 border rounded" />
            <input type="url" placeholder="YouTube URL" value={formData.youtube_url || ''} onChange={e => setFormData({ ...formData, youtube_url: e.target.value })} className="w-full p-3 border rounded" />
            <input type="url" placeholder="Instagram URL" value={formData.instagram_url || ''} onChange={e => setFormData({ ...formData, instagram_url: e.target.value })} className="w-full p-3 border rounded" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Pro Plan</h3>
          <p className="text-gray-600 mb-4">Status: {formData.is_pro ? 'Active' : 'Not Active'}</p>
          {!formData.is_pro && <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Upgrade to Pro</button>}
        </div>

        <button onClick={handleSave} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Settings</button>

        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
          <p className="text-sm text-gray-600 mb-4">Once you delete your listing, there is no going back.</p>
          <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete Listing</button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="text-center py-12">Loading...</div>;

    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'visitors': return renderVisitors();
      case 'messages': return renderMessages();
      case 'followers': return renderFollowers();
      case 'posts': return renderPosts();
      case 'space-rental': return renderSpaceRental();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderSettings();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Church Dashboard</h1>
          <p className="text-gray-600">{slug}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default ChurchDashboard;