import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminModerationPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AdminModerationPage = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const listingTypes = [
    { key: 'all', label: 'All' },
    { key: 'church', label: 'Churches' },
    { key: 'pastor', label: 'Pastors' },
    { key: 'worship_leader', label: 'Worship Leaders' },
    { key: 'media_team', label: 'Media Teams' },
    { key: 'event', label: 'Events' },
    { key: 'bible_college', label: 'Bible Colleges' }
  ];

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const response = await axios.get(`${API_URL}/api/admin/moderation-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setQueue(response.data.queue);
      setLoading(false);
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Admin access required');
        navigate('/');
      } else {
        console.error('Failed to fetch queue:', error);
        setLoading(false);
      }
    }
  };

  const handleApprove = async (listing) => {
    if (!confirm(`Approve ${listing.name}?`)) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/admin/moderation/${listing.type}/${listing.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setQueue(prev => prev.filter(item => item.id !== listing.id));
      alert('Listing approved successfully');
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve listing');
    }
    setProcessing(false);
  };

  const handleRejectClick = (listing) => {
    setSelectedListing(listing);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/admin/moderation/${selectedListing.type}/${selectedListing.id}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setQueue(prev => prev.filter(item => item.id !== selectedListing.id));
      setRejectModalOpen(false);
      alert('Listing rejected successfully');
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject listing');
    }
    setProcessing(false);
  };

  const filteredQueue = activeTab === 'all' 
    ? queue 
    : queue.filter(item => item.type === activeTab);

  const getCountForType = (type) => {
    if (type === 'all') return queue.length;
    return queue.filter(item => item.type === type).length;
  };

  if (loading) {
    return <div className="admin-moderation-page"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="admin-moderation-page">
      <div className="moderation-header">
        <h1>Moderation Queue</h1>
        <p>{queue.length} pending listings</p>
      </div>

      <div className="moderation-tabs">
        {listingTypes.map(type => (
          <button
            key={type.key}
            className={`tab ${activeTab === type.key ? 'active' : ''}`}
            onClick={() => setActiveTab(type.key)}
          >
            {type.label}
            {getCountForType(type.key) > 0 && (
              <span className="badge">{getCountForType(type.key)}</span>
            )}
          </button>
        ))}
      </div>

      <div className="moderation-queue">
        {filteredQueue.length === 0 ? (
          <div className="empty-state">No pending listings</div>
        ) : (
          filteredQueue.map(listing => (
            <div key={listing.id} className="listing-card">
              {listing.image && (
                <img src={listing.image} alt={listing.name} className="listing-image" />
              )}
              <div className="listing-content">
                <div className="listing-header">
                  <h3>{listing.name}</h3>
                  <span className="listing-type-badge">{listing.type.replace('_', ' ')}</span>
                </div>
                {listing.location && <p className="listing-location">📍 {listing.location}</p>}
                {listing.denomination && <p className="listing-denomination">{listing.denomination}</p>}
                {listing.preview_data?.description && (
                  <p className="listing-description">{listing.preview_data.description}</p>
                )}
                <div className="listing-meta">
                  <p>Submitted by: <strong>{listing.submitter_name}</strong> ({listing.submitter_email})</p>
                  <p>Date: {new Date(listing.created_at).toLocaleDateString()}</p>
                </div>
                {listing.preview_data?.website && (
                  <p>Website: <a href={listing.preview_data.website} target="_blank" rel="noopener noreferrer">
                    {listing.preview_data.website}
                  </a></p>
                )}
                <div className="listing-actions">
                  <button 
                    className="approve-btn" 
                    onClick={() => handleApprove(listing)}
                    disabled={processing}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    className="reject-btn" 
                    onClick={() => handleRejectClick(listing)}
                    disabled={processing}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {rejectModalOpen && (
        <div className="modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Reject Listing</h2>
            <p>Listing: <strong>{selectedListing?.name}</strong></p>
            <label>Reason for rejection:</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this listing is being rejected..."
              rows={5}
            />
            <div className="modal-actions">
              <button onClick={() => setRejectModalOpen(false)} disabled={processing}>
                Cancel
              </button>
              <button 
                className="reject-confirm-btn" 
                onClick={handleRejectSubmit}
                disabled={processing}
              >
                Reject Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModerationPage;
