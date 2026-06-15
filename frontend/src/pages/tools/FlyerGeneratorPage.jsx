import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { Loader2, Download, Link as LinkIcon, Share2, RefreshCw } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const TEMPLATES = [
  { id: 'bold', name: 'Bold', description: 'Modern high-contrast design', color: '#5B21B6' },
  { id: 'minimal', name: 'Minimal', description: 'Clean elegant simplicity', color: '#1E293B' },
  { id: 'elegant', name: 'Elegant', description: 'Sophisticated formal style', color: '#881337' },
  { id: 'gospel', name: 'Gospel', description: 'Traditional warm tones', color: '#EA580C' }
];

const FlyerGeneratorPage = () => {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState('bold');
  const [loading, setLoading] = useState(false);
  const [flyerData, setFlyerData] = useState(null);
  const [error, setError] = useState(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (eventSlug) {
      generateFlyer(selectedTemplate);
    }
  }, [eventSlug]);

  const generateFlyer = async (template) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_BASE}/api/tools/flyer-generator/generate/${eventSlug}`,
        { template }
      );
      setFlyerData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate flyer');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (template) => {
    setSelectedTemplate(template);
    generateFlyer(template);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/tools/flyer-generator/pdf/${eventSlug}?template=${selectedTemplate}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${eventSlug}-flyer.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download PDF');
    }
  };

  const handleCopyLink = async () => {
    if (!flyerData) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(flyerData.share_url);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
      setCopying(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!flyerData) return;
    const text = encodeURIComponent(`Check out this event flyer: ${flyerData.share_url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!eventSlug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Flyer Generator</h1>
          <p className="text-gray-600 mb-6">Please select an event to generate a flyer</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Flyer Generator - ChurchNavigator</title>
        <meta name="description" content="Generate beautiful event flyers powered by AI" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Flyer Generator</h1>
            <p className="text-gray-600">Create stunning flyers for your event in seconds</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h2>
                <div className="space-y-3">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg"
                          style={{ backgroundColor: template.color }}
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{template.name}</div>
                          <div className="text-sm text-gray-600">{template.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {flyerData && (
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Download size={20} />
                    Download PDF
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copying ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <LinkIcon size={20} />
                        Copy Share Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Share2 size={20} />
                    Share on WhatsApp
                  </button>

                  <button
                    onClick={() => generateFlyer(selectedTemplate)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={20} />
                    Regenerate
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <Loader2 size={48} className="animate-spin text-purple-600" />
                  </div>
                ) : flyerData ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={flyerData.html_content}
                      className="w-full"
                      style={{ height: '842px' }}
                      title="Flyer Preview"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    Select a template to generate your flyer
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FlyerGeneratorPage;
