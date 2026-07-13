import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const getCsrfToken = () => getCookieValue('csrfToken') || getCookieValue('XSRF-TOKEN');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';
    const isAuthRoute = ['/auth/signin', '/auth/signup', '/auth/refresh'].some((route) => {
      const normalizedUrl = url.split('?')[0].replace(/\/$/, '');
      return normalizedUrl === route || normalizedUrl.endsWith(route);
    });

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute && typeof window !== 'undefined') {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-CSRF-Token': getCsrfToken(),
            },
          },
        );

        return api(originalRequest);
      } catch {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        if (window.location.pathname !== '/signin') {
          window.location.href = '/signin';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
