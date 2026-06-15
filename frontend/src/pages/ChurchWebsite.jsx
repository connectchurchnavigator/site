import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

function ChurchWebsite() {
  const { slug } = useParams();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWebsite = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/website/${slug}`);
        setHtml(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Website not found');
      } finally {
        setLoading(false);
      }
    };
    fetchWebsite();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #9333ea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p>Loading website...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>404</h1>
          <h2 style={{ marginBottom: '20px' }}>Website Not Found</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>{error}</p>
          <a href="/" style={{ background: '#9333ea', color: '#fff', padding: '12px 30px', textDecoration: 'none', borderRadius: '5px', display: 'inline-block' }}>Return to ChurchNavigator</a>
        </div>
      </div>
    );
  }

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export default ChurchWebsite;
