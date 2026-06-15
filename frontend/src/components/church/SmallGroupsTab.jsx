import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  VideoCall as VideoCallIcon,
  Hybrid as HybridIcon,
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsTab = ({ churchSlug }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load small groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (group) => {
    setSelectedGroup(group);
    setJoinDialogOpen(true);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleJoinSubmit = async () => {
    if (!joinForm.name || !joinForm.email) {
      setSubmitError('Name and email are required');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      await axios.post(`${API_URL}/api/small-groups/${selectedGroup._id}/join`, joinForm);
      setSubmitSuccess(true);
      setJoinForm({ name: '', email: '', message: '' });
      setTimeout(() => {
        setJoinDialogOpen(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to send join request');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'online': return <VideoCallIcon />;
      case 'hybrid': return <HybridIcon />;
      default: return <LocationIcon />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress sx={{ color: '#8B7FBF' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (groups.length === 0) {
    return (
      <Box p={3}>
        <Typography variant="body1" color="text.secondary">
          No small groups currently available. Check back soon!
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {groups.map((group) => (
          <Grid item xs={12} md={6} key={group._id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #E8E4F3',
                '&:hover': { boxShadow: '0 4px 12px rgba(139, 127, 191, 0.15)' },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#8B7FBF', fontWeight: 600 }}>
                  {group.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {group.description}
                </Typography>
                
                <Stack spacing={1.5} mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PeopleIcon sx={{ color: '#8B7FBF', fontSize: 20 }} />
                    <Typography variant="body2">
                      Led by {group.leader_name}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ScheduleIcon sx={{ color: '#8B7FBF', fontSize: 20 }} />
                    <Typography variant="body2">
                      {group.meeting_day} at {group.meeting_time} ({group.frequency})
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getLocationIcon(group.location_type)}
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {group.location_type}
                    </Typography>
                  </Box>
                  {group.capacity && (
                    <Typography variant="body2" color="text.secondary">
                      Members: {group.current_members} / {group.capacity}
                    </Typography>
                  )}
                  {group.age_group && (
                    <Typography variant="body2" color="text.secondary">
                      Age Group: {group.age_group}
                    </Typography>
                  )}
                </Stack>

                {group.topics && group.topics.length > 0 && (
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {group.topics.map((topic, idx) => (
                      <Chip
                        key={idx}
                        label={topic}
                        size="small"
                        sx={{
                          backgroundColor: '#F3F0FF',
                          color: '#8B7FBF',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  disabled={!group.is_open_to_join || (group.capacity && group.current_members >= group.capacity)}
                  onClick={() => handleJoinClick(group)}
                  sx={{
                    backgroundColor: '#8B7FBF',
                    '&:hover': { backgroundColor: '#7A6FAF' },
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {!group.is_open_to_join
                    ? 'Not Currently Accepting Members'
                    : group.capacity && group.current_members >= group.capacity
                    ? 'Group Full'
                    : 'Join This Group'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#8B7FBF', fontWeight: 600 }}>
          Join {selectedGroup?.name}
        </DialogTitle>
        <DialogContent>
          {submitSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Your join request has been sent! The group leader will contact you soon.
            </Alert>
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                label="Your Name"
                fullWidth
                required
                value={joinForm.name}
                onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
              />
              <TextField
                label="Your Email"
                type="email"
                fullWidth
                required
                value={joinForm.email}
                onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
              />
              <TextField
                label="Message (Optional)"
                multiline
                rows={4}
                fullWidth
                value={joinForm.message}
                onChange={(e) => setJoinForm({ ...joinForm, message: e.target.value })}
                placeholder="Tell the group leader a bit about yourself..."
              />
              {submitError && <Alert severity="error">{submitError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        {!submitSuccess && (
          <DialogActions>
            <Button onClick={() => setJoinDialogOpen(false)} sx={{ color: '#8B7FBF' }}>
              Cancel
            </Button>
            <Button
              onClick={handleJoinSubmit}
              variant="contained"
              disabled={submitting}
              sx={{
                backgroundColor: '#8B7FBF',
                '&:hover': { backgroundColor: '#7A6FAF' },
              }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Send Request'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
};

export default SmallGroupsTab;
