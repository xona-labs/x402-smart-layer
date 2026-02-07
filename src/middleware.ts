import type { Request, Response, NextFunction, SmartLayerConfig, ValidationResult } from './types/index.js';
import { validateRequest } from './service.js';

// Console is available in Node.js runtime
declare const console: {
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
  debug?: (...args: any[]) => void;
};

/**
 * Create smart layer middleware
 * 
 * This middleware validates request payloads BEFORE payment processing.
 * It runs whenever a request body is present for configured routes,
 * regardless of payment headers. This ensures payload validation happens
 * before any payment-related processing.
 */
export function createSmartLayer(config: SmartLayerConfig) {
  const endpoints = config.endpoints;
  const debug = config.debug ?? false;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if this route is configured
      // Try multiple path properties to handle different Express setups
      // Express may use req.path, req.originalUrl, or req.url depending on middleware order
      let routePath = req.path;
      if (!routePath || routePath === '/') {
        // Fallback to req.url or req.originalUrl
        const url = req.url || (req as any).originalUrl || '';
        routePath = url.split('?')[0] || '';
      }
      // Normalize path (remove trailing slash except for root)
      if (routePath.length > 1 && routePath.endsWith('/')) {
        routePath = routePath.slice(0, -1);
      }
      const endpointConfig = endpoints[routePath];

      if (debug) {
        console.log(`[x402-smart-layer] ===== Middleware called =====`);
        console.log(`[x402-smart-layer] Method: ${req.method}`);
        console.log(`[x402-smart-layer] Route path: ${routePath}`);
        console.log(`[x402-smart-layer] req.path: ${req.path || 'undefined'}`);
        console.log(`[x402-smart-layer] req.url: ${req.url || 'undefined'}`);
        console.log(`[x402-smart-layer] Configured endpoints:`, Object.keys(endpoints));
      }

      if (!endpointConfig) {
        // Route not configured, skip validation
        if (debug) {
          console.log(`[x402-smart-layer] Route ${routePath} not configured, skipping validation`);
        }
        return next();
      }

      // Check if request body exists and has content
      // Only validate if there's actual payload data (skip empty objects {})
      const payload = req.body;
      // Check if body exists and has at least one property
      const hasPayload = payload !== undefined && 
                        payload !== null && 
                        typeof payload === 'object' &&
                        !Array.isArray(payload) &&
                        Object.keys(payload).length > 0;
      
      if (debug) {
        console.log(`[x402-smart-layer] Payload exists: ${hasPayload}`);
        console.log(`[x402-smart-layer] Payload keys count: ${payload && typeof payload === 'object' ? Object.keys(payload).length : 0}`);
        console.log(`[x402-smart-layer] Request body:`, JSON.stringify(payload, null, 2));
      }

      if (!hasPayload) {
        // No payload or empty payload, skip validation (let other middleware handle it)
        // This typically happens for GET requests, requests without body, or empty JSON objects {}
        if (debug) {
          console.log(`[x402-smart-layer] No payload or empty payload, skipping validation`);
        }
        return next();
      }

      // Validate the request body against expected structure
      // This runs BEFORE payment processing to catch invalid payloads early
      if (debug) {
        console.log(`[x402-smart-layer] Validating payload for ${routePath}:`, JSON.stringify(payload, null, 2));
        console.log(`[x402-smart-layer] Expected request structure:`, JSON.stringify(endpointConfig.expectedRequest, null, 2));
      }

      const validationResult: ValidationResult = await validateRequest(
        endpointConfig.expectedRequest,
        payload,
        debug
      );

      if (debug) {
        console.log(`[x402-smart-layer] Validation result:`, JSON.stringify(validationResult, null, 2));
      }

      // If validation failed, return error
      if (!validationResult.valid) {
        if (debug) {
          console.log(`[x402-smart-layer] Validation failed for ${routePath}`);
        }
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
      if (debug) {
        console.log(`[x402-smart-layer] Validation passed for ${routePath}, continuing to next middleware`);
      }
      next();
    } catch (error: any) {
      // Log error (console is available in Node.js runtime)
      if (typeof console !== 'undefined' && console.error) {
        console.error('[x402-smart-layer] Validation error:', error);
      }
      if (debug) {
        console.log(`[x402-smart-layer] Error details:`, error.stack || error.message);
      }
      return res.status(500).json({
        success: false,
        error: 'Validation service error',
        message: error.message || 'Internal validation error',
      });
    }
  };
}
