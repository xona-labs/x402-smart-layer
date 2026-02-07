import type { ValidationResult } from './types/index.js';

// Console is available in Node.js runtime
declare const console: {
  log: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  debug?: (...args: any[]) => void;
};

const API_BASE_URL = 'https://api.xona-agent.com';

/**
 * Generate validation rules from expected request structure
 * Values in expectedRequest can be:
 * - String descriptions (used directly as rules)
 * - Example values (used to infer type and generate descriptions)
 */
function generateRulesFromExpectedRequest(expectedRequest: Record<string, any>): Record<string, string> {
  const rules: Record<string, string> = {};
  
  for (const [field, value] of Object.entries(expectedRequest)) {
    if (value === null || value === undefined) {
      rules[field] = 'field is optional';
      continue;
    }
    
    const type = typeof value;
    
    // If it's a string, treat it as a description (rule) directly
    // This allows users to provide descriptions like "must be a valid email address"
    if (type === 'string') {
      // If it looks like a description (contains words like "must", "should", "required", etc.)
      // or is longer than a typical example value, use it as-is
      if (value.length > 20 || 
          /must|should|required|valid|match|be\s+(a|an)/i.test(value)) {
        rules[field] = value;
      } else {
        // Short string might be an example, generate description
        rules[field] = `must be a non-empty string${value ? ` (example: ${value})` : ''}`;
      }
    } else if (type === 'number') {
      rules[field] = `must be a number${value !== undefined ? ` (example: ${value})` : ''}`;
    } else if (type === 'boolean') {
      rules[field] = `must be a boolean${value !== undefined ? ` (example: ${value})` : ''}`;
    } else if (Array.isArray(value)) {
      rules[field] = `must be an array${value.length > 0 ? ` with ${value.length} element(s)` : ''}`;
    } else if (type === 'object') {
      rules[field] = 'must be an object matching the expected structure';
    } else {
      rules[field] = `must match the expected type and structure`;
    }
  }
  
  return rules;
}

/**
 * Call the smart layer API to validate payload against rules
 */
export async function validatePayload(
  rules: Record<string, string>,
  payload: Record<string, any>,
  debug: boolean = false
): Promise<ValidationResult> {
  if (debug) {
    console.log(`[x402-smart-layer] Calling validation API with rules:`, JSON.stringify(rules, null, 2));
  }

  const requestBody = {
    rules,
    payload,
  };

  if (debug) {
    console.log(`[x402-smart-layer] API request body:`, JSON.stringify(requestBody, null, 2));
  }

  const response = await fetch(`${API_BASE_URL}/x402-smart-layer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (debug) {
    console.log(`[x402-smart-layer] API response status: ${response.status}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Validation request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    if (debug) {
      console.log(`[x402-smart-layer] API error:`, errorMessage);
    }
    throw new Error(errorMessage);
  }

  const result = await response.json() as ValidationResult;
  if (debug) {
    console.log(`[x402-smart-layer] API response:`, JSON.stringify(result, null, 2));
  }
  return result;
}

/**
 * Generate rules and validate payload
 */
export async function validateRequest(
  expectedRequest: Record<string, any>,
  payload: Record<string, any>,
  debug: boolean = false
): Promise<ValidationResult> {
  const rules = generateRulesFromExpectedRequest(expectedRequest);
  if (debug) {
    console.log(`[x402-smart-layer] Generated rules from expected request:`, JSON.stringify(rules, null, 2));
  }
  return validatePayload(rules, payload, debug);
}
