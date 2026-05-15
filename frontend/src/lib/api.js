import axios from 'axios';

let rawUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
if (rawUrl !== 'http://localhost:8000' && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}`;
}
const API_URL = rawUrl.replace(/\/$/, '') + '/api';

console.log('DEBUG_CONNECTIVITY: App is attempting to connect to API at:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
  paramsSerializer: {
    serialize: (params) => {
      const parts = [];
      for (const [key, value] of Object.entries(params)) {
        if (value === null || typeof value === 'undefined') continue;
        if (Array.isArray(value)) {
          value.forEach((v) => {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
          });
        } else {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
      return parts.join('&');
    },
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Interceptor to detect HTML-instead-of-JSON errors (Routing Loop Detector)
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.includes('<!doctype html>')) {
      const msg = `⚠️ API CONFIG ERROR: The app is looking for data at "${API_URL}", but that address is showing a website homepage. Please check your REACT_APP_BACKEND_URL variable.`;
      console.error(msg);
      // Alert once
      if (!window._api_alert_shown) {
        alert(msg);
        window._api_alert_shown = true;
      }
      return { data: { data: [], total: 0 } };
    }
    return response;
  }
);

export default api;

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (idToken) => api.post('/auth/google', { id_token: idToken }),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// Taxonomy APIs
export const taxonomyAPI = {
  getAll: () => api.get('/taxonomies'),
  getByCategory: (category) => api.get(`/taxonomies/${category}`),
};

// Church APIs
export const churchAPI = {
  create: (data) => api.post('/churches', data),
  getAll: (params) => api.get('/churches', { params }),
  getById: (id) => api.get(`/churches/${id}`),
  update: (id, data) => api.put(`/churches/${id}`, data),
  delete: (id) => api.delete(`/churches/${id}`),
  submit: (id) => api.post(`/churches/${id}/submit`),
  getListingInsights: (id) => api.get(`/churches/${id}/insights`),
};

// Pastor APIs
export const pastorAPI = {
  create: (data) => api.post('/pastors', data),
  getAll: (params) => api.get('/pastors', { params }),
  getById: (id) => api.get(`/pastors/${id}`),
  update: (id, data) => api.put(`/pastors/${id}`, data),
  delete: (id) => api.delete(`/pastors/${id}`),
};

// Relationship APIs
export const relationshipAPI = {
  create: (data) => api.post('/relationships', data),
  getByPastor: (pastorId) => api.get(`/relationships/pastor/${pastorId}`),
  getByChurch: (churchId) => api.get(`/relationships/church/${churchId}`),
  approve: (id) => api.put(`/relationships/${id}/approve`),
  reject: (id) => api.put(`/relationships/${id}/reject`),
};

// Analytics APIs
export const analyticsAPI = {
  track: (data) => api.post('/analytics/track', data),
  getDashboard: (listingId) => api.get(`/analytics/dashboard/${listingId}`),
  getUserDashboard: (params) => api.get('/analytics/user-dashboard', { params }),
};

// Bookmark APIs
export const bookmarkAPI = {
  add: (listingId, listingType) => api.post('/bookmarks', null, { params: { listing_id: listingId, listing_type: listingType } }),
  getAll: () => api.get('/bookmarks'),
  remove: (id) => api.delete(`/bookmarks/${id}`),
};

// Admin APIs
export const adminAPI = {
  // Analytics
  getAnalyticsOverview: () => api.get('/admin/analytics/overview'),
  
  // Verification Queue
  getPendingVerifications: () => api.get('/admin/pending-verifications'),
  approve: (listingType, listingId) => api.put(`/admin/approve/${listingType}/${listingId}`),
  reject: (listingType, listingId, feedback) => api.put(`/admin/reject/${listingType}/${listingId}`, null, { params: { feedback } }),
  feature: (listingType, listingId, isFeatured) => api.put(`/admin/feature/${listingType}/${listingId}`, null, { params: { is_featured: isFeatured } }),
  recommend: (listingType, listingId, isRecommended) => api.put(`/admin/recommend/${listingType}/${listingId}`, null, { params: { is_recommended: isRecommended } }),
  
  // User Management
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  changeUserRole: (id, role) => api.put(`/admin/users/${id}/role`, null, { params: { role } }),
  suspendUser: (id, suspended) => api.put(`/admin/users/${id}/suspend`, null, { params: { suspended } }),
  resetUserPassword: (id, newPassword) => api.put(`/admin/users/${id}/reset-password`, null, { params: { new_password: newPassword } }),
  
  // Church Management
  getChurches: (params) => api.get('/admin/churches', { params }),
  updateChurch: (id, data) => api.put(`/admin/churches/${id}`, data),
  deleteChurch: (id) => api.delete(`/admin/churches/${id}`),
  changeChurchStatus: (id, status) => api.put(`/admin/churches/${id}/status`, null, { params: { status } }),
  bulkChurchAction: (action, churchIds) => api.post('/admin/churches/bulk', { church_ids: churchIds }, { params: { action } }),
  
  // Bulk CSV
  bulkUpload: (type, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/admin/bulk/upload/${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  bulkExport: (type) => api.get(`/admin/bulk/export/${type}`, { responseType: 'blob' }),
  
  // Pastor Management
  getPastors: (params) => api.get('/admin/pastors', { params }),
  updatePastor: (id, data) => api.put(`/admin/pastors/${id}`, data),
  deletePastor: (id) => api.delete(`/admin/pastors/${id}`),
  changePastorStatus: (id, status) => api.put(`/admin/pastors/${id}/status`, null, { params: { status } }),
  
  // Taxonomy Management
  getTaxonomies: () => api.get('/admin/taxonomies'),
  createTaxonomy: (category, value) => api.post('/admin/taxonomies', null, { params: { category, value } }),
  updateTaxonomy: (id, value) => api.put(`/admin/taxonomies/${id}`, null, { params: { value } }),
  deleteTaxonomy: (id) => api.delete(`/admin/taxonomies/${id}`),
  
  // System Settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settings) => api.put('/admin/settings', settings),
  
  // Announcements
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (title, message, target) => api.post('/admin/announcements', null, { params: { title, message, target } }),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  
  // Audit Logs
  getLogs: (params) => api.get('/admin/logs', { params }),
  
  // Reports
  getReports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (id, resolution, actionTaken) => api.put(`/admin/reports/${id}/resolve`, null, { params: { resolution, action_taken: actionTaken } }),
  
  // Unified Unified Analytics
  getUnifiedAnalytics: () => api.get('/admin/analytics/unified'),
  
  // Claim Requests
  getClaimRequests: () => api.get('/admin/claim-requests'),
  approveClaim: (id) => api.put(`/admin/claim-requests/${id}/approve`),
  rejectClaim: (id, reason) => api.put(`/admin/claim-requests/${id}/reject`, { reason }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
};

// Claim APIs
export const claimAPI = {
  submit: (data) => api.post('/claim-requests', data),
  getAll: () => api.get('/claim-requests'),
};


// Utility APIs
export const utilityAPI = {
  resolveMap: (url) => api.post('/utility/resolve-map', { url }),
  getTimezone: (lat, lng) => api.post('/utility/timezone', { latitude: lat, longitude: lng }),
  getImageKitAuth: () => api.get('/utility/imagekit-auth'),
};


// Homepage APIs
export const homepageAPI = {
  getFeaturedChurches: (limit = 6) => api.get('/homepage/featured-churches', { params: { limit } }),
  getOpenChurches: (limit = 6) => api.get('/homepage/open-churches', { params: { limit } }),
  getFeaturedPastors: (limit = 6) => api.get('/homepage/featured-pastors', { params: { limit } }),
  getNewPastors: (limit = 6) => api.get('/homepage/new-pastors', { params: { limit } }),
};

// Visitor Connect APIs
export const visitorAPI = {
  submit: (slug, data) => api.post(`/public/connect/${slug}`, data),
  getChurchVisitors: (churchId) => api.get(`/user/listings/${churchId}/visitors`),
};

export const messageAPI = {
  submit: (slug, data) => api.post(`/public/messages/${slug}`, data),
  getChurchMessages: (churchId) => api.get(`/user/listings/${churchId}/messages`),
};

// Upload APIs
export const uploadAPI = {
  upload: (file, category = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadMultiple: (files, category = 'gallery') => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('category', category);
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (url) => api.delete('/upload', { params: { url } }),
};