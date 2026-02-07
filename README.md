# 🔒 x402-smart-layer

[![npm version](https://img.shields.io/npm/v/@xona-labs/x402-smart-layer.svg)](https://www.npmjs.com/package/@xona-labs/x402-smart-layer)
[![Protocol](https://img.shields.io/badge/Protocol-x402-blue)](https://docs.cdp.coinbase.com/x402/welcome)

**x402-smart-layer** is an Express middleware that provides AI-powered request validation for x402 endpoints. It automatically validates incoming requests against expected structures using Gemini AI, ensuring payload integrity before processing.

## ✨ Features

- 🤖 **AI-Powered Validation**: Uses Gemini AI to intelligently validate requests against flexible rules
- 🔒 **Payment-Aware**: Only processes requests with x402 payment headers (`X-PAYMENT` or `PAYMENT-SIGNATURE`)
- 🎯 **Route-Specific**: Configure validation rules per endpoint
- 🚀 **Zero Config**: Works out of the box with sensible defaults
- 📦 **TypeScript**: Full TypeScript support with type definitions

## 📦 Installation

```bash
npm install @xona-labs/x402-smart-layer
# or
bun add @xona-labs/x402-smart-layer
```

## 🚀 Quick Start

```typescript
import express from 'express';
import { createSmartLayer } from '@xona-labs/x402-smart-layer';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';

const app = express();
app.use(express.json());

// Configure smart layer middleware
const smartLayer = createSmartLayer({
  endpoints: {
    '/image/nano-banana': {
      expectedRequest: {
        prompt: 'must be a non-empty string describing the image',
        aspect_ratio: 'must be one of: 16:9, 9:16, 1:1',
        style: 'optional string for style preference'
      }
    }
  }
});

// Apply smart layer first (validates payload before payment)
app.use(smartLayer);

// Setup x402 resource server
const x402Server = new x402ResourceServer(/* ... */);

// Your protected route
app.post('/image/nano-banana', 
  paymentMiddleware({ resourceServer: x402Server, /* ... */ }),
  (req, res) => {
    // Request is validated and payment is settled
    res.json({ success: true, data: req.body });
  }
);
```

## 🛠 API Reference

### `createSmartLayer(config)`

Creates Express middleware for smart validation.

#### Parameters

- `config` (`SmartLayerConfig`):
  - `endpoints` (Record<string, EndpointConfig>): Map of route paths to their configurations
    - `expectedRequest` (Record<string, any>): Expected request structure

#### Returns

Express middleware function that:
- Only processes requests to configured endpoints
- Only validates requests with `X-PAYMENT` or `PAYMENT-SIGNATURE` headers
- Returns 400 if validation fails
- Attaches validation result to `req.smartLayerValidation` on success

## 📝 Example

See [`examples/x402-integration.ts`](./examples/x402-integration.ts) for a complete working example with x402 endpoints.

Run the example:

```bash
npm install
npm install @x402/express @x402/core @x402/svm
npm run build
npm run example
```

Or directly:

```bash
npx ts-node --esm examples/x402-integration.ts
```

## 🔍 How It Works

1. **Route Matching**: Middleware checks if the incoming request path matches a configured endpoint
2. **Payment Detection**: Only processes requests with `X-PAYMENT` or `PAYMENT-SIGNATURE` headers
3. **Rule Generation**: Generates validation rules from the `expectedRequest` structure
4. **AI Validation**: Calls the smart layer API (powered by Gemini) to validate the payload
5. **Response**: Returns 400 if validation fails, otherwise continues to next middleware

## 🔗 Integration with x402

The smart layer is designed to work seamlessly with `@x402/express` middleware. Apply the smart layer **before** x402 payment middleware to validate payloads before processing payments.

**Important**: The smart layer only processes requests with `X-PAYMENT` or `PAYMENT-SIGNATURE` headers, making it perfect for protecting x402 endpoints.

See [`examples/x402-integration.ts`](./examples/x402-integration.ts) for a complete example showing:
- x402 resource server setup
- Smart layer configuration
- Protected route implementation
- Proper middleware ordering

## 🛡 Security

- Only validates requests with payment headers (x402 protocol requirement)
- Validation happens before your route handlers
- Failed validations return clear error messages

## 📄 License

MIT © Xona Labs
