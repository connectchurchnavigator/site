import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Alert,
  Typography,
  Button,
  Collapse,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Error,
  Warning as WarningIcon,
  Info,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Build,
} from '@mui/icons-material';

const ConflictPanel = ({ tripId, visits, onApplyFix }) => {
  const [conflicts, setConflicts] = useState([]);
  const [feasibility, setFeasibility] = useState(100);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedConflict, setExpandedConflict] = useState(null);

  useEffect(() => {
    if (visits.length >= 2) {
      const timer = setTimeout(() => checkConflicts(), 2000);
      return () => clearTimeout(timer);
    }
  }, [visits]);

  const checkConflicts = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/planner/${tripId}/check-conflicts`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setConflicts(response.data.conflicts);
      setFeasibility(response.data.overall_feasibility);
      setSummary(response.data.feasibility_summary);
    } catch (error) {
      console.error('Conflict check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'error';
    if (severity === 'warning') return 'warning';
    return 'info';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <Error />;
    if (severity === 'warning') return <WarningIcon />;
    return <Info />;
  };

  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
  const warnings = conflicts.filter((c) => c.severity === 'warning');
  const suggestions = conflicts.filter((c) => c.severity === 'suggestion');

  if (loading && conflicts.length === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <LinearProgress />
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Checking for conflicts...
        </Typography>
      </Box>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} />
          No conflicts detected. Your itinerary looks good!
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Feasibility Score
        </Typography>
        <LinearProgress
          variant="determinate"
          value={feasibility}
          sx={{ height: 10, borderRadius: 1, mb: 1 }}
          color={feasibility >= 70 ? 'success' : feasibility >= 50 ? 'warning' : 'error'}
        />
        <Typography variant="body2" color="text.secondary">
          {feasibility}% - {summary}
        </Typography>
      </Box>

      {criticalConflicts.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {criticalConflicts.length} Critical Issue{criticalConflicts.length > 1 ? 's' : ''}
          </Typography>
          {criticalConflicts.map((conflict, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">{conflict.message}</Typography>
              {conflict.suggested_fix && (
                <Button
                  size="small"
                  startIcon={<Build />}
                  onClick={() => onApplyFix(conflict)}
                  sx={{ mt: 1 }}
                >
                  Apply Fix
                </Button>
              )}
            </Box>
          ))}
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {warnings.length} Warning{warnings.length > 1 ? 's' : ''}
          </Typography>
          {warnings.map((conflict, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">{conflict.message}</Typography>
              {conflict.suggested_fix && (
                <Button
                  size="small"
                  startIcon={<Build />}
                  onClick={() => onApplyFix(conflict)}
                  sx={{ mt: 1 }}
                >
                  Apply Fix
                </Button>
              )}
            </Box>
          ))}
        </Alert>
      )}

      {suggestions.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {suggestions.length} Suggestion{suggestions.length > 1 ? 's' : ''}
          </Typography>
          {suggestions.slice(0, 3).map((conflict, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">{conflict.message}</Typography>
              {conflict.suggested_fix && (
                <Button
                  size="small"
                  startIcon={<Build />}
                  onClick={() => onApplyFix(conflict)}
                  sx={{ mt: 1 }}
                >
                  Apply Fix
                </Button>
              )}
            </Box>
          ))}
          {suggestions.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              +{suggestions.length - 3} more suggestions
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
};

export default ConflictPanel;