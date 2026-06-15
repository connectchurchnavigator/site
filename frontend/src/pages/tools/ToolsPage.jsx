import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip
} from '@mui/material';
import {
  QrCode2,
  TrendingUp,
  People,
  Videocam,
  Event,
  BarChart
} from '@mui/icons-material';

const tools = [
  {
    id: 'qr-checkin',
    name: 'QR Check-In',
    description: 'Generate QR codes for visitor tracking and attendance monitoring',
    icon: QrCode2,
    color: '#7c3aed',
    plan: 'free',
    path: '/dashboard/tools/qr-checkin'
  },
  {
    id: 'social-health',
    name: 'Social Media Health Check',
    description: 'AI-powered analysis of your church social media performance with actionable recommendations',
    icon: TrendingUp,
    color: '#ec4899',
    plan: 'standard',
    path: '/dashboard/tools/social-health'
  },
  {
    id: 'worship-leaders',
    name: 'Worship Leader Listings',
    description: 'Advertise openings or find worship leaders for your ministry',
    icon: People,
    color: '#f59e0b',
    plan: 'standard',
    path: '/dashboard/tools/worship-leaders',
    comingSoon: true
  },
  {
    id: 'media-team',
    name: 'Media Team Listings',
    description: 'Connect with media professionals for your church services',
    icon: Videocam,
    color: '#10b981',
    plan: 'standard',
    path: '/dashboard/tools/media-team',
    comingSoon: true
  },
  {
    id: 'events',
    name: 'Event Listings',
    description: 'Promote church events and conferences to wider audience',
    icon: Event,
    color: '#3b82f6',
    plan: 'premium',
    path: '/dashboard/tools/events',
    comingSoon: true
  },
  {
    id: 'analytics',
    name: 'Advanced Analytics',
    description: 'Deep insights into visitor engagement and growth trends',
    icon: BarChart,
    color: '#8b5cf6',
    plan: 'premium',
    path: '/dashboard/tools/analytics',
    comingSoon: true
  }
];

const planColors = {
  free: '#22c55e',
  standard: '#f59e0b',
  premium: '#ec4899'
};

export default function ToolsPage() {
  const navigate = useNavigate();

  const handleToolClick = (tool) => {
    if (!tool.comingSoon) {
      navigate(tool.path);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#7c3aed' }}>
        Church Tools
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Powerful tools to grow and manage your church community
      </Typography>

      <Grid container spacing={3}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={tool.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: tool.comingSoon ? 'default' : 'pointer',
                  opacity: tool.comingSoon ? 0.6 : 1,
                  transition: 'all 0.2s',
                  '&:hover': tool.comingSoon ? {} : {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleToolClick(tool)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Icon sx={{ fontSize: 40, color: tool.color, mr: 2 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {tool.name}
                      </Typography>
                      <Chip
                        label={tool.plan.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: planColors[tool.plan],
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {tool.description}
                  </Typography>
                  {tool.comingSoon && (
                    <Chip
                      label="COMING SOON"
                      size="small"
                      sx={{ mt: 2, bgcolor: '#e5e7eb', fontWeight: 600 }}
                    />
                  )}
                </CardContent>
                {!tool.comingSoon && (
                  <CardActions>
                    <Button
                      size="small"
                      sx={{ color: tool.color, fontWeight: 600 }}
                    >
                      Open Tool →
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
}
