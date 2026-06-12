import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import '../../styles/VisitorDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.churchnavigator.com';

const VisitorDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState({
    total_week: 0,
    total_month: 0,
    new_visitors: 0,
    returning_visitors: 0
  });
  const [churches, setChurches] = useState([]);
  const [selectedChurch, setSelectedChurch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrChurch, setQrChurch] = useState(null);

  useEffect(() => {
    fetchChurches();
  }, []);

  useEffect(() => {
    if (selectedChurch) {
      fetchVisitors();
      fetchStats();
    }
  }, [selectedChurch]);

  const fetchChurches = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/churches`);
      setChurches(response.data);
      if (response.data.length > 0) {
        setSelectedChurch(response.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch churches:', err);
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/visitors/church/${selectedChurch}`);
      setVisitors(response.data);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/visitors/stats/${selectedChurch}`);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'First Name', 'Last Name', 'Email', 'Phone', 'First Visit', 'How Heard', 'Wants Followup'];
    const rows = visitors.map(v => [
      new Date(v.visit_date).toLocaleDateString(),
      v.first_name,
      v.last_name,
      v.email,
      v.phone || '',
      v.is_first_visit ? 'Yes' : 'No',
      v.how_heard || '',
      v.wants_followup ? 'Yes' : 'No'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const showQRCode = (church) => {
    setQrChurch(church);
    setShowQRModal(true);
  };

  const selectedChurchData = churches.find(c => c._id === selectedChurch);

  return (
    <div className="visitor-dashboard">
      <div className="dashboard-header">
        <h1>Visitor Dashboard</h1>
        <div className="header-actions">
          <select 
            value={selectedChurch} 
            onChange={(e) => setSelectedChurch(e.target.value)}
            className="church-selector"
          >
            {churches.map(church => (
              <option key={church._id} value={church._id}>{church.name}</option>
            ))}
          </select>
          {selectedChurchData && (
            <button onClick={() => showQRCode(selectedChurchData)} className="btn-qr">
              View QR Code
            </button>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total_week}</div>
          <div className="stat-label">Visitors This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_month}</div>
          <div className="stat-label">Visitors This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.new_visitors}</div>
          <div className="stat-label">First-Time Visitors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.returning_visitors}</div>
          <div className="stat-label">Returning Visitors</div>
        </div>
      </div>

      <div className="dashboard-actions">
        <h2>Recent Visitors</h2>
        <button onClick={exportToCSV} className="btn-export" disabled={visitors.length === 0}>
          Export to CSV
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading visitors...</div>
      ) : visitors.length === 0 ? (
        <div className="no-visitors">No visitors yet. Share your QR code to get started!</div>
      ) : (
        <div className="visitors-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Contact</th>
                <th>First Visit</th>
                <th>How Heard</th>
                <th>Follow Up</th>
                <th>Prayer Request</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map(visitor => (
                <tr key={visitor._id}>
                  <td>{new Date(visitor.visit_date).toLocaleDateString()}</td>
                  <td>
                    {visitor.first_name} {visitor.last_name}
                    {visitor.is_first_visit && <span className="badge-new">NEW</span>}
                  </td>
                  <td>
                    <div>{visitor.email}</div>
                    {visitor.phone && <div className="phone">{visitor.phone}</div>}
                  </td>
                  <td>{visitor.is_first_visit ? 'Yes' : 'No'}</td>
                  <td>{visitor.how_heard || '-'}</td>
                  <td>{visitor.wants_followup ? 'Yes' : 'No'}</td>
                  <td>{visitor.prayer_request ? <span className="has-prayer">✓</span> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showQRModal && qrChurch && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQRModal(false)}>×</button>
            <QRCodeDisplay church={qrChurch} />
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorDashboard;