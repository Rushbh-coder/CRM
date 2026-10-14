import axios from 'axios';

const TOKEN_KEY = 'leadbook_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new Event('leadbook:logout'));
    }
    return Promise.reject(err);
  }
);

// Turns any API error into a sentence for the user.
export const errMsg = (e) =>
  (e && e.response && e.response.data && e.response.data.message) ||
  (e && e.message === 'Network Error' ? 'Can’t reach the server. Check that the API is running.' : 'Something went wrong. Try again.');

export default api;
