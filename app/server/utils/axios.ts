import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { logger } from "./logger";

interface AxiosRequestConfigWithMeta extends InternalAxiosRequestConfig {
  _meta?: { start: number };
}

function redactApiKeyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("api_key")) {
      u.searchParams.delete("api_key");
    }
    return u.toString();
  } catch {
    // If it's not a valid URL, return as is
    return url;
  }
}

const axiosInstance: AxiosInstance = axios.create();

axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfigWithMeta) => {
    config._meta = { start: Date.now() };
    return config;
  },
  (error: AxiosError) => {
    logger.logError(error, { service: "EXTERNAL" });
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
      path: redactApiKeyFromUrl(url || ""),
      duration,
      status: response.status,
      service: "EXTERNAL",
    });
    return response;
  },
  (error: AxiosError) => {
    const config = (error.config || {}) as AxiosRequestConfigWithMeta;
    const { method, url } = config;
    const duration = Date.now() - (config._meta?.start || Date.now());
    logger.logError(error, {
      method: method?.toUpperCase() || "GET",
      path: redactApiKeyFromUrl(url || ""),
      duration,
      status: error.response?.status,
      service: "EXTERNAL",
    });
    return Promise.reject(error);
  }
);

export { axiosInstance };
