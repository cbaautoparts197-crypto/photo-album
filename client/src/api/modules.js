import api from './index';

// ==================== 分类 ====================
export const getCategories = (params) => api.get('/categories', { params });
export const getCategoriesFlat = (params) => api.get('/categories/flat', { params });
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// ==================== 产品 ====================
export const getProducts = (params) => api.get('/products', { params });
export const uploadImages = (formData, onProgress) =>
  api.post('/products/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);
export const batchDeleteProducts = (ids) => api.post('/products/batch-delete', { ids });
export const batchMoveCategory = (ids, categoryId) => api.put('/products/batch-move-category', { ids, category_id: categoryId });

// ==================== 公司 ====================
export const getCompanyInfo = () => api.get('/company');
export const updateCompanyInfo = (data) => api.put('/company', data);

// ==================== 水印 ====================
export const getWatermarkSettings = () => api.get('/watermark');
export const updateWatermarkSettings = (data) => api.put('/watermark', data);
export const getWatermarkPreview = () => api.get('/watermark/preview');

// ==================== 存储 ====================
export const getStorageSettings = () => api.get('/storage');
export const updateStorageSettings = (data) => api.put('/storage', data);
export const testStorageConnection = () => api.post('/storage/test');

// ==================== 认证 ====================
export const login = (password) => api.post('/auth/login', { password });
