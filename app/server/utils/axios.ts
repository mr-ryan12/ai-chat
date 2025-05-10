import axios, {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { logger } from "./logger";

const axiosInstance = axios.create();
const METADATA_KEY = Symbol("axios_metadata");

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    (config as Record<string, unknown>)[METADATA_KEY] = { start: Date.now() };
    return config;
  },
  (error: AxiosError) => {
    logger.logError(error, { service: "EXTERNAL" });
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { method, url } = response.config;
    const meta = (response.config as Record<string, any>)[METADATA_KEY];
    const duration = Date.now() - (meta?.start || Date.now());
    logger.logRequest({
      method: method?.toUpperCase() || "GET",
      path: url || "",
      duration,
      status: response.status,
      service: "EXTERNAL",
    });
    return response;
  },
  (error: AxiosError) => {
    const { method, url } = error.config || {};
    const meta = (error.config as Record<string, any>)?.[METADATA_KEY];
    const duration = Date.now() - (meta?.start || Date.now());
    logger.logError(error, {
      method: method?.toUpperCase() || "GET",
      path: url || "",
      duration,
      status: error.response?.status,
      service: "EXTERNAL",
    });
    return Promise.reject(error);
  }
);

export { axiosInstance };
