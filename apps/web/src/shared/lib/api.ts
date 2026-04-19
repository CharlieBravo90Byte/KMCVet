import axios from 'axios';

// Base URL: en dev el proxy de Vite lo redirige al API (localhost:3000)
// En producción el web se sirve desde el mismo origen que el API
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Interceptor: adjunta el JWT de localStorage si existe
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kmcvet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si el servidor devuelve 401, limpiar sesión y redirigir a login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('kmcvet_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
