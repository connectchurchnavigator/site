import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Users,
  Shield,
  Send
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    message: '',
    target: 'all'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getAnnouncements();
      setAnnouncements(res.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await adminAPI.createAnnouncement(
        newAnnouncement.title,
        newAnnouncement.message,
        newAnnouncement.target
      );
      toast.success('Announcement created');
      setNewAnnouncement({ title: '', message: '', target: 'all' });
      setShowForm(false);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to create announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    
    try {
      await adminAPI.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getTargetBadge = (target) => {
    const configs = {
      all: { icon: Users, label: 'All Users', variant: 'default' },
      customers: { icon: Users, label: 'Customers', variant: 'secondary' },
      admins: { icon: Shield, label: 'Admins Only', variant: 'outline' }
    };
    const config = configs[target] || configs.all;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-600">Send notifications to users</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6 border-brand bg-brand/5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Create Announcement
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Announcement message..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Target Audience</label>
              <div className="flex gap-2 mt-2">
                {['all', 'customers', 'admins'].map(target => (
                  <Button
                    key={target}
                    variant={newAnnouncement.target === target ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewAnnouncement(prev => ({ ...prev, target }))}
                  >
                    {target === 'all' && 'All Users'}
                    {target === 'customers' && 'Customers Only'}
                    {target === 'admins' && 'Admins Only'}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleCreate}>
                <Send className="h-4 w-4 mr-2" />
                Send Announcement
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Announcements List */}
      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
        </Card>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Announcements</h3>
          <p className="text-slate-600">Create your first announcement to notify users</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <Card key={announcement.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell className="h-5 w-5 text-brand" />
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {getTargetBadge(announcement.target)}
                  </div>
                  <p className="text-slate-600 mb-3">{announcement.message}</p>
                  <p className="text-xs text-slate-400">
                    Created: {new Date(announcement.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(announcement.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncements;
