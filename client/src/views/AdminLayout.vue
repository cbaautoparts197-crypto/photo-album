<template>
  <div class="admin-layout">
    <!-- 已登录：侧边栏 + 顶栏 + 内容区 -->
    <template v-if="isLoggedIn">
      <!-- Sidebar -->
      <aside :class="['admin-sidebar', { collapsed: sidebarCollapsed }]">
        <div class="sidebar-header">
          <router-link to="/" class="sidebar-logo">
            <div class="logo-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <span v-if="!sidebarCollapsed" class="logo-text">管理后台</span>
          </router-link>
        </div>

        <nav class="sidebar-nav">
          <!-- ===== 概览 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">概览</div>
          <router-link v-if="canAccess('dashboard.view')" to="/admin/dashboard" class="nav-item" :class="{ active: $route.path === '/admin/dashboard' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">首页</span>
          </router-link>
          <router-link to="/admin/ai-chat" class="nav-item" :class="{ active: $route.path === '/admin/ai-chat' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">AI 助手</span>
          </router-link>

          <!-- ===== 产品管理 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">产品管理</div>
          <router-link v-if="canAccess('categories.view')" to="/admin/categories" class="nav-item" :class="{ active: $route.path === '/admin/categories' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">分类管理</span>
          </router-link>
          <router-link v-if="canAccess('products.view')" to="/admin/products" class="nav-item" :class="{ active: $route.path === '/admin/products' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">产品列表</span>
          </router-link>
          <router-link v-if="canAccess('upload.images')" to="/admin/upload" class="nav-item" :class="{ active: $route.path === '/admin/upload' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">批量上传</span>
          </router-link>
          <router-link v-if="canAccess('oe_catalog.view')" to="/admin/oe-catalog" class="nav-item" :class="{ active: $route.path === '/admin/oe-catalog' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">OE 目录</span>
          </router-link>
          <router-link v-if="canAccess('videos.view')" to="/admin/videos" class="nav-item" :class="{ active: $route.path === '/admin/videos' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">视频管理</span>
          </router-link>

          <!-- ===== 销售管理 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">销售管理</div>
          <router-link v-if="canAccess('customers.view')" to="/admin/customers" class="nav-item" :class="{ active: $route.path === '/admin/customers' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">客户管理</span>
          </router-link>
          <router-link v-if="canAccess('inquiries.view')" to="/admin/inquiries" class="nav-item" :class="{ active: $route.path === '/admin/inquiries' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">询盘管理</span>
          </router-link>
          <router-link v-if="canAccess('quotations.view')" to="/admin/quotations" class="nav-item" :class="{ active: $route.path === '/admin/quotations' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">报价管理</span>
          </router-link>
          <router-link v-if="canAccess('pricing_rules.view')" to="/admin/pricing-rules" class="nav-item" :class="{ active: $route.path === '/admin/pricing-rules' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">报价规则</span>
          </router-link>
          <router-link v-if="canAccess('templates.view')" to="/admin/templates" class="nav-item" :class="{ active: $route.path === '/admin/templates' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">文档模板</span>
          </router-link>
          <router-link v-if="canAccess('orders.view')" to="/admin/orders" class="nav-item" :class="{ active: $route.path === '/admin/orders' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">订单管理</span>
          </router-link>

          <!-- ===== 采购管理 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">采购管理</div>
          <router-link v-if="canAccess('suppliers.view')" to="/admin/suppliers" class="nav-item" :class="{ active: $route.path === '/admin/suppliers' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">供应商管理</span>
          </router-link>
          <router-link v-if="canAccess('prices.view')" to="/admin/prices" class="nav-item" :class="{ active: $route.path === '/admin/prices' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">供应商报价</span>
          </router-link>
          <router-link v-if="canAccess('suppliers.view')" to="/admin/supplier-missing" class="nav-item" :class="{ active: $route.path === '/admin/supplier-missing' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">缺失分析</span>
          </router-link>
          <router-link v-if="canAccess('purchase_contracts.view')" to="/admin/purchase-contracts" class="nav-item" :class="{ active: $route.path === '/admin/purchase-contracts' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">采购合同</span>
          </router-link>
          <router-link v-if="canAccess('purchase_contracts.view')" to="/admin/purchase-orders" class="nav-item" :class="{ active: $route.path === '/admin/purchase-orders' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">采购订单</span>
          </router-link>

          <!-- ===== 营销推广 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">营销推广</div>
          <router-link v-if="canAccess('social_media.view')" to="/admin/social-media" class="nav-item" :class="{ active: $route.path === '/admin/social-media' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">社媒中心</span>
          </router-link>
          <router-link v-if="canAccess('email.view')" to="/admin/email-campaigns" class="nav-item" :class="{ active: $route.path === '/admin/email-campaigns' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">邮件营销</span>
          </router-link>
          <router-link v-if="canAccess('seo_geo.view')" to="/admin/seo-geo" class="nav-item" :class="{ active: $route.path === '/admin/seo-geo' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">SEO/GEO 中心</span>
          </router-link>
          <router-link v-if="canAccess('news.view')" to="/admin/news" class="nav-item" :class="{ active: $route.path === '/admin/news' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">新闻管理</span>
          </router-link>
          <router-link to="/admin/content-sop" class="nav-item" :class="{ active: $route.path === '/admin/content-sop' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">内容 SOP</span>
          </router-link>

          <!-- ===== 系统设置 ===== -->
          <div v-if="!sidebarCollapsed" class="nav-section-label">系统设置</div>
          <router-link v-if="canAccess('company.view')" to="/admin/company" class="nav-item" :class="{ active: $route.path === '/admin/company' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">公司信息</span>
          </router-link>
          <router-link v-if="canAccess('exchange_rates.view')" to="/admin/exchange-rates" class="nav-item" :class="{ active: $route.path === '/admin/exchange-rates' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">汇率管理</span>
          </router-link>
          <router-link v-if="canAccess('upload.watermark')" to="/admin/watermark" class="nav-item" :class="{ active: $route.path === '/admin/watermark' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">水印设置</span>
          </router-link>
          <router-link v-if="canAccess('upload.storage')" to="/admin/storage" class="nav-item" :class="{ active: $route.path === '/admin/storage' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">存储管理</span>
          </router-link>
          <router-link v-if="canAccess('seo_geo.view')" to="/admin/notification-settings" class="nav-item" :class="{ active: $route.path === '/admin/notification-settings' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">通知设置</span>
          </router-link>
          <router-link v-if="canAccess('system.admin_users')" to="/admin/api-balances" class="nav-item" :class="{ active: $route.path === '/admin/api-balances' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">API 余额</span>
          </router-link>
          <router-link v-if="canAccess('system.admin_users')" to="/admin/admin-users" class="nav-item" :class="{ active: $route.path === '/admin/admin-users' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">权限管理</span>
          </router-link>
          <router-link v-if="canAccess('system.audit_logs')" to="/admin/audit-logs" class="nav-item" :class="{ active: $route.path === '/admin/audit-logs' }">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">操作日志</span>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <!-- 当前用户信息 -->
          <div v-if="currentUser && !sidebarCollapsed" class="user-info-bar">
            <div class="user-avatar-sm" :style="{ background: userAvatarColor }">
              {{ (currentUser.display_name || currentUser.username || 'A').charAt(0).toUpperCase() }}
            </div>
            <div class="user-info-text">
              <div class="user-name">{{ currentUser.display_name || currentUser.username }}</div>
              <div class="user-role">{{ currentUser.is_super_admin ? '超级管理员' : (currentUser.role_name || '管理员') }}</div>
            </div>
          </div>

          <router-link to="/" class="nav-item nav-item-external">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">前台</span>
          </router-link>
          <button class="nav-item logout-btn" @click="doLogout">
            <span class="nav-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ t('logout') || '退出登录' }}</span>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div :class="['admin-main', { collapsed: sidebarCollapsed }]">
        <header class="admin-topbar">
          <button class="toggle-sidebar" @click="sidebarCollapsed = !sidebarCollapsed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="topbar-breadcrumb">
            <span class="breadcrumb-title">{{ currentPageTitle }}</span>
          </div>
          <div class="topbar-right">
            <div class="notification-bell" @click="showNotifications = !showNotifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </div>
            <div v-if="showNotifications" class="notification-dropdown">
              <div class="notification-header">
                <h4>Notifications</h4>
                <button @click="markAllRead" v-if="unreadCount > 0">Mark all read</button>
              </div>
              <div class="notification-list" v-if="notifications.length > 0">
                <div v-for="n in notifications" :key="n.id" :class="['notification-item', { unread: !n.read }]" @click="handleNotificationClick(n)">
                  <div class="notification-type" :class="'type-' + n.type"></div>
                  <div class="notification-content">
                    <p class="notification-title">{{ n.title }}</p>
                    <p class="notification-msg">{{ n.message }}</p>
                    <span class="notification-time">{{ formatTime(n.created_at) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="notification-empty">No notifications</div>
            </div>
            <!-- 管理后台仅中文，已移除语言切换器 -->
          </div>
        </header>

        <main class="admin-content">
          <router-view />
        </main>
      </div>

      <!-- Mobile overlay -->
      <div v-if="!sidebarCollapsed && isMobile" class="sidebar-overlay" @click="sidebarCollapsed = true"></div>
    </template>

    <!-- 未登录：只渲染子路由（登录页） -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../api/index';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();

const sidebarCollapsed = ref(false);
const isMobile = ref(false);

// ===== 当前用户 & 权限 =====
const currentUser = ref(null);

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem('adminUser');
    if (raw) currentUser.value = JSON.parse(raw);
  } catch {}
}

