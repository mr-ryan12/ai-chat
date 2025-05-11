export interface ILogRequest {
  method: string;
  path: string;
  duration: number;
  status?: number;
  service?: TServiceName;
}

export type TServiceName = "INTERNAL" | "OPENAI" | "SERPAPI" | string;
