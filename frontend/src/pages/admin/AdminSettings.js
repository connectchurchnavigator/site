import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { 
  Settings, 
  Save,
  Globe,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Youtube,
  Twitter
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    site_name: 'Church Navigator',
    site_description: 'Find churches and pastors near you',
    contact_email: '',
    contact_phone: '',
    social_links: {
      facebook: '',
      instagram: '',
      twitter: '',
      youtube: ''
    },
    features_enabled: {
      user_registration: true,
      church_submission: true,
      pastor_submission: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSettings();
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateSocialLink = (key, value) => {
    setSettings(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value }
    }));
  };

  const updateFeature = (key, value) => {
    setSettings(prev => ({
      ...prev,
      features_enabled: { ...prev.features_enabled, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-600">Configure your site settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* General Settings */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-brand" />
          General Settings
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Site Name</Label>
            <Input
              value={settings.site_name}
              onChange={(e) => updateSetting('site_name', e.target.value)}
              placeholder="Church Navigator"
            />
          </div>
          <div>
            <Label>Site Description</Label>
            <Textarea
              value={settings.site_description}
              onChange={(e) => updateSetting('site_description', e.target.value)}
              placeholder="Find churches and pastors near you"
              rows={3}
            />
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-brand" />
          Contact Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Contact Email</Label>
            <Input
              type="email"
              value={settings.contact_email}
              onChange={(e) => updateSetting('contact_email', e.target.value)}
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input
              value={settings.contact_phone}
              onChange={(e) => updateSetting('contact_phone', e.target.value)}
              placeholder="+1 555-123-4567"
            />
          </div>
        </div>
      </Card>

      {/* Social Links */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">Social Media Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Facebook className="h-4 w-4" /> Facebook
            </Label>
            <Input
              value={settings.social_links?.facebook || ''}
              onChange={(e) => updateSocialLink('facebook', e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Instagram className="h-4 w-4" /> Instagram
            </Label>
            <Input
              value={settings.social_links?.instagram || ''}
              onChange={(e) => updateSocialLink('instagram', e.target.value)}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Twitter className="h-4 w-4" /> Twitter
            </Label>
            <Input
              value={settings.social_links?.twitter || ''}
              onChange={(e) => updateSocialLink('twitter', e.target.value)}
              placeholder="https://twitter.com/..."
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Youtube className="h-4 w-4" /> YouTube
            </Label>
            <Input
              value={settings.social_links?.youtube || ''}
              onChange={(e) => updateSocialLink('youtube', e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand" />
          Feature Toggles
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">User Registration</p>
              <p className="text-sm text-slate-500">Allow new users to register</p>
            </div>
            <Switch
              checked={settings.features_enabled?.user_registration ?? true}
              onCheckedChange={(v) => updateFeature('user_registration', v)}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">Church Submissions</p>
              <p className="text-sm text-slate-500">Allow users to submit new churches</p>
            </div>
            <Switch
              checked={settings.features_enabled?.church_submission ?? true}
              onCheckedChange={(v) => updateFeature('church_submission', v)}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Pastor Submissions</p>
              <p className="text-sm text-slate-500">Allow users to submit new pastor profiles</p>
            </div>
            <Switch
              checked={settings.features_enabled?.pastor_submission ?? true}
              onCheckedChange={(v) => updateFeature('pastor_submission', v)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminSettings;
