/**
 * x402 Integration Example: Using smart layer with @x402/express middleware
 * 
 * This example shows how to combine x402-smart-layer with @x402/express
 * to validate requests before processing x402 payments.
 * 
 * Run: npm install @x402/express @x402/core @x402/svm
 * Then: npx ts-node --esm examples/x402-integration.ts
 */

import express from 'express';
import { createSmartLayer } from '../src/index.js';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';

const app = express();
app.use(express.json());

// ============================================
// Step 1: Configure Smart Layer Middleware
// ============================================
// This validates the request payload BEFORE payment processing
const smartLayer = createSmartLayer({
  endpoints: {
    '/image/nano-banana': {
      expectedRequest: {
        prompt: 'must be a non-empty string describing the image',
        aspect_ratio: 'must be one of: 16:9, 9:16, 1:1',
        style: 'optional string for style preference'
      }
    },
    '/token/generate-logo': {
      expectedRequest: {
        token_name: 'must be a non-empty string',
        description: 'must be a string describing the token',
        colors: 'must be an array of hex color codes'
      }
    }
  }
});

// ============================================
// Step 2: Setup x402 Resource Server
// ============================================
const facilitatorClient = new HTTPFacilitatorClient({ 
  url: 'https://x402.dexter.cash' 
});
const x402Server = new x402ResourceServer(facilitatorClient);

// Register SVM scheme for Solana
const solanaUsdcMint = process.env.SOLANA_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function atomicUsdcFromUsd(usd: number): string {
  return String(Math.round(usd * 1_000_000));
}

const svmScheme = new ExactSvmScheme().registerMoneyParser(async (amount, net) => {
  if (!String(net).startsWith('solana:')) return null;
  return { asset: solanaUsdcMint, amount: atomicUsdcFromUsd(amount) };
});

x402Server.register('solana:*', svmScheme);

// Initialize x402 server
let x402ServerInitPromise: Promise<void> | null = null;
async function ensureX402ServerInitialized() {
  if (!x402ServerInitPromise) {
    x402ServerInitPromise = x402Server.initialize().catch((e) => {
      x402ServerInitPromise = null;
      throw e;
    });
  }
  await x402ServerInitPromise;
}

// ============================================
// Step 3: Create x402 Payment Middleware
// ============================================
async function createX402PaymentMiddleware(priceUsd: number, resourceUrl: string) {
  await ensureX402ServerInitialized();
  
  const requirements = await x402Server.buildRequirements({
    amountAtomic: atomicUsdcFromUsd(priceUsd),
    resourceUrl: resourceUrl,
  });

  return paymentMiddleware({
    resourceServer: x402Server,
    requirements: requirements,
  });
}

// ============================================
// Step 4: Apply Middleware in Correct Order
// ============================================
// IMPORTANT: Smart layer should run BEFORE x402 payment middleware
// This ensures payload validation happens before payment processing

// Apply smart layer globally (or to specific routes)
app.use(smartLayer);

// ============================================
// Step 5: Define Protected Routes
// ============================================

// Route 1: Image generation endpoint
app.post('/image/nano-banana', async (req, res, next) => {
  // Create x402 payment middleware for this route
  const paymentMw = await createX402PaymentMiddleware(
    0.05, // $0.05 USD
    `${req.protocol}://${req.get('host')}${req.path}`
  );
  
  // Apply payment middleware
  return paymentMw(req, res, async () => {
    // This handler runs AFTER both smart layer and payment validation pass
    const validation = (req as any).smartLayerValidation;
    
    // Your business logic here
    res.json({
      success: true,
      message: 'Image generation request processed',
      validation: validation,
      data: {
        prompt: req.body.prompt,
        aspect_ratio: req.body.aspect_ratio,
        // ... process image generation
      }
    });
  });
});

// Route 2: Token logo generation endpoint
app.post('/token/generate-logo', async (req, res, next) => {
  const paymentMw = await createX402PaymentMiddleware(
    0.10, // $0.10 USD
    `${req.protocol}://${req.get('host')}${req.path}`
  );
  
  return paymentMw(req, res, async () => {
    // Business logic here
    res.json({
      success: true,
      message: 'Token logo generation request processed',
      data: req.body
    });
  });
});

// ============================================
// Alternative: Using Express Router for Cleaner Code
// ============================================
const router = express.Router();

// Apply smart layer to router
router.use(smartLayer);

router.post('/api/v1/image/generate', async (req, res, next) => {
  const paymentMw = await createX402PaymentMiddleware(
    0.05,
    `${req.protocol}://${req.get('host')}${req.originalUrl}`
  );
  
  return paymentMw(req, res, () => {
    res.json({ success: true, data: req.body });
  });
});

app.use(router);

// ============================================
// Health Check (no validation needed)
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, async () => {
  await ensureX402ServerInitialized();
  console.log(`🚀 x402 Server with Smart Layer running on http://localhost:${PORT}`);
  console.log(`\n📝 Test endpoints:`);
  console.log(`\n1. With payment header (validates payload, then processes payment):`);
  console.log(`   curl -X POST http://localhost:${PORT}/image/nano-banana \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "PAYMENT-SIGNATURE: <your-payment-signature>" \\`);
  console.log(`     -d '{"prompt":"A beautiful sunset","aspect_ratio":"16:9"}'`);
  console.log(`\n2. Without payment header (returns 402 Payment Required):`);
  console.log(`   curl -X POST http://localhost:${PORT}/image/nano-banana \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"prompt":"A beautiful sunset","aspect_ratio":"16:9"}'`);
  console.log(`\n3. Invalid payload (returns 400 validation error before payment):`);
  console.log(`   curl -X POST http://localhost:${PORT}/image/nano-banana \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -H "PAYMENT-SIGNATURE: <your-payment-signature>" \\`);
  console.log(`     -d '{"prompt":""}'`);
});
