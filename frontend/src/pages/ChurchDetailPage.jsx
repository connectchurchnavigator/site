import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
} from '@mui/material';
import ChurchHeader from '../components/church/ChurchHeader';
import ChurchOverview from '../components/church/ChurchOverview';
import ChurchContact from '../components/church/ChurchContact';
import ChurchServices from '../components/church/ChurchServices';
import SmallGroupsTab from '../components/church/SmallGroupsTab';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const ChurchDetailPage = () => {
  const { slug } = useParams();
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchChurch();
  }, [slug]);

  const fetchChurch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/churches/${slug}`);
      setChurch(response.data);
      setError(null);
    } catch (err) {
      setError('Church not found');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress sx={{ color: '#8B7FBF' }} />
      </Box>
    );
  }

  if (error || !church) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Church not found'}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
      <ChurchHeader church={church} />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            textColor="inherit"
            sx={{
              '& .MuiTab-root': {
                color: '#666',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                '&.Mui-selected': { color: '#8B7FBF' },
              },
              '& .MuiTabs-indicator': { backgroundColor: '#8B7FBF' },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Services" />
            <Tab label="Small Groups" />
            <Tab label="Contact" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <ChurchOverview church={church} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ChurchServices services={church.services || []} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <SmallGroupsTab churchSlug={slug} />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <ChurchContact church={church} />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default ChurchDetailPage;
