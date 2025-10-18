export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface ClientConfig {
  teamId: string;
  context?: Record<string, any>;
  baseUrl?: string;
  timeout?: number;
  enableCaching?: boolean;
  cacheTTL?: number;
}

export interface FlagEvaluationRequest {
  teamId: string;
  flagKey: string;
  context?: Record<string, any>;
}

export interface CacheEntry {
  data: boolean;
  timestamp: number;
  ttl: number;
}
