// Packages
import pino from "pino";

// Utils
import { getPath, getService } from "./loggerHelpers";

// Types
import { ILogRequest } from "~/types/logger.types";

const pinoLogger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: false,
      translateTime: "SYS:standard",
      messageFormat: false,
      ignore: "pid,hostname,time", // Only show what we want
    },
  },
  level: "info",
});

class Logger {
  logRequest({ method, path, duration, status }: ILogRequest) {
    const isError = status && status >= 400;
    const message = `HTTP ${status ? `response ${isError ? "error" : "successful"}` : "request sent"}`;
    const payload = {
      level: isError ? "WARN" : "INFO",
      method,
      duration,
      path: getPath(path),
      service: getService(path),
      status,
    };

    if (isError) {
      pinoLogger.warn(payload, message);
    } else {
      pinoLogger.info(payload, message);
    }
  }

  logError(error: unknown, context?: Partial<ILogRequest>) {
    const method = context?.method ?? "GET";
    const path = context?.path ?? "Unknown";
    const duration = context?.duration ?? 0;
    const status = context?.status ?? 500;

    pinoLogger.error(
      {
        level: "ERROR",
        method,
        duration,
        path: getPath(path),
        service: getService(path),
        status,
        err:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      },
      "Request failed"
    );
  }
}

const logger = new Logger();

export { logger };
