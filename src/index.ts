/**
 * @xona-labs/x402-smart-layer
 * Smart validation layer middleware for x402 endpoints using AI-powered rule validation
 */

export { createSmartLayer } from './middleware.js';
export { validatePayload, validateRequest } from './service.js';
export type {
  SmartLayerConfig,
  EndpointConfig,
  ValidationResult,
  Request,
  Response,
  NextFunction,
} from './types/index.js';
