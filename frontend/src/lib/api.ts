import axios, { AxiosError } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
};

const getCsrfToken = () => getCookieValue('csrf_token');

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
    const responseStatus = error.response?.status;
    const requestConfig = error.config;

    if (responseStatus === 429 && requestConfig) {
      const method = requestConfig.method?.toLowerCase();
      const retriableRequest = method === 'get';
      const retryCount = (requestConfig as typeof requestConfig & { _rateLimitRetryCount?: number })._rateLimitRetryCount ?? 0;

      if (retriableRequest && retryCount < 1) {
        const retryAfterHeader = error.response?.headers?.['retry-after'];
        const retryAfterSeconds = Number.parseFloat(String(retryAfterHeader ?? ''));
        const retryDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : 600;

        (requestConfig as typeof requestConfig & { _rateLimitRetryCount?: number })._rateLimitRetryCount = retryCount + 1;

        await new Promise((resolve) => {
          window.setTimeout(resolve, retryDelayMs);
        });

        return api(requestConfig);
      }
    }

    if (responseStatus === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      if (window.location.pathname !== '/signin') {
        window.location.href = '/signin';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
