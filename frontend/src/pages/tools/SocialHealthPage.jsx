import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Instagram,
  Facebook,
  YouTube,
  ArrowBack,
  CheckCircle,
  TrendingUp,
  Schedule,
  VerifiedUser
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const platformConfig = {
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2' },
  youtube: { name: 'YouTube', icon: YouTube, color: '#FF0000' },
  tiktok: { name: 'TikTok', icon: null, color: '#000000' }
};

const ScoreGauge = ({ score, label }) => {
  const getColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={score}
          size={180}
          thickness={6}
          sx={{ color: getColor(score) }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}
        >
          <Typography variant="h2" component="div" sx={{ fontWeight: 700, color: getColor(score) }}>
            {Math.round(score)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const MetricCard = ({ title, score, icon: Icon, benchmark }) => {
  const getColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  return (
    <Card sx={{ height: '100%', bgcolor: '#f9f7ff' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Icon sx={{ mr: 1, color: '#7c3aed' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" sx={{ color: getColor(score), fontWeight: 700, mb: 1 }}>
          {Math.round(score)}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#e0e0e0',
            '& .MuiLinearProgress-bar': { bgcolor: getColor(score) }
          }}
        />
        {benchmark && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {benchmark}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default function SocialHealthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const [formData, setFormData] = useState({
    follower_count: '',
    posts_per_week: '',
    avg_likes: '',
    avg_comments: '',
    avg_shares: '',
    last_post_days_ago: '',
    has_stories: false,
    has_reels: false,
    profile_complete: false,
    link_in_bio: false
  });

  const handlePlatformSelect = (selectedPlatform) => {
    setPlatform(selectedPlatform);
    setStep(2);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnalyse = async () => {
    setLoading(true);
    setError('');

    try {
      const churchId = localStorage.getItem('church_id');
      const token = localStorage.getItem('token');

      if (!churchId || !token) {
        setError('Please log in to use this tool');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/tools/social-health/analyse`,
        {
          church_id: churchId,
          platform,
          follower_count: parseInt(formData.follower_count) || 0,
          posts_per_week: parseFloat(formData.posts_per_week) || 0,
          avg_likes: parseFloat(formData.avg_likes) || 0,
          avg_comments: parseFloat(formData.avg_comments) || 0,
          avg_shares: parseFloat(formData.avg_shares) || 0,
          last_post_days_ago: parseInt(formData.last_post_days_ago) || 0,
          has_stories: formData.has_stories,
          has_reels: formData.has_reels,
          profile_complete: formData.profile_complete,
          link_in_bio: formData.link_in_bio
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResults(response.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPlatform('');
    setFormData({
      follower_count: '',
      posts_per_week: '',
      avg_likes: '',
      avg_comments: '',
      avg_shares: '',
      last_post_days_ago: '',
      has_stories: false,
      has_reels: false,
      profile_complete: false,
      link_in_bio: false
    });
    setResults(null);
    setError('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/dashboard/tools')}
        sx={{ mb: 3, color: '#7c3aed' }}
      >
        Back to Tools
      </Button>

      <Paper elevation={3} sx={{ p: 4, bgcolor: '#ffffff', borderRadius: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#7c3aed', mb: 1 }}>
          Social Media Health Check
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Get AI-powered insights and recommendations for your church's social media presence
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Select a platform to analyse:
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(platformConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={key}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handlePlatformSelect(key)}
                      sx={{
                        height: 120,
                        flexDirection: 'column',
                        gap: 1,
                        borderColor: config.color,
                        color: config.color,
                        '&:hover': {
                          borderColor: config.color,
                          bgcolor: `${config.color}15`
                        }
                      }}
                    >
                      {Icon && <Icon sx={{ fontSize: 48 }} />}
                      <Typography variant="h6">{config.name}</Typography>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Chip
                label={platformConfig[platform].name}
                sx={{ bgcolor: platformConfig[platform].color, color: 'white', mr: 2 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Enter your stats
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Follower Count"
                  type="number"
                  value={formData.follower_count}
                  onChange={(e) => handleInputChange('follower_count', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Posts per Week"
                  type="number"
                  value={formData.posts_per_week}
                  onChange={(e) => handleInputChange('posts_per_week', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Average Likes per Post"
                  type="number"
                  value={formData.avg_likes}
                  onChange={(e) => handleInputChange('avg_likes', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Average Comments per Post"
                  type="number"
                  value={formData.avg_comments}
                  onChange={(e) => handleInputChange('avg_comments', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Average Shares per Post"
                  type="number"
                  value={formData.avg_shares}
                  onChange={(e) => handleInputChange('avg_shares', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Days Since Last Post"
                  type="number"
                  value={formData.last_post_days_ago}
                  onChange={(e) => handleInputChange('last_post_days_ago', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Profile Features:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_stories}
                          onChange={(e) => handleInputChange('has_stories', e.target.checked)}
                        />
                      }
                      label="Has Stories"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.has_reels}
                          onChange={(e) => handleInputChange('has_reels', e.target.checked)}
                        />
                      }
                      label="Has Reels/Videos"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.profile_complete}
                          onChange={(e) => handleInputChange('profile_complete', e.target.checked)}
                        />
                      }
                      label="Profile Complete"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.link_in_bio}
                          onChange={(e) => handleInputChange('link_in_bio', e.target.checked)}
                        />
                      }
                      label="Link in Bio"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button onClick={() => setStep(1)} variant="outlined">
                Back
              </Button>
              <Button
                onClick={handleAnalyse}
                variant="contained"
                disabled={loading || !formData.follower_count || !formData.posts_per_week}
                sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
              >
                {loading ? <CircularProgress size={24} /> : 'Analyse'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 3 && results && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Chip
                label={platformConfig[platform].name}
                sx={{ bgcolor: platformConfig[platform].color, color: 'white', mr: 2 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Analysis Results
              </Typography>
            </Box>

            <ScoreGauge score={results.overall_score} label="Overall Health Score" />

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Engagement"
                  score={results.engagement_score}
                  icon={TrendingUp}
                  benchmark={`${results.engagement_rate}% engagement rate`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Posting"
                  score={results.posting_score}
                  icon={Schedule}
                  benchmark="Consistency matters"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Recency"
                  score={results.recency_score}
                  icon={CheckCircle}
                  benchmark="Stay active"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <MetricCard
                  title="Profile"
                  score={results.profile_score}
                  icon={VerifiedUser}
                  benchmark="Completeness"
                />
              </Grid>
            </Grid>

            {results.benchmarks && results.benchmarks.sample_size > 0 && (
              <Paper sx={{ p: 3, mb: 4, bgcolor: '#f9f7ff' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Benchmark Comparison
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Compared to {results.benchmarks.sample_size} similar {results.benchmarks.denomination} churches
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Your Engagement: <strong>{results.engagement_rate}%</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average: {results.benchmarks.avg_engagement_rate}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Your Posts/Week: <strong>{formData.posts_per_week}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average: {results.benchmarks.avg_posts_per_week}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Paper sx={{ p: 3, bgcolor: '#f0fdf4', border: '1px solid #86efac' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#166534' }}>
                AI Recommendations
              </Typography>
              {results.recommendations.map((rec, index) => (
                <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, mr: 1, color: '#166534' }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body1">{rec}</Typography>
                </Box>
              ))}
            </Paper>

            <Box sx={{ mt: 4 }}>
              <Button
                onClick={resetForm}
                variant="contained"
                sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
              >
                Check Another Platform
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
