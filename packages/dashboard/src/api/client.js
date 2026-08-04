import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 20_000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mcode_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('mcode_refresh');
      if (refresh) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refresh });
          localStorage.setItem('mcode_access', data.access);
          localStorage.setItem('mcode_refresh', data.refresh);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem('mcode_access');
          localStorage.removeItem('mcode_refresh');
        }
      }
    }
    return Promise.reject(error);
  }
);

export function logout() {
  localStorage.removeItem('mcode_access');
  localStorage.removeItem('mcode_refresh');
}

export function isAuthed() {
  return Boolean(localStorage.getItem('mcode_access'));
}
