import pino from "pino";

export type ServiceName = "INTERNAL" | "OPENAI" | "SERPAPI" | string;

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
  logRequest({
    method,
    path,
    duration,
    status,
    service = "INTERNAL",
  }: {
    method: string;
    path: string;
    duration: number;
    status: number;
    service?: ServiceName;
  }) {
    pinoLogger.info(
      {
        level: "INFO",
        type: method,
        duration,
        path,
        service,
        status,
      },
      "HTTP request successful"
    );
  }

  logError(
    error: unknown,
    {
      method,
      path,
      duration,
      status,
      service = "INTERNAL",
    }: {
      method?: string;
      path?: string;
      duration?: number;
      status?: number;
      service?: ServiceName;
    } = {}
  ) {
    pinoLogger.error(
      {
        level: "ERROR",
        type: method,
        duration,
        path,
        service,
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