// 权限检查：超管拥有全部权限；传统密码登录（无 adminUser）视为超管兼容
function canAccess(permission) {
  if (!currentUser.value) return true; // 传统密码登录，全权访问
  if (currentUser.value.is_super_admin) return true;
  const perms = currentUser.value.permissions || [];
  return perms.includes(permission);
}

const avatarColors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981'];
const userAvatarColor = computed(() => {
  const name = currentUser.value?.username || 'A';
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
});

// Notifications
const showNotifications = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
let notifInterval = null;
let notifTimerId = null;

// Pause polling when tab is hidden, resume when visible
function handleVisibilityChange() {
  if (document.hidden) {
    if (notifInterval) { clearInterval(notifInterval); notifInterval = null; }
    if (notifTimerId) { clearTimeout(notifTimerId); notifTimerId = null; }
  } else {
    if (isLoggedIn.value && !notifInterval) {
      loadNotifications();
      notifInterval = setInterval(loadNotifications, 60000);
    }
  }
}

async function loadNotifications() {
  if (document.hidden || !isLoggedIn.value) return;
  try {
    const res = await api.get('/notifications?unread_only=1&limit=20');
    if (res.success) {
      notifications.value = res.data.notifications;
      unreadCount.value = res.data.unread_count;
    }
  } catch (err) {
    // Silently ignore network errors (tab suspended, offline, etc.)
    if (err?.code !== 'ERR_NETWORK_IO_SUSPENDED') {
      console.warn('[notifications] load failed:', err.message);
    }
  }
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all');
    unreadCount.value = 0;
    notifications.value.forEach(n => n.read = 1);
  } catch {}
}

