// Payment Request/Response Types
export interface DokuPaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  returnUrl: string;
  expiredTime?: number; // in minutes
  paymentMethodTypes?: string[];
}

export interface DokuPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  invoiceNumber?: string;
  amount?: number;
  message?: string;
  details?: any;
}

export interface DokuConfig {
  clientId: string;
  secretKey: string;
  isProduction: boolean;
}

// Base interfaces
export interface DokuBaseNotification {
  order: {
    invoice_number: string;
    amount: number;
  };
  transaction: {
    status: "SUCCESS" | "FAILED" | "EXPIRED";
    date: string;
    original_request_id?: string;
  };
  service: {
    id: string;
    name?: string;
  };
  acquirer: {
    id: string;
    name?: string;
  };
  channel: {
    id: string;
    name?: string;
  };
  customer?: {
    id?: string;
    doku_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    additional_info?: string;
  };
  additional_info?: any;
}

// Virtual Account Notification
export interface DokuVirtualAccountNotification extends DokuBaseNotification {
  service: {
    id: "VIRTUAL_ACCOUNT";
  };
  virtual_account_info: {
    virtual_account_number: string;
  };
  virtual_account_payment: {
    identifer?: Array<{
      name: string;
      value: string;
    }>;
    date?: string;
    reference_number?: string;
  };
}

// Online to Offline (Convenience Store) Notification
export interface DokuOnlineToOfflineNotification extends DokuBaseNotification {
  service: {
    id: "ONLINE_TO_OFFLINE";
  };
  online_to_offline_info: {
    payment_code: string;
  };
  online_to_offline_payment: {
    identifier: Array<{
      name: string;
      value: string;
    }>;
  };
}

// QRIS Notification
export interface DokuQrisNotification extends DokuBaseNotification {
  service: {
    id: "QRIS";
    name: "QRIS";
  };
  emoney_payment?: {
    account_id: string;
    approval_code: string;
  };
}

// Credit Card Notification
export interface DokuCreditCardNotification extends DokuBaseNotification {
  service: {
    id: "CREDIT_CARD";
  };
  transaction: {
    type: "SALE";
    status: "SUCCESS" | "FAILED" | "EXPIRED";
    date: string;
    original_request_id: string;
  };
  card_payment: {
    masked_card_number: string;
    approval_code: string;
    response_code: string;
    response_message: string;
    issuer: string;
  };
  authorize_id: string;
}

// Direct Debit Notification
export interface DokuDirectDebitNotification extends DokuBaseNotification {
  service: {
    id: "DIRECT_DEBIT";
  };
  card_payment: {
    masked_card_number: string;
    response_code: string;
    response_message: string;
    payment_id: string;
  };
}

// E-Wallet Notifications
export interface DokuEmoneyNotification extends DokuBaseNotification {
  service: {
    id: "EMONEY";
  };
  wallet?: {
    issuer: string;
    token_id: string;
    masked_phone_number: string;
    status: string;
  };
  shopeepay_configuration?: {
    merchant_ext_id: string;
    store_ext_id: string;
  };
  shopeepay_payment?: {
    transaction_status: string;
    transaction_message: string;
    identifier: Array<{
      name: string;
      value: string;
    }>;
  };
}

// Pay Later Notification
export interface DokuPayLaterNotification extends DokuBaseNotification {
  service: {
    id: "PEER_TO_PEER";
  };
  peer_to_peer_info: {
    virtual_account_number: string;
    created_date: string;
    expired_date: string;
    status: string;
    merchant_unique_reference: string;
    identifier: Array<{
      name: string;
      value: string;
    }>;
  };
  payment: {
    merchant_unique_reference: string;
  };
}

// Union type for all notifications
export type DokuNotificationData =
  | DokuVirtualAccountNotification
  | DokuOnlineToOfflineNotification
  | DokuQrisNotification
  | DokuCreditCardNotification
  | DokuDirectDebitNotification
  | DokuEmoneyNotification
  | DokuPayLaterNotification;

// Type guards
export function isVirtualAccountNotification(
  data: DokuNotificationData,
): data is DokuVirtualAccountNotification {
  return data.service.id === "VIRTUAL_ACCOUNT";
}

export function isOnlineToOfflineNotification(
  data: DokuNotificationData,
): data is DokuOnlineToOfflineNotification {
  return data.service.id === "ONLINE_TO_OFFLINE";
}

export function isQrisNotification(
  data: DokuNotificationData,
): data is DokuQrisNotification {
  return data.service.id === "QRIS";
}

export function isCreditCardNotification(
  data: DokuNotificationData,
): data is DokuCreditCardNotification {
  return data.service.id === "CREDIT_CARD";
}

export function isDirectDebitNotification(
  data: DokuNotificationData,
): data is DokuDirectDebitNotification {
  return data.service.id === "DIRECT_DEBIT";
}

export function isEmoneyNotification(
  data: DokuNotificationData,
): data is DokuEmoneyNotification {
  return data.service.id === "EMONEY";
}

export function isPayLaterNotification(
  data: DokuNotificationData,
): data is DokuPayLaterNotification {
  return data.service.id === "PEER_TO_PEER";
}
