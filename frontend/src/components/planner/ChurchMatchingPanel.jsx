import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Collapse,
  LinearProgress,
  Alert,
  Radar,
} from '@mui/material';
import {
  TrendingUp,
  ExpandMore,
  ExpandLess,
  Add,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';

const ChurchMatchingPanel = ({ tripId, onAddChurch }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedChurch, setExpandedChurch] = useState(null);

  useEffect(() => {
    loadMatches();
  }, [tripId]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/planner/${tripId}/match-churches`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Failed to load church matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'success' };
    if (score >= 70) return { label: 'Good', color: 'primary' };
    return { label: 'Fair', color: 'default' };
  };

  const RadarChart = ({ dimensions }) => {
    const data = [
      dimensions.denominational_fit,
      dimensions.audience_match,
      dimensions.need_alignment,
      dimensions.practical_fit,
      dimensions.relationship_potential,
      dimensions.impact_score,
      dimensions.history_score,
    ];
    const labels = ['Denom', 'Audience', 'Need', 'Practical', 'Relation', 'Impact', 'History'];
    
    return (
      <Box sx={{ textAlign: 'center', my: 2 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          <polygon
            points={data
              .map((v, i) => {
                const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
                const r = (v / 100) * 80;
                return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
              })
              .join(' ')}
            fill="rgba(25, 118, 210, 0.3)"
            stroke="#1976d2"
            strokeWidth="2"
          />
          {labels.map((label, i) => {
            const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
            return (
              <text
                key={i}
                x={100 + 95 * Math.cos(angle)}
                y={100 + 95 * Math.sin(angle)}
                fontSize="10"
                textAnchor="middle"
                fill="#666"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>AI is analyzing church matches...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
        AI Church Matching
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {matches.length} churches analyzed and ranked by compatibility
      </Typography>

      <Grid container spacing={2}>
        {matches.map((match) => {
          const badge = getMatchBadge(match.overall_match_score);
          const isExpanded = expandedChurch === match.church_id;

          return (
            <Grid item xs={12} key={match.church_id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">{match.church_name}</Typography>
                      <Chip label={`${match.overall_match_score}% Match`} color={badge.color} size="small" sx={{ mr: 1 }} />
                      <Chip label={badge.label} color={badge.color} variant="outlined" size="small" />
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => onAddChurch(match.church_id)}
                    >
                      Add to Trip
                    </Button>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {match.ai_reasoning}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip icon={<CheckCircle />} label={`Est. ${match.estimated_attendance} attendance`} size="small" />
                    <Chip label={`${match.estimated_impact_reach} reach`} size="small" variant="outlined" />
                  </Box>

                  {match.green_flags.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      {match.green_flags.map((flag, i) => (
                        <Chip key={i} label={flag} size="small" color="success" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}

                  {match.red_flags.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      {match.red_flags.map((flag, i) => (
                        <Chip key={i} label={flag} size="small" color="error" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}

                  <Button
                    size="small"
                    onClick={() => setExpandedChurch(isExpanded ? null : match.church_id)}
                    endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                  >
                    {isExpanded ? 'Hide Details' : 'Why This Church?'}
                  </Button>

                  <Collapse in={isExpanded}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Match Breakdown
                      </Typography>
                      <RadarChart dimensions={match.dimensions} />
                      <Grid container spacing={1} sx={{ mt: 2 }}>
                        {Object.entries(match.dimensions).map(([key, value]) => (
                          <Grid item xs={6} key={key}>
                            <Typography variant="caption" display="block">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Typography>
                            <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                              {value}%
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>AI Recommendation:</strong> {match.ai_recommendation}
                        </Typography>
                      </Alert>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default ChurchMatchingPanel;