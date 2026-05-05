import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit,
  Save,
  X,
  Tags,
  Church,
  Globe,
  Music,
  Building
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const categoryIcons = {
  denomination: Church,
  language: Globe,
  worship_style: Music,
  facility: Building
};

const AdminTaxonomies = () => {
  const [taxonomies, setTaxonomies] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newItem, setNewItem] = useState({ category: '', value: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  const fetchTaxonomies = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getTaxonomies();
      setTaxonomies(res.data);
    } catch (error) {
      toast.error('Failed to load taxonomies');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newItem.category || !newItem.value) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await adminAPI.createTaxonomy(newItem.category, newItem.value);
      toast.success('Taxonomy added');
      setNewItem({ category: '', value: '' });
      setShowAddForm(false);
      fetchTaxonomies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add');
    }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim()) {
      toast.error('Value cannot be empty');
      return;
    }
    
    try {
      await adminAPI.updateTaxonomy(id, editValue);
      toast.success('Taxonomy updated');
      setEditingItem(null);
      fetchTaxonomies();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id, value) => {
    if (!window.confirm(`Delete "${value}"? This may affect existing listings.`)) return;
    
    try {
      await adminAPI.deleteTaxonomy(id);
      toast.success('Taxonomy deleted');
      fetchTaxonomies();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const categories = Object.keys(taxonomies);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Taxonomy Management</h1>
          <p className="text-slate-600">Manage categories, denominations, and more</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-4 bg-brand/5 border-brand">
          <h3 className="font-semibold mb-4">Add New Taxonomy</h3>
          <div className="flex gap-4">
            <select
              value={newItem.category}
              onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border rounded-lg w-48"
            >
              <option value="">Select Category</option>
              <option value="denomination">Denomination</option>
              <option value="language">Language</option>
              <option value="worship_style">Worship Style</option>
              <option value="facility">Facility</option>
              <option value="ministry">Ministry</option>
            </select>
            <Input
              placeholder="Value (e.g., Baptist, English)"
              value={newItem.value}
              onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
              className="flex-1"
            />
            <Button onClick={handleAdd}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          No taxonomies found. Add your first one!
        </Card>
      ) : (
        <div className="grid gap-6">
          {categories.map(category => {
            const Icon = categoryIcons[category] || Tags;
            const items = taxonomies[category] || [];
            
            return (
              <Card key={category} className="overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-brand" />
                    <h3 className="font-semibold capitalize">{category.replace('_', ' ')}</h3>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                      <div key={item.id || item.value} className="group relative">
                        {editingItem === (item.id || item.value) ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-40"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={() => handleUpdate(item.id || item.value)}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="pr-8 hover:bg-slate-50 cursor-default"
                          >
                            {item.value}
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                              <button
                                onClick={() => { setEditingItem(item.id || item.value); setEditValue(item.value); }}
                                className="p-1 hover:bg-slate-200 rounded"
                              >
                                <Edit className="h-3 w-3 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id || item.value, item.value)}
                                className="p-1 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTaxonomies;
