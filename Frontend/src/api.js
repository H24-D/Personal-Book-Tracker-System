import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
  try {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  } catch (e) {
  }

  if (token) {
    axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosClient.defaults.headers.common.Authorization;
  }
}

export function getAuthToken() {
  try {
    return authToken || localStorage.getItem("token");
  } catch (e) {
    return authToken;
  }
}

const axiosClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

axiosClient.interceptors.request.use(
  (config) => {
    try {
      const token = authToken || (typeof localStorage !== "undefined" && localStorage.getItem("token"));
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {

    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;


    if (status === 401) {
      try {
        localStorage.removeItem("token");
      } catch {}
      authToken = null;
      delete axiosClient.defaults.headers.common.Authorization;
    }

    const errorPayload = {
      message: err?.response?.data?.message || err.message || "Request failed",
      status: status || 0,
      data: err?.response?.data || null,
    };
    const e = new Error(errorPayload.message);
    e.status = errorPayload.status;
    e.data = errorPayload.data;
    return Promise.reject(e);
  }
);

export default {
  client: axiosClient,
  get: (path, opts) =>
    axiosClient.get(path, { params: opts?.params || opts }).then((r) => r.data),
  post: (path, body) => axiosClient.post(path, body).then((r) => r.data),
  put: (path, body) => axiosClient.put(path, body).then((r) => r.data),
  delete: (path) => axiosClient.delete(path).then((r) => r.data),
};