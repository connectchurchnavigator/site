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
  Building,
  Shield,
  Zap,
  Users,
  Link,
  UserPlus,
  MapPin,
  Heart
} from 'lucide-react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';

const categoryIcons = {
  denomination: Church,
  language: Globe,
  worship_style: Music,
  facility: Building,
  ministry: Tags,
  qualification: Shield,
  designation: Zap,
  skill: Heart,
  role: Users,
  relationship_church: Link,
  relationship_pastor: UserPlus,
  location_serving: MapPin
};

const PREDEFINED_CATEGORIES = [
  { id: 'denomination', label: 'Denomination' },
  { id: 'language', label: 'Language' },
  { id: 'worship_style', label: 'Worship Style' },
  { id: 'facility', label: 'Facility' },
  { id: 'ministry', label: 'Ministry' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'designation', label: 'Designation' },
  { id: 'skill', label: 'Skill' },
  { id: 'role', label: 'Role' },
  { id: 'relationship_church', label: 'Relationship (Church)' },
  { id: 'relationship_pastor', label: 'Relationship (Pastor)' },
  { id: 'location_serving', label: 'Location Serving' }
];

const AdminTaxonomies = () => {
  const [taxonomies, setTaxonomies] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newItem, setNewItem] = useState({ category: '', value: '', customCategory: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [inlineAddCategory, setInlineAddCategory] = useState(null);
  const [inlineAddValue, setInlineAddValue] = useState('');

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
    const category = isCustomCategory ? newItem.customCategory : newItem.category;
    
    if (!category || !newItem.value) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      await adminAPI.createTaxonomy(category.toLowerCase().replace(/\s+/g, '_'), newItem.value);
      toast.success('Taxonomy added');
      setNewItem({ category: '', value: '', customCategory: '' });
      setIsCustomCategory(false);
      setShowAddForm(false);
      fetchTaxonomies();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add');
    }
  };

  const handleInlineAdd = async (category) => {
    if (!inlineAddValue.trim()) return;
    
    try {
      await adminAPI.createTaxonomy(category, inlineAddValue.trim());
      toast.success(`Added to ${category.replace('_', ' ')}`);
      setInlineAddValue('');
      setInlineAddCategory(null);
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
        <Card className="p-6 bg-brand/5 border-brand shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-brand flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Taxonomy Entry
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-slate-400">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
              <select
                value={isCustomCategory ? 'other' : newItem.category}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'other') {
                    setIsCustomCategory(true);
                    setNewItem(prev => ({ ...prev, category: '' }));
                  } else {
                    setIsCustomCategory(false);
                    setNewItem(prev => ({ ...prev, category: val }));
                  }
                }}
                className="w-full h-11 px-3 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-brand/20 outline-none transition-all"
              >
                <option value="">Select Category</option>
                {PREDEFINED_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
                {/* Dynamically add existing categories that aren't in predefined */}
                {Object.keys(taxonomies)
                  .filter(cat => !PREDEFINED_CATEGORIES.find(p => p.id === cat))
                  .map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))
                }
                <option value="other" className="font-bold text-brand italic underline">Other / New Category...</option>
              </select>
            </div>

            {isCustomCategory && (
              <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Custom Category Name</label>
                <Input
                  placeholder="e.g. Skill, Qualification"
                  value={newItem.customCategory}
                  onChange={(e) => setNewItem(prev => ({ ...prev, customCategory: e.target.value }))}
                  className="h-11 rounded-xl"
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Entry Value</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Baptist, English, Doctor of Ministry"
                  value={newItem.value}
                  onChange={(e) => setNewItem(prev => ({ ...prev, value: e.target.value }))}
                  className="h-11 rounded-xl flex-1"
                />
                <Button onClick={handleAdd} className="h-11 px-6 rounded-xl bg-brand shadow-md hover:shadow-lg transition-all">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
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
                            className="pr-8 py-1.5 px-3 hover:bg-slate-50 cursor-default border-slate-200 text-slate-700"
                          >
                            {item.value}
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1 bg-white/80 backdrop-blur-sm rounded pl-1">
                              <button
                                onClick={() => { setEditingItem(item.id || item.value); setEditValue(item.value); }}
                                className="p-1 hover:bg-slate-200 rounded transition-colors"
                              >
                                <Edit className="h-3 w-3 text-slate-500" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id || item.value, item.value)}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </button>
                            </div>
                          </Badge>
                        )}
                      </div>
                    ))}

                    {/* Inline Add Button/Input */}
                    <div className="flex items-center gap-2">
                      {inlineAddCategory === category ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200">
                          <Input
                            value={inlineAddValue}
                            onChange={(e) => setInlineAddValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineAdd(category);
                              if (e.key === 'Escape') setInlineAddCategory(null);
                            }}
                            placeholder="Type new value..."
                            className="h-8 w-48 text-xs rounded-lg"
                            autoFocus
                          />
                          <Button size="sm" onClick={() => handleInlineAdd(category)} className="h-8 w-8 p-0 bg-brand hover:bg-brand-hover rounded-lg">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setInlineAddCategory(null); setInlineAddValue(''); }} className="h-8 w-8 p-0 text-slate-400">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setInlineAddCategory(category)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:text-brand hover:border-brand hover:bg-brand/5 text-[11px] font-bold transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          Add Option
                        </button>
                      )}
                    </div>
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
