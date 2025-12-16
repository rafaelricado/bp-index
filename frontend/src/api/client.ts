import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticacao
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticacao
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

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Patients
export const patientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/patients', { params }),
  search: (q: string) => api.get('/patients/search', { params: { q } }),
  get: (id: string) => api.get(`/patients/${id}`),
  create: (data: any) => api.post('/patients', data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
};

// Records
export const recordsApi = {
  list: (params?: { patientId?: string; page?: number; limit?: number }) =>
    api.get('/records', { params }),
  search: (q: string) => api.get('/records/search', { params: { q } }),
  get: (id: string) => api.get(`/records/${id}`),
  getByPatient: (patientId: string) => api.get(`/records/patient/${patientId}`),
  create: (data: any) => api.post('/records', data),
  update: (id: string, data: any) => api.put(`/records/${id}`, data),
  delete: (id: string) => api.delete(`/records/${id}`),
  getChecklist: (id: string) => api.get(`/records/${id}/checklist`),
  updateChecklist: (id: string, data: any) => api.put(`/records/${id}/checklist`, data),
};

// Documents
export const documentsApi = {
  list: (params?: { medicalRecordId?: string; page?: number; limit?: number }) =>
    api.get('/documents', { params }),
  get: (id: string) => api.get(`/documents/${id}`),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  verify: (id: string) => api.get(`/documents/${id}/verify`),
  delete: (id: string) => api.delete(`/documents/${id}`),
  searchByOcr: (q: string) => api.get('/documents/search', { params: { q } }),
};

export default api;
