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

const axiosInstance: AxiosInstance = axios.create();

axiosInstance.interceptors.request.use(
  (config: AxiosRequestConfigWithMeta) => {
    config._meta = { start: Date.now() };
    return config;
  },
  (error: AxiosError) => {
    logger.logError(error);
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
      path: url || "",
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
      path: url,
      duration,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

export { axiosInstance };
