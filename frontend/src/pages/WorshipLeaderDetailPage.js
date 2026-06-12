import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box, Container, Typography, Chip, Grid, Card, CardMedia, Button,
  Dialog, DialogTitle, DialogContent, TextField, MenuItem, CircularProgress, Alert
} from '@mui/material';
import {
  MusicNote, Group, Language, LocationOn, Event, CheckCircle,
  Facebook, Instagram, YouTube, Email, Phone
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'https://api.churchnavigator.com';

const WorshipLeaderDetailPage = () => {
  const { slug } = useParams();
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    your_name: '', your_email: '', your_phone: '',
    event_type: '', event_date: '', expected_attendance: '', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchLeader = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/worship-leaders/${slug}`);
        setLeader(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load worship leader');
      } finally {
        setLoading(false);
      }
    };
    fetchLeader();
  }, [slug]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await axios.post(`${API_BASE}/api/worship-leaders/enquire`, {
        listing_type: 'worship_leader',
        listing_slug: slug,
        listing_name: leader.name,
        ...bookingForm
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setBookingOpen(false);
        setSubmitSuccess(false);
        setBookingForm({
          your_name: '', your_email: '', your_phone: '',
          event_type: '', event_date: '', expected_attendance: '', message: ''
        });
      }, 2000);
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!leader) return <Container sx={{ py: 4 }}><Alert severity="warning">Worship leader not found</Alert></Container>;

  const isIndividual = leader.leader_type === 'individual';
  const coverImage = leader.cover_image || leader.profile_picture || leader.logo;

  return (
    <>
      <Helmet>
        <title>{leader.name} | Worship Leader | ChurchNavigator</title>
        <meta name="description" content={leader.bio || leader.description || `Book ${leader.name} for worship leading services`} />
      </Helmet>

      {/* Hero Section */}
      <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              {isIndividual ? (
                <Box
                  component="img"
                  src={leader.profile_picture || '/default-avatar.png'}
                  alt={leader.name}
                  sx={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', mx: 'auto', boxShadow: 3 }}
                />
              ) : (
                <Box
                  component="img"
                  src={leader.logo || '/default-team.png'}
                  alt={leader.name}
                  sx={{ width: 200, height: 200, borderRadius: 2, objectFit: 'cover', mx: 'auto', boxShadow: 3 }}
                />
              )}
            </Grid>
            <Grid item xs={12} md={8}>
              <Chip
                label={isIndividual ? 'Individual Artist' : 'Worship Team'}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              />
              <Typography variant="h3" fontWeight="bold" gutterBottom>{leader.name}</Typography>
              {leader.home_church_name && (
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn fontSize="small" /> {leader.home_church_name}, {leader.city}
                </Typography>
              )}
              {leader.years_active > 0 && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {leader.years_active}+ years of worship ministry
                </Typography>
              )}
              {leader.events_done > 0 && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {leader.events_done}+ events led
                </Typography>
              )}
              {leader.verified && (
                <Chip icon={<CheckCircle />} label="Verified" color="success" size="small" sx={{ mr: 1 }} />
              )}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setBookingOpen(true)}
                  disabled={!leader.available_for_booking}
                >
                  {isIndividual ? `Book ${leader.name.split(' ')[0]}` : 'Book This Team'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Cover Image/Slider */}
      {coverImage && leader.cover_type !== 'youtube' && (
        <Box sx={{ width: '100%', height: 400, overflow: 'hidden' }}>
          <Box
            component="img"
            src={coverImage}
            alt="Cover"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      )}

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            {/* About */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>About</Typography>
              <Typography variant="body1" paragraph>
                {isIndividual ? leader.bio : leader.description}
              </Typography>
            </Box>

            {/* Skills & Styles */}
            {leader.instruments?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Instruments</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {leader.instruments.map((inst, i) => (
                    <Chip key={i} icon={<MusicNote />} label={inst} />
                  ))}
                </Box>
              </Box>
            )}

            {leader.worship_styles?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Worship Styles</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {leader.worship_styles.map((style, i) => (
                    <Chip key={i} label={style} />
                  ))}
                </Box>
              </Box>
            )}

            {leader.languages?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Languages</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {leader.languages.map((lang, i) => (
                    <Chip key={i} icon={<Language />} label={lang} />
                  ))}
                </Box>
              </Box>
            )}

            {/* Team Members */}
            {!isIndividual && leader.team_size > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Team Members ({leader.team_size})
                </Typography>
                {leader.member_images?.length > 0 && (
                  <Grid container spacing={2}>
                    {leader.member_images.map((img, i) => (
                      <Grid item xs={6} sm={4} md={3} key={i}>
                        <Box
                          component="img"
                          src={img}
                          alt={`Member ${i + 1}`}
                          sx={{ width: '100%', borderRadius: 2, aspectRatio: '1/1', objectFit: 'cover' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* Gallery */}
            {leader.gallery_images?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Gallery</Typography>
                <Grid container spacing={2}>
                  {leader.gallery_images.map((img, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Card>
                        <CardMedia component="img" height="200" image={img} alt={`Gallery ${i + 1}`} />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Connect</Typography>
              {leader.facebook && (
                <Button
                  startIcon={<Facebook />}
                  href={leader.facebook}
                  target="_blank"
                  fullWidth
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                >
                  Facebook
                </Button>
              )}
              {leader.instagram && (
                <Button
                  startIcon={<Instagram />}
                  href={leader.instagram}
                  target="_blank"
                  fullWidth
                  sx={{ mb: 1, justifyContent: 'flex-start' }}
                >
                  Instagram
                </Button>
              )}
              {leader.youtube && (
                <Button
                  startIcon={<YouTube />}
                  href={leader.youtube}
                  target="_blank"
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  YouTube
                </Button>
              )}
            </Card>

            {leader.home_church_name && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>Home Church</Typography>
                <Typography variant="body2">{leader.home_church_name}</Typography>
                <Typography variant="body2" color="text.secondary">{leader.city}</Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Booking</DialogTitle>
        <DialogContent>
          {submitSuccess ? (
            <Alert severity="success" sx={{ mt: 2 }}>Enquiry submitted! They'll contact you with pricing and availability.</Alert>
          ) : (
            <Box component="form" onSubmit={handleBookingSubmit} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Your Name"
                required
                value={bookingForm.your_name}
                onChange={(e) => setBookingForm({ ...bookingForm, your_name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Your Email"
                type="email"
                required
                value={bookingForm.your_email}
                onChange={(e) => setBookingForm({ ...bookingForm, your_email: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Your Phone"
                value={bookingForm.your_phone}
                onChange={(e) => setBookingForm({ ...bookingForm, your_phone: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                select
                label="Event Type"
                value={bookingForm.event_type}
                onChange={(e) => setBookingForm({ ...bookingForm, event_type: e.target.value })}
                sx={{ mb: 2 }}
              >
                <MenuItem value="Sunday Service">Sunday Service</MenuItem>
                <MenuItem value="Conference">Conference</MenuItem>
                <MenuItem value="Wedding">Wedding</MenuItem>
                <MenuItem value="Concert">Concert</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
              <TextField
                fullWidth
                label="Event Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={bookingForm.event_date}
                onChange={(e) => setBookingForm({ ...bookingForm, event_date: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Expected Attendance"
                type="number"
                value={bookingForm.expected_attendance}
                onChange={(e) => setBookingForm({ ...bookingForm, expected_attendance: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Message"
                multiline
                rows={4}
                required
                value={bookingForm.message}
                onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })}
                sx={{ mb: 2 }}
              />
              {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
              <Button type="submit" variant="contained" fullWidth disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Enquiry'}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorshipLeaderDetailPage;