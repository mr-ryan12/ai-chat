// Packages
import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

// Utils
import { logger } from "./logger";

interface AxiosRequestConfigWithMeta extends InternalAxiosRequestConfig {
  _meta?: { start: number };
}

/** Strip query parameters from URLs to prevent logging secrets (e.g. api_key) */
function redactUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Relative URL or malformed — strip everything after '?'
    return url.split("?")[0];
  }
}

const axiosInstance: AxiosInstance = axios.create();

axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfigWithMeta) => {
    config._meta = { start: Date.now() };
    logger.logRequest({
      method: config.method || "GET",
      path: redactUrl(config.url),
      duration: 0,
    });
    return config;
  },
  (error: AxiosError) => {
    logger.logError(error, {
      method: error.config?.method?.toUpperCase() || "GET",
      path: redactUrl(error.config?.url),
      duration: 0,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as AxiosRequestConfigWithMeta;
    const { method, url } = config;
    const duration = Date.now() - (config._meta?.start || Date.now());
    logger.logRequest({
      method: method?.toUpperCase() || "GET",
      path: redactUrl(url),
      duration,
      status: response.status,
    });
    return response;
  },
  (error: AxiosError) => {
    const config = (error.config || {}) as AxiosRequestConfigWithMeta;
    const { method, url } = config;
    const duration = Date.now() - (config._meta?.start || Date.now());
    logger.logError(error, {
      method: method?.toUpperCase() || "GET",
      path: redactUrl(url),
      duration,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

export { axiosInstance };
