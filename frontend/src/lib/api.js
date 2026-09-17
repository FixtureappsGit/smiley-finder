import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ---------------------------------------------------------------- //
export const authApi = {
  register: (data) => api.post("/auth/register/", data),
  login: (data) => api.post("/auth/login/", data),
  verifyOtp: (data) => api.post("/auth/verify-otp/", data),
  resendOtp: (data) => api.post("/auth/resend-otp/", data),
  me: () => api.get("/auth/me/"),
  updateProfile: (data) => api.patch("/auth/me/", data),
  changePassword: (data) => api.post("/auth/change-password/", data),
  logout: (refresh) => api.post("/auth/logout/", { refresh }),
};

// ---- Children ------------------------------------------------------------ //
export const childrenApi = {
  list: () => api.get("/children/"),
  get: (id) => api.get(`/children/${id}/`),
  create: (data) => api.post("/children/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  update: (id, data) => api.patch(`/children/${id}/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  delete: (id) => api.delete(`/children/${id}/`),
  updatePrivacy: (id, data) => api.patch(`/children/${id}/privacy/`, data),
  getContacts: (childId) => api.get(`/children/${childId}/contacts/`),
  createContact: (childId, data) => api.post(`/children/${childId}/contacts/`, data),
  updateContact: (childId, contactId, data) =>
    api.patch(`/children/${childId}/contacts/${contactId}/`, data),
  deleteContact: (childId, contactId) =>
    api.delete(`/children/${childId}/contacts/${contactId}/`),
};

// ---- Tags ---------------------------------------------------------------- //
export const tagsApi = {
  list: () => api.get("/tags/"),
  get: (id) => api.get(`/tags/${id}/`),
  request: (data) => api.post("/tags/request/", data),
  report: (id, data) => api.post(`/tags/${id}/report/`, data),
  events: (id) => api.get(`/tags/${id}/events/`),
  scans: (id) => api.get(`/tags/${id}/scans/`),
  childTags: (childId) => api.get(`/children/${childId}/tags/`),
};

// ---- Orders -------------------------------------------------------------- //
export const ordersApi = {
  list: () => api.get("/orders/"),
};

// ---- Emergency (public — no auth) --------------------------------------- //
export const emergencyApi = {
  getProfile: (childId, tagId) => {
    const params = tagId ? `?tag=${tagId}` : "";
    return axios.get(`${BASE_URL}/emergency/${childId}/${params}`);
  },
  recordScan: (data) => axios.post(`${BASE_URL}/emergency/record-scan/`, data),
};

// ---- Admin --------------------------------------------------------------- //
export const adminApi = {
  stats: () => api.get("/admin/stats/"),

  // Users
  users: (params) => api.get("/admin/users/", { params }),
  getUser: (id) => api.get(`/admin/users/${id}/`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),

  // Children
  children: (params) => api.get("/admin/children/", { params }),

  // Tags
  tags: (params) => api.get("/admin/tags/", { params }),
  updateTag: (id, data) => api.patch(`/admin/tags/${id}/`, data),

  // Orders
  orders: (params) => api.get("/admin/orders/", { params }),
  updateOrder: (id, data) => api.patch(`/admin/orders/${id}/`, data),

  // Scan logs
  scans: (params) => api.get("/admin/scans/", { params }),
};

export default api;
