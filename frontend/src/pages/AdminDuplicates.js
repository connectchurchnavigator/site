import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const ADMIN_API_KEY = process.env.REACT_APP_ADMIN_API_KEY || 'dev-admin-key';

function AdminDuplicates() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [scanning, setScanning] = useState(false);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/duplicates`, {
        params: { status },
        headers: { 'X-API-Key': ADMIN_API_KEY }
      });
      setDuplicates(response.data.duplicates);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
      alert('Failed to load duplicates');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDuplicates();
  }, [status]);

  const handleMerge = async (flagId, primaryId, duplicateId, primaryName, dupName) => {
    if (!window.confirm(`Merge "${dupName}" into "${primaryName}"?`)) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/duplicates/${flagId}/merge`,
        { primary_id: primaryId, duplicate_id: duplicateId },
        { headers: { 'X-API-Key': ADMIN_API_KEY } }
      );
      alert('Merged successfully');
      fetchDuplicates();
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Merge failed');
    }
  };

  const handleDismiss = async (flagId) => {
    if (!window.confirm('Mark as not duplicate?')) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/duplicates/${flagId}/dismiss`,
        {},
        { headers: { 'X-API-Key': ADMIN_API_KEY } }
      );
      alert('Dismissed');
      fetchDuplicates();
    } catch (error) {
      console.error('Dismiss failed:', error);
      alert('Dismiss failed');
    }
  };

  const handleRunScan = async () => {
    if (!window.confirm('Run deduplication scan? This may take a few minutes.')) return;

    setScanning(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/dedup/run`,
        {},
        { headers: { 'X-API-Key': ADMIN_API_KEY } }
      );
      alert('Scan completed');
      fetchDuplicates();
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed');
    }
    setScanning(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Duplicate Church Listings</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '8px', fontSize: '14px' }}>
          <option value="pending">Pending Review</option>
          <option value="merged">Merged</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: scanning ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {scanning ? 'Scanning...' : 'Run Dedup Scan'}
        </button>

        <span style={{ marginLeft: '10px', color: '#666' }}>
          {duplicates.length} {status} duplicate{duplicates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : duplicates.length === 0 ? (
        <p>No {status} duplicates found</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {duplicates.map((dup) => (
            <div key={dup._id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#f9f9f9' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ fontSize: '16px', color: '#d9534f' }}>Confidence: {dup.score}%</strong>
                <span style={{ marginLeft: '15px', color: '#666' }}>
                  Detected: {new Date(dup.detected_at).toLocaleDateString()}
                </span>
              </div>

              <div style={{ marginBottom: '10px', color: '#555' }}>
                <strong>Reasons:</strong> {dup.reasons.join(', ')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
                <ChurchCard church={dup.church1} label="Church 1" />
                <ChurchCard church={dup.church2} label="Church 2" />
              </div>

              {status === 'pending' && (
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleMerge(dup._id, dup.church1._id, dup.church2._id, dup.church1.name, dup.church2.name)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Merge into Church 1
                  </button>
                  <button
                    onClick={() => handleMerge(dup._id, dup.church2._id, dup.church1._id, dup.church2.name, dup.church1.name)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Merge into Church 2
                  </button>
                  <button
                    onClick={() => handleDismiss(dup._id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Not a Duplicate
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChurchCard({ church, label }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '15px', backgroundColor: 'white' }}>
      <h3 style={{ marginTop: 0, fontSize: '18px' }}>{label}</h3>
      <p style={{ margin: '5px 0' }}><strong>{church.name}</strong></p>
      {church.phone && <p style={{ margin: '5px 0' }}>📞 {church.phone}</p>}
      {church.email && <p style={{ margin: '5px 0' }}>✉️ {church.email}</p>}
      {church.address_line1 && (
        <p style={{ margin: '5px 0' }}>📍 {church.address_line1}, {church.city} {church.postcode}</p>
      )}
      {church.denomination && <p style={{ margin: '5px 0' }}>⛪ {church.denomination}</p>}
      {church.latitude && church.longitude && (
        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
          Coordinates: {church.latitude.toFixed(5)}, {church.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}

export default AdminDuplicates;