async function handleNotificationClick(n) {
  if (!n.read) {
    try { await api.put(`/notifications/${n.id}/read`); } catch {}
    n.read = 1;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  }
  showNotifications.value = false;
  if (n.link) router.push(n.link);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'Z');
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

// Close notifications on outside click
function handleClickOutside(e) {
  if (!e.target.closest('.notification-bell') && !e.target.closest('.notification-dropdown')) {
    showNotifications.value = false;
  }
}

const isLoggedIn = ref(!!localStorage.getItem('token'));

const pageTitles = {
  '/admin/dashboard': 'dashboard',
  '/admin/categories': 'categories',
  '/admin/products': 'products',
  '/admin/upload': 'upload',
  '/admin/company': 'companyInfo',
  '/admin/watermark': 'watermark',
  '/admin/prices': 'priceManagement',
  '/admin/oe-catalog': 'oeCatalog',
  '/admin/inquiries': 'inquiryManagement',
  '/admin/videos': 'videoManagement',
  '/admin/news': 'newsManagement',
  '/admin/suppliers': 'supplierManagement',
  '/admin/customers': 'customerManagement',
  '/admin/quotations': 'quotationManagement',
  '/admin/orders': 'orderManagement',
  '/admin/supplier-missing': 'supplierMissing',
  '/admin/purchase-contracts': 'purchaseContracts',
  '/admin/purchase-orders': 'purchaseOrders',
  '/admin/pricing-rules': 'pricingRules',
  '/admin/templates': 'templates',
  '/admin/exchange-rates': 'exchangeRates',
  '/admin/seo-geo': 'seoGeoCenter',
  '/admin/social-media': 'socialMediaCenter',
  '/admin/email-campaigns': 'emailCampaigns',
  '/admin/admin-users': '权限管理',
  '/admin/audit-logs': '操作日志',
  '/admin/ai-chat': 'AI 助手',
  '/admin/notification-settings': '通知设置',
  '/admin/api-balances': 'API 余额',
};

const currentPageTitle = computed(() => {
  const key = pageTitles[route.path];
  if (!key) return 'Admin';
  // 非 i18n key 直接返回
  const nonI18nKeys = ['权限管理', '操作日志', 'AI 助手', '通知设置', 'API 余额'];
  if (nonI18nKeys.includes(key)) return key;
  return t(key);
});

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'ar', label: 'AR' },
  { code: 'ru', label: 'RU' },
];

function switchLang(code) {
  locale.value = code;
  localStorage.setItem('lang', code);
}

function doLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('adminUser');
  currentUser.value = null;
  isLoggedIn.value = false;
  router.push('/admin/login');
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (isMobile.value) sidebarCollapsed.value = true;
}

