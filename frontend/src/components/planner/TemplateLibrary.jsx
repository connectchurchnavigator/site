import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TemplateLibrary = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('my');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/planner/templates?visibility=${activeTab}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId) => {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const missionaryName = prompt('Enter missionary name:');
    
    if (!startDate || !missionaryName) return;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/planner/trips/from-template`,
        { template_id: templateId, start_date: startDate, missionary_name: missionaryName },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      
      alert('Trip created successfully!');
      navigate(`/planner/${response.data.trip_id}`);
    } catch (error) {
      console.error('Error creating trip from template:', error);
      alert('Failed to create trip');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/planner/templates/${templateId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Trip Templates</h1>
          <button
            onClick={() => navigate('/planner/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >Create New Trip</button>
        </div>

        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="flex border-b">
            {['my', 'org', 'public', 'curated'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-semibold ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'my' && 'My Templates'}
                {tab === 'org' && 'My Organisation'}
                {tab === 'public' && 'Community'}
                {tab === 'curated' && 'ChurchNavigator Curated'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center py-12">Loading templates...</p>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 mb-4">No templates found in this category.</p>
            <button
              onClick={() => navigate('/planner/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >Create Your First Template</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template._id} className="bg-white rounded-lg shadow hover:shadow-xl transition p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold">{template.name}</h3>
                  {activeTab === 'my' && (
                    <button
                      onClick={() => handleDeleteTemplate(template._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >Delete</button>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 rounded text-xs">{tag}</span>
                  ))}
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>Duration:</strong> {template.trip_structure.total_days} days</p>
                  <p><strong>Visits:</strong> {template.trip_structure.churches.length} churches</p>
                  <p><strong>Cities:</strong> {template.trip_structure.cities.join(', ')}</p>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  <p><strong>Used:</strong> {template.use_count} times</p>
                  {template.avg_trip_score && (
                    <p><strong>Avg Score:</strong> {template.avg_trip_score}/100</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >Preview</button>
                  <button
                    onClick={() => handleUseTemplate(template._id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >Use Template</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >&times;</button>
              </div>

              <p className="text-gray-600 mb-6">{selectedTemplate.description}</p>

              <div className="mb-6">
                <h3 className="font-bold mb-3">Trip Structure</h3>
                <p className="mb-2"><strong>Duration:</strong> {selectedTemplate.trip_structure.total_days} days</p>
                <p className="mb-4"><strong>Cities:</strong> {selectedTemplate.trip_structure.cities.join(', ')}</p>

                <h4 className="font-semibold mb-2">Churches ({selectedTemplate.trip_structure.churches.length})</h4>
                <div className="space-y-2">
                  {selectedTemplate.trip_structure.churches.map((church, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <p className="font-semibold">{church.church_name}</p>
                      <p className="text-sm text-gray-600">Day {church.day_number} • {church.time_slot} • {church.visit_type}</p>
                      {church.notes && <p className="text-sm text-gray-500 mt-1">{church.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  handleUseTemplate(selectedTemplate._id);
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >Use This Template</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;