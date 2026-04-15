import axios from 'axios';

// 生产环境使用 Render 后端地址，开发环境走 Vite 代理
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300000, // 5分钟（批量上传需要）
});

// 请求拦截：自动带 token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截
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
