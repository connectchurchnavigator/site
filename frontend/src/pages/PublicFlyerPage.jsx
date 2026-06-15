import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

export default function PublicFlyerPage() {
  const { eventSlug } = useParams();
  const [searchParams] = useSearchParams();
  const template = searchParams.get('template') || 'bold';
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFlyer();
  }, [eventSlug, template]);

  const fetchFlyer = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/tools/flyer-generator/share/${eventSlug}?template=${template}`
      );
      setHtmlContent(response.data);
    } catch (err) {
      setError('Flyer not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading flyer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Flyer Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
}