import api from "@/lib/axios";

/** All analytics routes accept ?from=YYYY-MM-DD&to=YYYY-MM-DD */
export const getDashboard = (params = {}) =>
  api.get("/analytics/dashboard", { params });
export const getOverview = (params = {}) =>
  api.get("/analytics/overview", { params });
export const getSalesTrend = (params = {}) =>
  api.get("/analytics/sales-trend", { params });
export const getTopProducts = (params = {}) =>
  api.get("/analytics/top-products", { params });
export const getTopCategories = (params = {}) =>
  api.get("/analytics/top-categories", { params });
export const getTopCustomers = (params = {}) =>
  api.get("/analytics/top-customers", { params });
export const getOrderBreakdown = (params = {}) =>
  api.get("/analytics/order-breakdown", { params });
export const getQuotationAnalytics = (params = {}) =>
  api.get("/analytics/quotations", { params });
export const getNonMovingProducts = (params = {}) =>
  api.get("/analytics/non-moving-products", { params });
