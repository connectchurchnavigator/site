import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const VisitRequestResponse = () => {
  const { requestId, action } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState({
    status: action || 'confirmed',
    alternative_date: '',
    alternative_time: '',
    notes: ''
  });

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const res = await api.get(`/planner/requests/${requestId}`);
      setRequest(res.data.request);
      if (action) {
        setResponse({ ...response, status: action });
      }
    } catch (error) {
      console.error('Failed to load request:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    setSubmitting(true);
    try {
      await api.post(`/planner/requests/${requestId}/respond`, response);
      alert('Response submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to submit response:', error);
      alert('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-600">Request not found</p>
      </div>
    );
  }

  if (request.status !== 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Already Responded</h2>
          <p className="text-yellow-700">This visit request has already been {request.status}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Visit Request Response</h1>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-lg text-gray-900 mb-2">Visit Request Details</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Visitor:</strong> {request.visitor_name}</p>
            <p><strong>Role:</strong> {request.visitor_role}</p>
            <p><strong>From:</strong> {request.visitor_from}</p>
            <p><strong>Requested Date:</strong> {new Date(request.requested_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Requested Time:</strong> {request.requested_time}</p>
            <p><strong>Duration:</strong> {request.duration_minutes} minutes</p>
            {request.message && (
              <div className="mt-3 bg-white p-3 rounded">
                <p className="font-medium">Message:</p>
                <p className="text-gray-600 mt-1">{request.message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Coordinator Contact</h3>
          <p className="text-gray-700">{request.coordinator_name}</p>
          <p className="text-gray-600">{request.coordinator_email}</p>
          <p className="text-gray-600">{request.coordinator_phone}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="status"
                  value="confirmed"
                  checked={response.status === 'confirmed'}
                  onChange={(e) => setResponse({ ...response, status: e.target.value })}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">✓ Confirm Visit</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="status"
                  value="declined"
                  checked={response.status === 'declined'}
                  onChange={(e) => setResponse({ ...response, status: e.target.value })}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">✗ Decline Visit</span>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="status"
                  value="alternative"
                  checked={response.status === 'alternative'}
                  onChange={(e) => setResponse({ ...response, status: e.target.value })}
                  className="h-4 w-4 text-blue-600"
                />
                <span className="font-medium">↻ Suggest Alternative Time</span>
              </label>
            </div>
          </div>

          {response.status === 'alternative' && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Date</label>
                <input
                  type="date"
                  value={response.alternative_date}
                  onChange={(e) => setResponse({ ...response, alternative_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Time</label>
                <input
                  type="time"
                  value={response.alternative_time}
                  onChange={(e) => setResponse({ ...response, alternative_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={response.notes}
              onChange={(e) => setResponse({ ...response, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional comments or information..."
            />
          </div>

          <button
            onClick={submitResponse}
            disabled={submitting || (response.status === 'alternative' && (!response.alternative_date || !response.alternative_time))}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? 'Submitting...' : 'Submit Response'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisitRequestResponse;
