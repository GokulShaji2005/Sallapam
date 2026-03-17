// lib/crypto.ts — TweetNaCl helpers (Phase 4: End-to-End Encryption)
// Install: npm install tweetnacl tweetnacl-util

import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";

/**
 * Generate a new X25519 key pair for Diffie-Hellman key exchange
 */
export function generateKeyPair() {
  return nacl.box.keyPair();
}

/**
 * Encrypt a message using the recipient's public key and sender's secret key
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msgUint8 = encodeUTF8(message);
  const encrypted = nacl.box(msgUint8, nonce, recipientPublicKey, senderSecretKey);
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt a message using the sender's public key and recipient's secret key
 */
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string | null {
  const decrypted = nacl.box.open(
    decodeBase64(ciphertext),
    decodeBase64(nonce),
    senderPublicKey,
    recipientSecretKey
  );
  if (!decrypted) return null;
  return decodeUTF8(decrypted);
}

export { encodeBase64, decodeBase64 };
