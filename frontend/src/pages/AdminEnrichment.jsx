import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const AdminEnrichment = () => {
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/enrich/jobs`);
      setJobs(res.data.jobs);
    } catch (err) {
      console.error('Failed to load jobs', err);
    }
  };

  const startEnrichment = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await axios.post(`${API_BASE}/api/admin/enrich/run`);
      setSuccess(`Batch started: ${res.data.churches_processing} churches, ${res.data.total_requests} requests`);
      setCurrentBatch(res.data.batch_id);
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start enrichment');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (batchId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/enrich/status/${batchId}`);
      setSuccess(`Status: ${res.data.status} | Succeeded: ${res.data.request_counts.succeeded} | Errored: ${res.data.request_counts.errored}`);
      await loadJobs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to check status');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '30px' }}>AI Church Enrichment</h1>
      
      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fee', color: '#c00', borderRadius: '5px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ padding: '15px', backgroundColor: '#efe', color: '#060', borderRadius: '5px', marginBottom: '20px' }}>
          {success}
        </div>
      )}
      
      <div style={{ marginBottom: '40px', padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '15px' }}>Run New Enrichment Batch</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Process up to 500 churches with missing or incomplete descriptions. AI will generate:
        </p>
        <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#666' }}>
          <li>Welcoming 2-paragraph descriptions</li>
          <li>Punchy taglines (max 10 words)</li>
          <li>SEO meta descriptions (155 chars)</li>
          <li>Expanded ministry descriptions</li>
        </ul>
        <button
          onClick={startEnrichment}
          disabled={loading}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Starting...' : 'Start AI Enrichment'}
        </button>
      </div>
      
      <div>
        <h2 style={{ marginBottom: '20px' }}>Batch Jobs History</h2>
        {jobs.length === 0 ? (
          <p style={{ color: '#999' }}>No batch jobs yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Batch ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Churches</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Enriched</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Created</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.batch_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
                    {job.batch_id.substring(0, 20)}...
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: job.status === 'completed' ? '#d4edda' : job.status === 'error' ? '#f8d7da' : '#fff3cd',
                      color: job.status === 'completed' ? '#155724' : job.status === 'error' ? '#721c24' : '#856404'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{job.church_count}</td>
                  <td style={{ padding: '12px' }}>{job.enriched_count || 0}</td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => checkStatus(job.batch_id)}
                      style={{
                        padding: '6px 15px',
                        fontSize: '14px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Check Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminEnrichment;
