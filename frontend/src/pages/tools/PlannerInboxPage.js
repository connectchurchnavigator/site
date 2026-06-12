import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Container, Row, Col, Card, Badge, Button, Dropdown, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { FaChurch, FaMapMarkerAlt, FaUsers, FaClock, FaRoute, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const PlannerInboxPage = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('ai_score');
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [alternativeDates, setAlternativeDates] = useState('');

  useEffect(() => {
    if (user?.pastor_id) {
      loadInvitations();
      loadTrips();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/planner/invitations`, {
        params: { pastor_id: user.pastor_id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const invitationsWithScores = await Promise.all(
        res.data.invitations.map(async (inv) => {
          if (!inv.ai_priority_score) {
            try {
              const scoreRes = await axios.post(
                `${API_BASE}/api/planner/invitations/${inv._id}/score`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
              );
              return { ...inv, ai_priority_score: scoreRes.data.total_score, ai_score_breakdown: scoreRes.data };
            } catch (err) {
              return inv;
            }
          }
          return inv;
        })
      );
      
      setInvitations(invitationsWithScores);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/planner/trips`, {
        params: { pastor_id: user.pastor_id },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTrips(res.data.trips || []);
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  };

  const respondToInvitation = async (invitationId, status) => {
    try {
      await axios.patch(
        `${API_BASE}/api/planner/invitations/${invitationId}/respond`,
        {
          status,
          response_message: responseMessage,
          alternative_dates: alternativeDates ? alternativeDates.split(',').map(d => d.trim()) : null
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      loadInvitations();
      setSelectedInvitation(null);
      setResponseMessage('');
      setAlternativeDates('');
    } catch (err) {
      alert('Failed to respond: ' + (err.response?.data?.detail || err.message));
    }
  };

  const addToTrip = async () => {
    if (!selectedTrip || !selectedInvitation) return;
    
    try {
      await axios.patch(
        `${API_BASE}/api/planner/invitations/${selectedInvitation._id}/assign-trip`,
        { trip_id: selectedTrip },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setShowTripModal(false);
      setSelectedTrip('');
      loadInvitations();
      alert('Invitation added to trip successfully!');
    } catch (err) {
      alert('Failed to add to trip: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getPriorityBadge = (score) => {
    if (!score) return <Badge bg="secondary">Not Scored</Badge>;
    if (score >= 80) return <Badge bg="success">🟢 High Priority</Badge>;
    if (score >= 60) return <Badge bg="primary">🔵 Good Fit</Badge>;
    if (score >= 40) return <Badge bg="warning">🟡 Worth Considering</Badge>;
    return <Badge bg="light" text="dark">⚪ Low Priority</Badge>;
  };

  const filteredInvitations = invitations
    .filter(inv => {
      if (filter === 'all') return true;
      if (filter === 'high') return inv.ai_priority_score >= 80;
      return inv.status === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'ai_score') return (b.ai_priority_score || 0) - (a.ai_priority_score || 0);
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'congregation') {
        const sizeA = a.church_details?.congregation_size || 0;
        const sizeB = b.church_details?.congregation_size || 0;
        return sizeB - sizeA;
      }
      return 0;
    });

  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-3">Loading invitations...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Minister Visit Inbox</h1>
          <p className="text-muted">
            You have <strong>{pendingCount}</strong> pending invitation{pendingCount !== 1 ? 's' : ''}
          </p>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-3">
        <Col md={6}>
          <div className="d-flex gap-2">
            <Button variant={filter === 'all' ? 'primary' : 'outline-primary'} onClick={() => setFilter('all')}>
              All ({invitations.length})
            </Button>
            <Button variant={filter === 'high' ? 'success' : 'outline-success'} onClick={() => setFilter('high')}>
              High Priority ({invitations.filter(i => i.ai_priority_score >= 80).length})
            </Button>
            <Button variant={filter === 'pending' ? 'warning' : 'outline-warning'} onClick={() => setFilter('pending')}>
              Pending ({pendingCount})
            </Button>
            <Button variant={filter === 'accepted' ? 'info' : 'outline-info'} onClick={() => setFilter('accepted')}>
              Accepted ({invitations.filter(i => i.status === 'accepted').length})
            </Button>
          </div>
        </Col>
        <Col md={6} className="text-end">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary">
              Sort: {sortBy === 'ai_score' ? 'AI Score' : sortBy === 'date' ? 'Date' : 'Congregation Size'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setSortBy('ai_score')}>AI Score</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortBy('date')}>Date Received</Dropdown.Item>
              <Dropdown.Item onClick={() => setSortBy('congregation')}>Congregation Size</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {filteredInvitations.length === 0 ? (
        <Alert variant="info">No invitations found matching your filters.</Alert>
      ) : (
        <Row>
          {filteredInvitations.map(inv => (
            <Col md={6} lg={4} key={inv._id} className="mb-4">
              <Card className="h-100 shadow-sm">
                {inv.church_details?.image && (
                  <Card.Img variant="top" src={inv.church_details.image} style={{ height: '200px', objectFit: 'cover' }} />
                )}
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="mb-0">{inv.from_church_name}</h5>
                    {getPriorityBadge(inv.ai_priority_score)}
                  </div>
                  
                  {inv.ai_priority_score && (
                    <div className="mb-2">
                      <small className="text-muted">AI Score: {inv.ai_priority_score}/100</small>
                    </div>
                  )}

                  <div className="mb-2">
                    <FaMapMarkerAlt className="me-2" />
                    <small>{inv.church_details?.location || 'Location not available'}</small>
                  </div>

                  {inv.church_details?.congregation_size && (
                    <div className="mb-2">
                      <FaUsers className="me-2" />
                      <small>Congregation: {inv.church_details.congregation_size}</small>
                    </div>
                  )}

                  <div className="mb-2">
                    <FaCalendarAlt className="me-2" />
                    <small>Proposed: {inv.proposed_dates?.join(', ') || 'Flexible'}</small>
                  </div>

                  <div className="mb-2">
                    <FaClock className="me-2" />
                    <small>Slot: {inv.preferred_slot}</small>
                  </div>

                  {inv.message && (
                    <Card.Text className="mt-3 small text-muted" style={{ fontStyle: 'italic' }}>
                      "{inv.message}"
                    </Card.Text>
                  )}

                  {inv.ai_score_breakdown?.recommendation && (
                    <Alert variant="info" className="mt-3 py-2 small">
                      <strong>AI Recommendation:</strong> {inv.ai_score_breakdown.recommendation}
                    </Alert>
                  )}

                  <Badge bg={inv.status === 'pending' ? 'warning' : inv.status === 'accepted' ? 'success' : 'secondary'} className="mb-3">
                    {inv.status.toUpperCase()}
                  </Badge>

                  {inv.status === 'pending' && (
                    <div className="d-grid gap-2">
                      <Button variant="success" size="sm" onClick={() => respondToInvitation(inv._id, 'accepted')}>
                        Accept
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => {
                        setSelectedInvitation(inv);
                        setShowTripModal(true);
                      }}>
                        Add to Plan
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setSelectedInvitation(inv)}>
                        Propose Alternative
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => respondToInvitation(inv._id, 'declined')}>
                        Decline
                      </Button>
                    </div>
                  )}

                  {inv.status === 'accepted' && inv.trip_id && (
                    <Alert variant="success" className="mt-2 py-2 small mb-0">
                      ✓ Added to trip
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={!!selectedInvitation && !showTripModal} onHide={() => setSelectedInvitation(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Propose Alternative</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Alternative Dates (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="2026-06-15, 2026-06-22"
                value={alternativeDates}
                onChange={(e) => setAlternativeDates(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedInvitation(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => respondToInvitation(selectedInvitation._id, 'alternative')}>
            Send Alternative
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showTripModal} onHide={() => setShowTripModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add to Trip</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Select Trip</Form.Label>
            <Form.Select value={selectedTrip} onChange={(e) => setSelectedTrip(e.target.value)}>
              <option value="">Choose a trip...</option>
              {trips.map(trip => (
                <option key={trip._id} value={trip._id}>
                  {trip.name} - {trip.start_date} to {trip.end_date}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          {trips.length === 0 && (
            <Alert variant="warning" className="mt-3">No trips found. Create a trip first.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTripModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={addToTrip} disabled={!selectedTrip}>
            Add to Trip
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PlannerInboxPage;