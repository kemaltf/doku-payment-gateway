# Doku Payment Gateway Package

A modular and reusable TypeScript package for integrating Doku Payment Gateway.

## Features

- **Easy Integration**: Simple wrapper for Doku API.
- **Customizable**: Enable/disable payment methods, configure fees (application side).
- **Secure**: Built-in signature generation and validation.
- **Robust**: Input validation using Zod and retry mechanism for API calls.
- **Typed**: Full TypeScript support with comprehensive types.

## Installation

```bash
npm install doku-payment-gateway
# or
yarn add doku-payment-gateway
```

## Usage

### 1. Initialize Client

```typescript
import { DokuClient } from "doku-payment-gateway";

const doku = new DokuClient({
  clientId: process.env.DOKU_CLIENT_ID,
  secretKey: process.env.DOKU_SECRET_KEY,
  isProduction: process.env.NODE_ENV === "production",
});
```

### 2. Create Payment

```typescript
const payment = await doku.createPayment({
  orderId: "INV-" + Date.now(),
  amount: 100000,
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "081234567890",
  returnUrl: "https://your-website.com/payment/complete",
  // Optional: Specify payment methods
  paymentMethodTypes: ["VIRTUAL_ACCOUNT_BCA", "CREDIT_CARD"],
});

if (payment.success) {
  // Redirect user to payment.paymentUrl
  console.log("Payment URL:", payment.paymentUrl);
} else {
  console.error("Payment failed:", payment.message);
}
```

### 3. Handle Notification (Webhook)

```typescript
// Next.js API Route Example
import { NextRequest, NextResponse } from "next/server";
import { DokuClient } from "doku-payment-gateway";

const doku = new DokuClient({ /* config */ });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("Signature");
  const timestamp = req.headers.get("Request-Timestamp");
  const requestId = req.headers.get("Request-Id");
  const clientId = req.headers.get("Client-Id");

  const isValid = doku.validateSignature(
    body,
    { signature, timestamp, requestId, clientId },
    "/api/doku/callback" // The path of this endpoint
  );

  if (!isValid) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const notification = JSON.parse(body);
  // Process notification...
  
  return NextResponse.json({ success: true });
}
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `clientId` | string | Your Doku Client ID |
| `secretKey` | string | Your Doku Secret Key |
| `isProduction` | boolean | Set to `true` for production environment |

## License

MIT

## Support

If you find this project useful and would like to support its development, you can sponsor me on GitHub: [https://github.com/sponsors/kemaltf](https://github.com/sponsors/kemaltf)
