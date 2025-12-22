import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verifySignup: (data) => api.post('/auth/verify-signup', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  requestEmailChange: (data) => api.post('/auth/request-email-change', data),
  verifyEmailChange: (data) => api.post('/auth/verify-email-change', data)
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// Patients API
export const patientsAPI = {
  getAll: (params) => api.get('/patients', { params }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`)
};

// Doctors API
export const doctorsAPI = {
  getAll: (params) => api.get('/doctors', { params }),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  delete: (id) => api.delete(`/doctors/${id}`)
};

// Medicines API
export const medicinesAPI = {
  getAll: (params) => api.get('/medicines', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`)
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Suppliers API
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`)
};

// Inventory API
export const inventoryAPI = {
  getOverview: () => api.get('/inventory/overview'),
  getBatches: (params) => api.get('/inventory/batches', { params }),
  addBatch: (data) => api.post('/inventory/batches', data),
  adjustStock: (data) => api.post('/inventory/adjust', data),
  getTransactions: (params) => api.get('/inventory/transactions', { params })
};

// Prescriptions API
export const prescriptionsAPI = {
  getAll: (params) => api.get('/prescriptions', { params }),
  getById: (id) => api.get(`/prescriptions/${id}`),
  create: (data) => api.post('/prescriptions', data),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
  dispense: (id) => api.post(`/prescriptions/${id}/dispense`)
};

// Billing API
export const billingAPI = {
  getAll: (params) => api.get('/billing', { params }),
  getById: (id) => api.get(`/billing/${id}`),
  create: (data) => api.post('/billing', data),
  updatePayment: (id, data) => api.put(`/billing/${id}/payment`, data),
  getTodaySummary: () => api.get('/billing/summary/today'),
  sendEmail: (id, email) => api.post(`/billing/${id}/send-email`, { email })
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSales: (params) => api.get('/reports/sales', { params }),
  getTopMedicines: (params) => api.get('/reports/top-medicines', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getExpiry: (params) => api.get('/reports/expiry', { params }),
  getPrescriptions: () => api.get('/reports/prescriptions')
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all')
};

// Shortcuts API
export const shortcutsAPI = {
  getAll: () => api.get('/shortcuts'),
  update: (shortcutId, data) => api.put(`/shortcuts/${shortcutId}`, data),
  reset: (shortcutId) => api.delete(`/shortcuts/${shortcutId}`),
  resetAll: () => api.delete('/shortcuts')
};

// Audit API
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
  getStats: () => api.get('/audit/stats'),
  getFilters: () => api.get('/audit/filters')
};

// Sessions API
export const sessionsAPI = {
  getAll: () => api.get('/sessions'),
  revoke: (sessionId) => api.delete(`/sessions/${sessionId}`),
  revokeAll: () => api.delete('/sessions')
};

// Two-Factor Auth API
export const twoFactorAPI = {
  getStatus: () => api.get('/2fa/status'),
  setup: () => api.post('/2fa/setup'),
  verifySetup: (code) => api.post('/2fa/verify-setup', { code }),
  verify: (userId, code) => api.post('/2fa/verify', { userId, code }),
  disable: (password, code) => api.post('/2fa/disable', { password, code })
};

// Patient Timeline API
export const patientTimelineAPI = {
  getTimeline: (patientId) => api.get(`/patients/${patientId}/timeline`)
};

