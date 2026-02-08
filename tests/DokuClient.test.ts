import { DokuClient } from "../src/DokuClient";
import { generateSignature, generateDigest } from "../src/utils/signature";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("DokuClient", () => {
  const config = {
    clientId: "TEST-CLIENT-ID",
    secretKey: "TEST-SECRET-KEY",
    isProduction: false,
  };

  const client = new DokuClient(config);

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("createPayment", () => {
    it("should create a payment successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              payment: { url: "https://example.com/payment" },
              order: { invoice_number: "INV-123", amount: 10000 },
            },
          }),
      });

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors correctly", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { message: "Invalid Request" },
          }),
      });

      const paymentData = {
        orderId: "INV-FAIL",
        amount: 10000,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "08123456789",
        returnUrl: "https://example.com/callback",
      };

      const response = await client.createPayment(paymentData);

      expect(response.success).toBe(false);
      expect(response.message).toBe("Invalid Request");
    });

    it("should fail validation for invalid email", async () => {
      const paymentData = {
        orderId: "INV-123",
        amount: 10000,
        customerName: "John Doe",
        customerEmail: "invalid-email", // Invalid
        customerPhone: "08123456789",
        returnUrl: "https://example.com/callback",
      };

      // Zod validation throws error, which is caught in createPayment
      const response = await client.createPayment(paymentData);

      expect(response.success).toBe(false);
      expect(response.message).toBe("Internal server error");
      // Check if details contain validation error info
      expect(response.details).toBeDefined();
    });

    it("should retry on 500 errors and eventually succeed", async () => {
      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      // Second call fails with 502
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      });
      // Third call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              payment: { url: "https://example.com/payment" },
              order: { invoice_number: "INV-RETRY", amount: 10000 },
            },
          }),
      });

      const paymentData = {
        orderId: "INV-RETRY",
        amount: 10000,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "08123456789",
        returnUrl: "https://example.com/callback",
      };

      const response = await client.createPayment(paymentData);

      expect(response.success).toBe(true);
      expect(response.invoiceNumber).toBe("INV-RETRY");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for retries

    it("should retry on network errors and fail after max retries", async () => {
      mockFetch.mockRejectedValue(new Error("Network Error"));

      const paymentData = {
        orderId: "INV-NET-FAIL",
        amount: 10000,
        customerName: "John Doe",
        customerEmail: "john@example.com",
        customerPhone: "08123456789",
        returnUrl: "https://example.com/callback",
      };

      const response = await client.createPayment(paymentData);

      expect(response.success).toBe(false);
      expect(response.message).toBe("Internal server error");
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 10000);
  });

  describe("validateSignature", () => {
    it("should return true for valid signature", () => {
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
        timestamp,
      );

      const isValid = client.validateSignature(
        body,
        {
          signature,
          timestamp,
          requestId,
          clientId: config.clientId,
        },
        requestTarget,
      );

      expect(isValid).toBe(true);
    });

    it("should return false if signature does not match", () => {
      const body = JSON.stringify({ order: { invoice_number: "INV-123" } });
      const requestId = "req-123";
      const timestamp = "2023-01-01T00:00:00Z";
      const requestTarget = "/api/callback";

      const isValid = client.validateSignature(
        body,
        {
          signature: "HMACSHA256=invalid-signature",
          timestamp,
          requestId,
          clientId: config.clientId,
        },
        requestTarget,
      );

      expect(isValid).toBe(false);
    });

    it("should return false if client ID mismatch", () => {
      const body = JSON.stringify({});
      const requestId = "req-123";
      const timestamp = "2023-01-01T00:00:00Z";
      const requestTarget = "/api/callback";

      const isValid = client.validateSignature(
        body,
        {
          signature: "some-sig",
          timestamp,
          requestId,
          clientId: "WRONG-CLIENT-ID",
        },
        requestTarget,
      );

      expect(isValid).toBe(false);
    });

    it("should return false if missing headers", () => {
      const body = JSON.stringify({});
      const requestTarget = "/api/callback";

      // @ts-ignore - Testing missing fields
      const isValid = client.validateSignature(
        body,
        {
          signature: "some-sig",
          // timestamp missing
          requestId: "req-123",
          clientId: config.clientId,
        } as any,
        requestTarget,
      );

      expect(isValid).toBe(false);
    });
  });
});
