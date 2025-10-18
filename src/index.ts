import type {
  ApiResponse,
  CacheEntry,
  ClientConfig,
  FlagEvaluationRequest,
} from "./interfaces";

/**
 * Dynamically imports the fetch implementation based on the environment.
 * @returns Promise<Function> - Returns the fetch implementation.
 */
async function getFetch(): Promise<typeof fetch> {
  // Browser environment
  if (typeof window !== "undefined" && window.fetch) {
    return window.fetch.bind(window);
  }

  // Node.js environment with global fetch (Node 18+)
  if (typeof globalThis !== "undefined" && globalThis.fetch) {
    return globalThis.fetch.bind(globalThis);
  }

  // Fallback to node-fetch for older Node.js versions
  try {
    const { default: fetch } = await import("node-fetch");
    return fetch as any;
  } catch (err) {
    throw new Error(
      "No fetch implementation available. Please install node-fetch for Node.js environments or use Node.js 18+."
    );
  }
}

const fetchImplementation = getFetch();

/**
 * Simple boolean feature flag client.
 */
export class OrbitFlagClient {
  private config: ClientConfig;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: ClientConfig) {
    this.config = {
      baseUrl: "https://orbitflag.appwrite.network",
      timeout: 5000,
      enableCaching: true,
      cacheTTL: 300000,
      ...config,
    };
  }

  /**
   * Get the team ID
   * @returns The team ID
   */
  get teamId(): string {
    return this.config.teamId;
  }

  /**
   * Get the context object
   * @returns The context object
   */
  get context(): Record<string, any> | undefined {
    return this.config.context;
  }

  /**
   * Evaluate a boolean feature flag
   * @param flagKey - The flag key
   * @param fallback - Fallback value if evaluation fails (defaults to false)
   * @returns Promise<boolean> - The flag value
   */
  async evaluate(flagKey: string, fallback: boolean = false): Promise<boolean> {
    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getCachedValue(flagKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      const response = await this.evaluateFlag(flagKey);

      if (response.data !== null) {
        const flagValue = Boolean(response.data);

        // Cache the result
        if (this.config.enableCaching) {
          this.setCachedValue(flagKey, flagValue);
        }

        return flagValue;
      }

      return fallback;
    } catch (error) {
      console.error(`Error evaluating flag ${flagKey}:`, error);
      return fallback;
    }
  }

  /**
   * Check if a feature flag exists and can be evaluated
   * @param flagKey - The flag key
   * @returns Promise<boolean> - Whether the flag exists and is accessible
   */
  async flagExists(flagKey: string): Promise<boolean> {
    try {
      const response = await this.evaluateFlag(flagKey);
      return response.isSuccess;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear the flag cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached value for a flag key
   * @param flagKey - The flag key
   * @returns The cached boolean value or null if not found/expired
   */
  private getCachedValue(flagKey: string): boolean | null {
    const entry = this.cache.get(flagKey);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(flagKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value for a flag key
   * @param flagKey - The flag key
   * @param value - The boolean value to cache
   */
  private setCachedValue(flagKey: string, value: boolean): void {
    this.cache.set(flagKey, {
      data: value,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL || 300000,
    });
  }

  /**
   * Evaluate a single flag by calling the API
   * @param flagKey - The flag key to evaluate
   * @returns Promise<ApiResponse<boolean>> - The API response
   */
  private async evaluateFlag(flagKey: string): Promise<ApiResponse<boolean>> {
    const request: FlagEvaluationRequest = {
      teamId: this.config.teamId,
      flagKey: flagKey,
      ...(this.config.context && { context: this.config.context }),
    };

    return this.fetchApi<boolean>("/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(request),
    });
  }

  /**
   * Generic method to fetch data from the API.
   * @param path - API endpoint path
   * @param options - Fetch options
   * @returns Promise<ApiResponse<T>> - Returns the API response.
   */
  private async fetchApi<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let isLoading = true;
    let data: T | null = null;
    let error: Error | null = null;

    try {
      const fetch = await fetchImplementation;
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      data = (await response.json()) as T;
    } catch (err: any) {
      if (err.name === "AbortError") {
        error = new Error("Request timeout");
      } else {
        error = err as Error;
      }
    } finally {
      isLoading = false;
    }

    return {
      data,
      error,
      isLoading,
      isError: error !== null,
      isSuccess: !isLoading && error === null && data !== null,
    };
  }
}

// Maintain backward compatibility
export class Client extends OrbitFlagClient {}

// Export types for convenience
export type { ClientConfig, FlagEvaluationRequest };
