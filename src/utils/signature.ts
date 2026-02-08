import CryptoJS from "crypto-js";

// Generate digest sesuai dokumentasi DOKU
export function generateDigest(jsonBody: string): string {
  const hash = CryptoJS.SHA256(jsonBody);
  return CryptoJS.enc.Base64.stringify(hash);
}

// Generate signature sesuai dokumentasi DOKU
export function generateSignature(
  clientId: string,
  requestId: string,
  requestTarget: string,
  digest: string,
  secretKey: string,
  requestTimestamp: string
): string {
  // Prepare Signature Component sesuai dokumentasi
  let componentSignature = "Client-Id:" + clientId;
  componentSignature += "\n";
  componentSignature += "Request-Id:" + requestId;
  componentSignature += "\n";
  componentSignature += "Request-Timestamp:" + requestTimestamp;
  componentSignature += "\n";
  componentSignature += "Request-Target:" + requestTarget;
  if (digest) {
    componentSignature += "\n";
    componentSignature += "Digest:" + digest;
  }

  // Calculate HMAC-SHA256 base64
  const hmac256Value = CryptoJS.HmacSHA256(componentSignature, secretKey);
  const signature = CryptoJS.enc.Base64.stringify(hmac256Value);

  return "HMACSHA256=" + signature;
}
