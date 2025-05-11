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
    pinoLogger.info(
      {
        level: "INFO",
        method,
        duration,
        path: getPath(path),
        service: getService(path),
        status,
      },
      `HTTP ${status ? "response" : "request"} successful`
    );
  }

  logError(
    error: unknown,
    {
      method = "GET",
      path = "Unknown",
      duration = 0,
      status = 500,
    }: ILogRequest
  ) {
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
