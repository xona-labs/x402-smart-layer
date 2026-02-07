/**
 * Configuration for a single endpoint's validation rules
 */
export interface EndpointConfig {
  /**
   * Expected request structure - used to generate validation rules
   * The keys represent field names, values represent the expected structure
   */
  expectedRequest: Record<string, any>;
}

/**
 * Smart Layer configuration
 */
export interface SmartLayerConfig {
  /**
   * Endpoint configurations
   * Key is the route path (e.g., '/image/nano-banana')
   * Value is the endpoint configuration
   */
  endpoints: Record<string, EndpointConfig>;
  /**
   * Enable debug logging
   * When true, logs detailed information about validation process
   * @default false
   */
  debug?: boolean;
}

/**
 * Validation result from the smart layer API
 */
export interface ValidationResult {
  success: boolean;
  valid: boolean;
  errors: Array<{
    field: string;
    rule: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
  summary: string;
  validatedAt: string;
}

/**
 * Request object (Express-compatible)
 */
export interface Request {
  path: string;
  url?: string;
  method: string;
  body: any;
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Response object (Express-compatible)
 */
export interface Response {
  status: (code: number) => Response;
  json: (body: any) => void;
  send: (body: any) => void;
}

/**
 * Next function (Express-compatible)
 */
export type NextFunction = () => void;
