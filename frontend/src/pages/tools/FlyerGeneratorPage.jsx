import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiDownload, FiShare2, FiRefreshCw, FiCopy } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const TEMPLATES = [
  { id: 'bold', name: 'Bold', description: 'Vibrant and energetic', color: 'bg-red-500' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and modern', color: 'bg-gray-400' },
  { id: 'elegant', name: 'Elegant', description: 'Sophisticated design', color: 'bg-purple-600' },
  { id: 'gospel', name: 'Gospel', description: 'Traditional church', color: 'bg-amber-600' }
];

function FlyerGeneratorPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState('bold');
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateFlyer = async (template) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_BASE}/api/tools/flyer-generator/generate/${eventSlug}`,
        { template }
      );
      setHtmlContent(response.data.html_content);
      setShareUrl(response.data.share_url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate flyer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventSlug) {
      generateFlyer(selectedTemplate);
    }
  }, [eventSlug]);

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Check out this event flyer: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!eventSlug) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Flyer Generator</h1>
          <p className="text-gray-600">Please select an event to generate a flyer.</p>
          <button
            onClick={() => navigate('/events')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Event Flyer Generator</h1>
          <p className="text-gray-600">Create beautiful flyers for your event in seconds</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Choose Template</h2>
              <div className="space-y-3">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateChange(template.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded ${template.color}`} />
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 space-y-3">
              <button
                onClick={handleDownloadPDF}
                disabled={!htmlContent || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FiDownload /> Download PDF
              </button>
              <button
                onClick={handleCopyLink}
                disabled={!shareUrl || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FiCopy /> {copied ? 'Copied!' : 'Copy Share Link'}
              </button>
              <button
                onClick={handleWhatsApp}
                disabled={!shareUrl || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FaWhatsapp /> Share on WhatsApp
              </button>
              <button
                onClick={() => generateFlyer(selectedTemplate)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Regenerate
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : htmlContent ? (
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-[800px]"
                    title="Flyer Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  Select a template to generate your flyer
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlyerGeneratorPage;