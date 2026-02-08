import { v4 as uuidv4 } from "uuid";
import { generateDigest, generateSignature } from "./utils/signature";
import { DokuConfig, DokuPaymentRequest, DokuPaymentResponse } from "./types";
import { ConfigSchema, PaymentRequestSchema } from "./schema";

export class DokuClient {
  private config: DokuConfig;
  private baseUrl: string;

  constructor(config: DokuConfig) {
    const validatedConfig = ConfigSchema.parse(config);
    this.config = validatedConfig;
    this.baseUrl = config.isProduction
      ? "https://api.doku.com"
      : "https://api-sandbox.doku.com";
  }

  /**
   * Generates the headers required for Doku API requests
   */
  private generateHeaders(
    requestId: string,
    requestTimestamp: string,
    requestTarget: string,
    body: string,
  ) {
    const digest = generateDigest(body);
    const signature = generateSignature(
      this.config.clientId,
      requestId,
      requestTarget,
      digest,
      this.config.secretKey,
      requestTimestamp,
    );

    return {
      "Content-Type": "application/json",
      "Client-Id": this.config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      Signature: signature,
    };
  }

  /**
   * Creates a payment request to Doku
   */
  async createPayment(
    paymentData: DokuPaymentRequest,
  ): Promise<DokuPaymentResponse> {
    try {
      // Validate input
      const validatedData = PaymentRequestSchema.parse(paymentData);

      const requestId = uuidv4();
      const requestTimestamp = new Date().toISOString().slice(0, 19) + "Z";
      const requestTarget = "/checkout/v1/payment";
      const expiredTime = paymentData.expiredTime || 60;

      // Default payment methods if not provided
      const defaultPaymentMethods = [
        "VIRTUAL_ACCOUNT_BCA",
        "VIRTUAL_ACCOUNT_BANK_MANDIRI",
        "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI",
        "VIRTUAL_ACCOUNT_DOKU",
        "VIRTUAL_ACCOUNT_BRI",
        "VIRTUAL_ACCOUNT_BNI",
        "VIRTUAL_ACCOUNT_BANK_PERMATA",
        "VIRTUAL_ACCOUNT_BANK_CIMB",
        "VIRTUAL_ACCOUNT_BANK_DANAMON",
        "ONLINE_TO_OFFLINE_ALFA",
        "CREDIT_CARD",
        "DIRECT_DEBIT_BRI",
        "EMONEY_SHOPEEPAY",
        "EMONEY_OVO",
        "QRIS",
        "PEER_TO_PEER_AKULAKU",
        "PEER_TO_PEER_KREDIVO",
        "PEER_TO_PEER_INDODANA",
      ];

      const requestBody = {
        order: {
          amount: validatedData.amount,
          invoice_number: validatedData.orderId,
          currency: "IDR",
          callback_url: validatedData.returnUrl,
        },
        payment: {
          payment_due_date: expiredTime,
          payment_method_types:
            validatedData.paymentMethodTypes || defaultPaymentMethods,
        },
        customer: {
          id: validatedData.customerEmail || "GUEST-" + requestId.slice(0, 8),
          name: validatedData.customerName,
          phone: validatedData.customerPhone,
          country: "ID",
        },
      };

      const requestBodyString = JSON.stringify(requestBody);
      const headers = this.generateHeaders(
        requestId,
        requestTimestamp,
        requestTarget,
        requestBodyString,
      );

      const response = await this.fetchWithRetry(
        `${this.baseUrl}${requestTarget}`,
        {
          method: "POST",
          headers,
          body: requestBodyString,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error?.message || "Failed to create payment",
          details: errorData,
        };
      }

      const result = await response.json();

      return {
        success: true,
        paymentUrl: result.response?.payment?.url || result.payment?.url,
        invoiceNumber:
          result.response?.order?.invoice_number ||
          result.order?.invoice_number,
        amount: result.response?.order?.amount || result.order?.amount,
      };
    } catch (error: any) {
      console.error("DOKU payment creation error:", error?.message || error);
      return {
        success: false,
        message: error?.message || "Internal server error",
        details: error,
      };
    }
  }

  /**
   * Verifies the signature of an incoming notification
   */
  verifyNotificationSignature(
    body: string,
    receivedSignature: string,
    timestamp: string,
    requestId: string,
  ): boolean {
    if (!receivedSignature || !timestamp || !requestId) {
      return false;
    }

    // In a real scenario, the requestTarget for callback needs to be known.
    // Doku usually sends it to the configured callback URL.
    // We assume the user knows the path or we extract it.
    // However, for signature verification, we need the exact path used in the signature generation.
    // The original code used "/api/doku/callback".
    // We should allow the user to pass the requestTarget or default to a common one.
    // But wait, the signature validation depends on the *path* the request was sent to.
    // So the user must provide the path of their webhook endpoint.

    // For now, I'll add requestTarget as a parameter
    return false; // Placeholder, see actual implementation below
  }

  validateSignature(
    body: string,
    headers: {
      signature: string;
      timestamp: string;
      requestId: string;
      clientId: string;
    },
    requestTarget: string,
  ): boolean {
    const {
      signature: receivedSignature,
      timestamp,
      requestId,
      clientId,
    } = headers;

    if (!receivedSignature || !timestamp || !requestId || !clientId) {
      return false;
    }

    if (clientId !== this.config.clientId) {
      return false;
    }

    const digest = generateDigest(body);
    const calculatedSignature = generateSignature(
      clientId,
      requestId,
      requestTarget,
      digest,
      this.config.secretKey,
      timestamp,
    );

    return calculatedSignature === receivedSignature;
  }

  /**
   * Simple retry mechanism for fetch
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (retries > 0 && response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }
}