onMounted(() => {
  // 管理后台强制中文
  locale.value = 'zh';
  localStorage.setItem('lang', 'zh');
  checkMobile();
  window.addEventListener('resize', checkMobile);
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  isLoggedIn.value = !!localStorage.getItem('token');
  loadCurrentUser();
  if (isLoggedIn.value) {
    loadNotifications();
    notifInterval = setInterval(loadNotifications, 60000);
  }
});

watch(() => route.path, () => {
  isLoggedIn.value = !!localStorage.getItem('token');
  loadCurrentUser();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (notifInterval) clearInterval(notifInterval);
});
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--gray-50);
}

/* ==================== Sidebar ==================== */
.admin-sidebar {
  width: 260px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 200;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.06);
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  text-decoration: none;
}

.logo-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  color: white;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* Nav */
.sidebar-nav {
  flex: 1 1 0;
  min-height: 0;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.3);
  padding: 16px 12px 6px;
}

.nav-section-label:first-child {
  padding-top: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius);
  color: rgba(255,255,255,0.6);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  white-space: nowrap;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.nav-item:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
}

.nav-item.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.nav-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  transition: var(--transition);
}

.nav-item.active .nav-icon-wrap {
  background: rgba(255,255,255,0.15);
}

.nav-item:hover .nav-icon-wrap {
  background: rgba(255,255,255,0.1);
}

.nav-label {
  overflow: hidden;
}

/* Footer */
.sidebar-footer {
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 50%;
  overflow-y: auto;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.logout-btn:hover .nav-icon-wrap {
  background: rgba(239, 68, 68, 0.2);
}

/* User info bar */
.user-info-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; margin-bottom: 4px;
  background: rgba(255,255,255,0.05); border-radius: var(--radius);
}
.user-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 13px; font-weight: 700;
}
.user-info-text { min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.user-role { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }

/* ==================== Main ==================== */
.admin-main {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-main.collapsed {
  margin-left: 72px;
}

/* Topbar */
.admin-topbar {
  height: 64px;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.toggle-sidebar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}

.toggle-sidebar:hover {
  background: var(--gray-100);
  color: var(--gray-700);
}

.topbar-breadcrumb {
  flex: 1;
}

.breadcrumb-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--gray-800);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-content {
  flex: 1;
  padding: 16px 20px;
}

/* Language Switcher */
.lang-switcher {
  display: flex;
  background: var(--gray-100);
  border-radius: var(--radius-full);
  padding: 3px;
  gap: 2px;
}

.lang-btn {
  padding: 5px 12px;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray-500);
  transition: var(--transition);
  font-family: inherit;
}

.lang-btn.active {
  background: white;
  color: var(--gray-800);
  box-shadow: var(--shadow-sm);
}

/* Mobile overlay */
.sidebar-overlay {
  display: none;
}

/* ==================== Responsive ==================== */
@media (max-width: 768px) {
  .admin-sidebar {
    transform: translateX(-100%);
    width: 260px;
  }
  .admin-sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  .admin-sidebar.collapsed {
    transform: translateX(-100%);
  }
  .admin-main {
    margin-left: 0 !important;
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 150;
    backdrop-filter: blur(4px);
  }
  .admin-content {
    padding: 16px;
  }
}

/* Notification Bell & Dropdown */
.notification-bell {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--gray-600);
  transition: all 0.2s;
}
.notification-bell:hover {
  background: var(--gray-100);
  color: var(--gray-800);
}
.notification-badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 340px;
  max-height: 420px;
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  z-index: 1000;
  overflow: hidden;
}
.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--gray-100);
}
.notification-header h4 { margin: 0; font-size: 14px; font-weight: 600; }
.notification-header button {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: 12px;
}
.notification-header button:hover { text-decoration: underline; }
.notification-list {
  overflow-y: auto;
  max-height: 340px;
}
.notification-item {
  display: flex;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}
.notification-item:hover { background: var(--gray-50); }
.notification-item.unread { background: rgba(59,130,246,0.04); }
.notification-type {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.type-inquiry { background: #3b82f6; }
.type-quotation { background: #8b5cf6; }
.type-order { background: #f59e0b; }
.type-order_confirmed { background: #10b981; }
.type-info { background: #6b7280; }
.notification-content { flex: 1; min-width: 0; }
.notification-title { font-size: 13px; font-weight: 500; margin: 0 0 2px; color: var(--gray-800); }
.notification-msg { font-size: 12px; margin: 0 0 4px; color: var(--gray-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notification-time { font-size: 11px; color: var(--gray-400); }
.notification-empty { padding: 32px 16px; text-align: center; color: var(--gray-400); font-size: 13px; }
</style>
