import { z } from "zod";

export const PaymentRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  amount: z.number().positive("Amount must be positive"),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(1, "Phone number is required"),
  description: z.string().optional(),
  returnUrl: z.string().url("Invalid return URL"),
  expiredTime: z.number().positive("Expired time must be positive").optional(),
  paymentMethodTypes: z.array(z.string()).optional(),
});

export const ConfigSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  secretKey: z.string().min(1, "Secret Key is required"),
  isProduction: z.boolean(),
});
