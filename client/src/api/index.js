import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.hash !== '#/admin/login') {
        window.location.hash = '#/admin/login';
      }
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
