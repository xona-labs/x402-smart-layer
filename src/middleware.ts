import type { Request, Response, NextFunction, SmartLayerConfig, ValidationResult } from './types/index.js';
import { validateRequest } from './service.js';

// Console is available in Node.js runtime
declare const console: {
  error: (...args: any[]) => void;
};

/**
 * Check if request has payment headers
 */
function hasPaymentHeaders(req: Request): boolean {
  const headers = req.headers;
  return !!(
    headers['x-payment'] ||
    headers['X-PAYMENT'] ||
    headers['payment-signature'] ||
    headers['PAYMENT-SIGNATURE']
  );
}

/**
 * Create smart layer middleware
 */
export function createSmartLayer(config: SmartLayerConfig) {
  const endpoints = config.endpoints;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this route is configured
      const routePath = req.path || (req.url ? req.url.split('?')[0] : '') || '';
      const endpointConfig = endpoints[routePath];

      if (!endpointConfig) {
        // Route not configured, skip validation
        return next();
      }

      // Only process if payment headers are present
      if (!hasPaymentHeaders(req)) {
        // No payment headers, skip validation
        return next();
      }

      // Validate the request body against expected structure
      const payload = req.body || {};
      const validationResult: ValidationResult = await validateRequest(
        endpointConfig.expectedRequest,
        payload
      );

      // If validation failed, return error
      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: 'Request validation failed',
          validation: {
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            summary: validationResult.summary,
          },
        });
      }

      // Validation passed, continue to next middleware
      // Attach validation result to request for potential use downstream
      (req as any).smartLayerValidation = validationResult;
      next();
    } catch (error: any) {
      // Log error (console is available in Node.js runtime)
      if (typeof console !== 'undefined' && console.error) {
        console.error('[x402-smart-layer] Validation error:', error);
      }
      return res.status(500).json({
        success: false,
        error: 'Validation service error',
        message: error.message || 'Internal validation error',
      });
    }
  };
}
