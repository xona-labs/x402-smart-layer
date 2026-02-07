# Examples

This folder contains example implementations of `@xona-labs/x402-smart-layer` with x402 endpoints.

## Prerequisites

```bash
npm install
npm install @x402/express @x402/core @x402/svm
npm run build
```

## Running the Example

### x402 Integration Example

Complete example showing how to combine smart layer with `@x402/express`:

```bash
npm run example:x402
```

Or directly:

```bash
npx ts-node --esm examples/x402-integration.ts
```

## What the Example Shows

1. **Smart Layer Setup** - Configure validation rules for endpoints
2. **x402 Resource Server** - Setup with Solana SVM scheme
3. **Middleware Order** - Smart layer runs before payment middleware
4. **Protected Routes** - Routes that validate payloads before processing payments
5. **Error Handling** - Proper 400 responses for validation failures, 402 for payment required

## Testing the Example

Each example server will print curl commands you can use to test the endpoints.

### Test Cases

1. **With payment header + valid payload** - Validates the request, then processes payment
2. **Without payment header** - Returns 402 Payment Required
3. **Invalid payload** - Returns 400 validation error before payment processing
4. **Unconfigured route** - Skips validation

## Example Output

When validation succeeds and payment is processed:
```json
{
  "success": true,
  "message": "Image generation request processed",
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "summary": "Validation completed"
  },
  "data": {
    "prompt": "A beautiful sunset",
    "aspect_ratio": "16:9"
  }
}
```

When validation fails (before payment):
```json
{
  "success": false,
  "error": "Request validation failed",
  "validation": {
    "errors": [
      {
        "field": "prompt",
        "rule": "must be a non-empty string",
        "message": "prompt field is empty"
      }
    ],
    "summary": "Validation failed"
  }
}
```

When payment is required:
```json
{
  "error": "Payment Required",
  "accepts": [...],
  "x402Version": 2
}
```
