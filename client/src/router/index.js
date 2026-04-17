import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('../views/FrontLayout.vue'),
    children: [
      { path: '', component: () => import('../views/HomePage.vue') },
      { path: 'products', component: () => import('../views/ProductsPage.vue') },
      { path: 'videos', component: () => import('../views/VideosPage.vue') },
      { path: 'about', component: () => import('../views/AboutPage.vue') },
    ],
  },
  {
    path: '/admin',
    component: () => import('../views/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'login', component: () => import('../views/admin/LoginPage.vue'), meta: { noAuth: true } },
      { path: 'dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'categories', component: () => import('../views/admin/CategoriesPage.vue') },
      { path: 'products', component: () => import('../views/admin/ProductsPage.vue') },
      { path: 'upload', component: () => import('../views/admin/UploadPage.vue') },
      { path: 'company', component: () => import('../views/admin/CompanyPage.vue') },
      { path: 'watermark', component: () => import('../views/admin/WatermarkPage.vue') },
      { path: 'storage', component: () => import('../views/admin/StoragePage.vue') },
      { path: 'prices', component: () => import('../views/admin/PricesPage.vue') },
      { path: 'inquiries', component: () => import('../views/admin/InquiriesPage.vue') },
      { path: 'videos', component: () => import('../views/admin/VideosPage.vue') },
      { path: 'news', component: () => import('../views/admin/NewsPage.vue') },
      { path: 'suppliers', component: () => import('../views/admin/SuppliersPage.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !to.meta.noAuth && !token) {
    next('/admin/login');
  } else if (to.meta.noAuth && token) {
    next('/admin/dashboard');
  } else {
    next();
  }
});

export default router;
