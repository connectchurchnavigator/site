import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.churchnavigator.com';

const SmallGroupsManagement = ({ churchSlug, churchId }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leader_name: '',
    leader_contact: '',
    meeting_day: '',
    meeting_time: '',
    frequency: '',
    location_type: 'in-person',
    address_or_link: '',
    capacity: '',
    current_members: 0,
    age_group: '',
    topics: [],
    is_open_to_join: true,
  });
  const [topicInput, setTopicInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, [churchSlug]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/churches/${churchSlug}/small-groups`);
      setGroups(response.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leader_name: '',
      leader_contact: '',
      meeting_day: '',
      meeting_time: '',
      frequency: '',
      location_type: 'in-person',
      address_or_link: '',
      capacity: '',
      current_members: 0,
      age_group: '',
      topics: [],
      is_open_to_join: true,
    });
    setTopicInput('');
    setEditingGroup(null);
  };

  const handleOpenDialog = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description,
        leader_name: group.leader_name,
        leader_contact: group.leader_contact,
        meeting_day: group.meeting_day,
        meeting_time: group.meeting_time,
        frequency: group.frequency,
        location_type: group.location_type,
        address_or_link: group.address_or_link,
        capacity: group.capacity || '',
        current_members: group.current_members || 0,
        age_group: group.age_group || '',
        topics: group.topics || [],
        is_open_to_join: group.is_open_to_join !== false,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const submitData = {
        ...formData,
        church_id: churchId,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      };
      if (editingGroup) {
        await axios.put(`${API_URL}/api/small-groups/${editingGroup._id}`, submitData);
      } else {
        await axios.post(`${API_URL}/api/churches/${churchSlug}/small-groups`, submitData);
      }
      await fetchGroups();
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/api/small-groups/${groupToDelete._id}`);
      await fetchGroups();
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const addTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData({ ...formData, topics: [...formData.topics, topicInput.trim()] });
      setTopicInput('');
    }
  };

  const removeTopic = (topic) => {
    setFormData({ ...formData, topics: formData.topics.filter((t) => t !== topic) });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress sx={{ color: '#8B7FBF' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ color: '#8B7FBF', fontWeight: 600 }}>
          Small Groups Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: '#8B7FBF',
            '&:hover': { backgroundColor: '#7A6FAF' },
            textTransform: 'none',
          }}
        >
          Add New Group
        </Button>
      </Box>

      {groups.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center">
              No small groups yet. Create your first one!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F3F0FF' }}>
                <TableCell sx={{ fontWeight: 600 }}>Group Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Leader</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Meeting</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Members</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group._id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.leader_name}</TableCell>
                  <TableCell>
                    {group.meeting_day} {group.meeting_time}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <PeopleIcon sx={{ fontSize: 18, color: '#8B7FBF' }} />
                      {group.current_members}
                      {group.capacity && `/${group.capacity}`}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={group.is_open_to_join ? 'Open' : 'Closed'}
                      size="small"
                      color={group.is_open_to_join ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenDialog(group)}
                      sx={{ color: '#8B7FBF' }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setGroupToDelete(group);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: '#D32F2F' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#8B7FBF', fontWeight: 600 }}>
          {editingGroup ? 'Edit Small Group' : 'Create New Small Group'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Group Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              required
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              label="Leader Name"
              fullWidth
              required
              value={formData.leader_name}
              onChange={(e) => setFormData({ ...formData, leader_name: e.target.value })}
            />
            <TextField
              label="Leader Email"
              type="email"
              fullWidth
              required
              value={formData.leader_contact}
              onChange={(e) => setFormData({ ...formData, leader_contact: e.target.value })}
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Meeting Day"
                fullWidth
                required
                value={formData.meeting_day}
                onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
                placeholder="e.g., Wednesday"
              />
              <TextField
                label="Meeting Time"
                fullWidth
                required
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                placeholder="e.g., 7:00 PM"
              />
            </Box>
            <TextField
              label="Frequency"
              fullWidth
              required
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              placeholder="e.g., Weekly, Bi-weekly"
            />
            <FormControl fullWidth required>
              <InputLabel>Location Type</InputLabel>
              <Select
                value={formData.location_type}
                label="Location Type"
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
              >
                <MenuItem value="in-person">In-Person</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="hybrid">Hybrid</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={formData.location_type === 'online' ? 'Meeting Link' : 'Address'}
              fullWidth
              required
              value={formData.address_or_link}
              onChange={(e) => setFormData({ ...formData, address_or_link: e.target.value })}
            />
            <Box display="flex" gap={2}>
              <TextField
                label="Capacity (optional)"
                type="number"
                fullWidth
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
              <TextField
                label="Current Members"
                type="number"
                fullWidth
                value={formData.current_members}
                onChange={(e) => setFormData({ ...formData, current_members: parseInt(e.target.value) || 0 })}
              />
            </Box>
            <TextField
              label="Age Group (optional)"
              fullWidth
              value={formData.age_group}
              onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
              placeholder="e.g., Young Adults, Seniors"
            />
            <Box>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  label="Add Topics"
                  fullWidth
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTopic()}
                  placeholder="e.g., Bible Study, Prayer"
                />
                <Button
                  variant="outlined"
                  onClick={addTopic}
                  sx={{ borderColor: '#8B7FBF', color: '#8B7FBF' }}
                >
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {formData.topics.map((topic, idx) => (
                  <Chip
                    key={idx}
                    label={topic}
                    onDelete={() => removeTopic(topic)}
                    sx={{ backgroundColor: '#F3F0FF', color: '#8B7FBF' }}
                  />
                ))}
              </Box>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_open_to_join}
                  onChange={(e) => setFormData({ ...formData, is_open_to_join: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#8B7FBF' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#8B7FBF' },
                  }}
                />
              }
              label="Open to New Members"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#8B7FBF' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            sx={{
              backgroundColor: '#8B7FBF',
              '&:hover': { backgroundColor: '#7A6FAF' },
            }}
          >
            {submitting ? <CircularProgress size={24} /> : editingGroup ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Small Group</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#8B7FBF' }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmallGroupsManagement;
