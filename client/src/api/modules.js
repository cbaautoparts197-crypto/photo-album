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

// ==================== 供应商价格 ====================
export const getPrices = (params) => api.get('/prices', { params });
export const getPricesByOe = (oe) => api.get(`/prices/by-oe/${encodeURIComponent(oe)}`);
export const getPricesByProductName = (productName) => api.get('/prices/by-product-name', { params: { productName } });
export const createPrice = (data) => api.post('/prices', data);
export const updatePrice = (id, data) => api.put(`/prices/${id}`, data);
export const deletePrice = (id) => api.delete(`/prices/${id}`);
export const batchDeletePrices = (ids) => api.post('/prices/batch-delete', { ids });
export const importPrices = (formData) =>
  api.post('/prices/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ==================== 询盘管理 ====================
export const submitInquiry = (data) => api.post('/inquiries', data);
export const submitBatchInquiry = (data) => api.post('/inquiries/batch', data);
export const getInquiries = (params) => api.get('/inquiries', { params });
export const updateInquiryStatus = (id, status) => api.put(`/inquiries/${id}/status`, { status });
export const replyInquiry = (id, data) => api.put(`/inquiries/${id}/reply`, data);
export const deleteInquiry = (id) => api.delete(`/inquiries/${id}`);

// ==================== 视频管理 ====================
export const getVideos = (params) => api.get('/videos', { params });
export const createVideo = (data) => api.post('/videos', data);
export const updateVideo = (id, data) => api.put(`/videos/${id}`, data);
export const deleteVideo = (id) => api.delete(`/videos/${id}`);
export const batchDeleteVideos = (ids) => api.post('/videos/batch-delete', { ids });

// ==================== 新闻管理 ====================
export const getNews = (params) => api.get('/news', { params });
export const getNewsById = (id) => api.get(`/news/${id}`);
export const createNews = (data) => api.post('/news', data);
export const updateNews = (id, data) => api.put(`/news/${id}`, data);
export const deleteNews = (id) => api.delete(`/news/${id}`);
export const batchDeleteNews = (ids) => api.post('/news/batch-delete', { ids });

// ==================== 供应商管理 ====================
export const getSuppliers = (params) => api.get('/suppliers', { params });
export const getSupplierById = (id) => api.get(`/suppliers/${id}`);
export const createSupplier = (data) => api.post('/suppliers', data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);
export const batchDeleteSuppliers = (ids) => api.post('/suppliers/batch-delete', { ids });

// ==================== 报价管理 ====================
export const getQuotations = (params) => api.get('/quotations', { params });
export const getQuotationById = (id) => api.get(`/quotations/${id}`);
export const createQuotation = (data) => api.post('/quotations', data);
export const batchCreateQuotations = (data) => api.post('/quotations/batch', data);
export const updateQuotation = (id, data) => api.put(`/quotations/${id}`, data);
export const deleteQuotation = (id) => api.delete(`/quotations/${id}`);
export const batchDeleteQuotations = (ids) => api.post('/quotations/batch-delete', { ids });
export const autoPriceQuotation = (id) => api.post(`/quotations/${id}/auto-price`);
export const batchAutoPrice = (ids) => api.post('/quotations/batch-auto-price', { ids });
export const importQuotations = (formData) =>
  api.post('/quotations/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ==================== 客户管理 ====================
export const getCustomers = (params) => api.get('/customers', { params });
export const getCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const batchDeleteCustomers = (ids) => api.post('/customers/batch-delete', { ids });
export const searchCustomers = (q) => api.get('/customers/select/search', { params: { q } });
export const autoMatchCustomer = (data) => api.post('/customers/auto-match', data);
