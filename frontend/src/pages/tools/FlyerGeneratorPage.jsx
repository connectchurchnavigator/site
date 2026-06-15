import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Share2, RefreshCw, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const TEMPLATES = [
  { id: 'bold', name: 'Bold', description: 'High-contrast, vibrant colors' },
  { id: 'minimal', name: 'Minimal', description: 'Clean, simple, elegant' },
  { id: 'elegant', name: 'Elegant', description: 'Sophisticated, professional' },
  { id: 'gospel', name: 'Gospel', description: 'Warm, traditional church style' }
];

export default function FlyerGeneratorPage() {
  const { eventSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState(searchParams.get('template') || 'bold');
  const [htmlContent, setHtmlContent] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

  useEffect(() => {
    if (selectedTemplate) {
      setSearchParams({ template: selectedTemplate });
    }
  }, [selectedTemplate]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/events/${eventSlug}`);
      setEvent(response.data);
    } catch (err) {
      setError('Failed to load event');
    }
  };

  const generateFlyer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/api/tools/flyer-generator/generate/${eventSlug}?template=${selectedTemplate}`
      );
      setHtmlContent(response.data.html_content);
      setShareUrl(response.data.share_url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate flyer');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    window.open(`${API_URL}/api/tools/flyer-generator/pdf/${eventSlug}?template=${selectedTemplate}`, '_blank');
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareWhatsApp = () => {
    const text = `Check out this event: ${event?.name}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Flyer Generator</h1>
          {event && (
            <p className="text-gray-600">Creating flyer for: <span className="font-semibold">{event.name}</span></p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Select Template</h2>
              <div className="space-y-3">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <button
                onClick={generateFlyer}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><RefreshCw className="animate-spin" size={20} /> Generating...</>
                ) : (
                  <><RefreshCw size={20} /> Generate Flyer</>
                )}
              </button>
            </div>

            {htmlContent && (
              <div className="bg-white rounded-lg shadow p-6 space-y-3">
                <h3 className="font-bold text-gray-900 mb-3">Actions</h3>
                <button
                  onClick={downloadPdf}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download PDF
                </button>
                <button
                  onClick={copyShareLink}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  {copied ? <CheckCircle size={18} /> : <Share2 size={18} />}
                  {copied ? 'Copied!' : 'Copy Share Link'}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Share2 size={18} /> Share on WhatsApp
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Preview</h2>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}
              {htmlContent ? (
                <div className="border rounded-lg overflow-hidden" style={{ height: '800px' }}>
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-full"
                    title="Flyer Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">Select a template and click Generate to preview your flyer</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}