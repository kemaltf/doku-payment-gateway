import { DokuClient } from "../src/DokuClient";
import { generateSignature, generateDigest } from "../src/utils/signature";

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        response: {
          payment: { url: "https://example.com/payment" },
          order: { invoice_number: "INV-123", amount: 10000 },
        },
      }),
  })
) as jest.Mock;

describe("DokuClient", () => {
  const config = {
    clientId: "TEST-CLIENT-ID",
    secretKey: "TEST-SECRET-KEY",
    isProduction: false,
  };

  const client = new DokuClient(config);

  it("should create a payment successfully", async () => {
    const paymentData = {
      orderId: "INV-123",
      amount: 10000,
      customerName: "John Doe",
      customerEmail: "john@example.com",
      customerPhone: "08123456789",
      returnUrl: "https://example.com/callback",
    };

    const response = await client.createPayment(paymentData);

    expect(response.success).toBe(true);
    expect(response.paymentUrl).toBe("https://example.com/payment");
    expect(response.invoiceNumber).toBe("INV-123");
  });

  it("should validate signature correctly", () => {
    const body = JSON.stringify({ order: { invoice_number: "INV-123" } });
    const requestId = "req-123";
    const timestamp = "2023-01-01T00:00:00Z";
    const requestTarget = "/api/callback";
    const digest = generateDigest(body);
    
    const signature = generateSignature(
      config.clientId,
      requestId,
      requestTarget,
      digest,
      config.secretKey,
      timestamp
    );

    const isValid = client.validateSignature(
      body,
      {
        signature,
        timestamp,
        requestId,
        clientId: config.clientId,
      },
      requestTarget
    );

    expect(isValid).toBe(true);
  });
});
