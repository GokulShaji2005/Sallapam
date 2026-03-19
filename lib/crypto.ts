// // lib/crypto.ts
// import nacl from 'tweetnacl'
// import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

// // ─── Key Generation ───────────────────────────────────────────

// export function generateKeyPair() {
//     const keyPair = nacl.box.keyPair()
//     return {
//         publicKey: encodeBase64(keyPair.publicKey),   // safe to send to server
//         privateKey: encodeBase64(keyPair.secretKey),   // NEVER send to server
//     }
// }

// // ─── Private Key Storage (encrypted in localStorage) ──────────

// // Derives a 32-byte AES key from the user's password using PBKDF2
// async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
//     const keyMaterial = await crypto.subtle.importKey(
//         'raw', encodeUTF8(password), 'PBKDF2', false, ['deriveKey']
//     )
//     return crypto.subtle.deriveKey(
//         { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
//         keyMaterial,
//         { name: 'AES-GCM', length: 256 },
//         false,
//         ['encrypt', 'decrypt']
//     )
// }

// export async function savePrivateKey(privateKey: string, password: string) {
//     const salt = crypto.getRandomValues(new Uint8Array(16))
//     const iv = crypto.getRandomValues(new Uint8Array(12))
//     const key = await deriveKey(password, salt)

//     const encrypted = await crypto.subtle.encrypt(
//         { name: 'AES-GCM', iv },
//         key,
//         encodeUTF8(privateKey)
//     )

//     // Store salt + iv + ciphertext together as base64
//     const payload = {
//         salt: encodeBase64(salt),
//         iv: encodeBase64(iv),
//         encrypted: encodeBase64(new Uint8Array(encrypted)),
//     }
//     localStorage.setItem('_pk', JSON.stringify(payload))
// }

// export async function loadPrivateKey(password: string): Promise<string | null> {
//     try {
//         const raw = localStorage.getItem('_pk')
//         if (!raw) return null

//         const { salt, iv, encrypted } = JSON.parse(raw)
//         const key = await deriveKey(password, decodeBase64(salt))

//         const decrypted = await crypto.subtle.decrypt(
//             { name: 'AES-GCM', iv: decodeBase64(iv) },
//             key,
//             decodeBase64(encrypted)
//         )
//         return decodeUTF8(new Uint8Array(decrypted))
//     } catch {
//         return null // wrong password or corrupted storage
//     }
// }

// // ─── Encryption / Decryption ──────────────────────────────────

// export function encryptMessage(
//     plaintext: string,
//     recipientPublicKey: string,
//     senderPrivateKey: string
// ): { encryptedContent: string; nonce: string } {
//     const nonce = nacl.randomBytes(nacl.box.nonceLength)
//     const msgBytes = encodeUTF8(plaintext)
//     const encrypted = nacl.box(
//         msgBytes,
//         nonce,
//         decodeBase64(recipientPublicKey),
//         decodeBase64(senderPrivateKey)
//     )
//     return {
//         encryptedContent: encodeBase64(encrypted),
//         nonce: encodeBase64(nonce),
//     }
// }

// export function decryptMessage(
//     encryptedContent: string,
//     nonce: string,
//     senderPublicKey: string,
//     ownPrivateKey: string
// ): string | null {
//     try {
//         const decrypted = nacl.box.open(
//             decodeBase64(encryptedContent),
//             decodeBase64(nonce),
//             decodeBase64(senderPublicKey),
//             decodeBase64(ownPrivateKey)
//         )
//         if (!decrypted) return null
//         return decodeUTF8(decrypted)
//     } catch {
//         return null
//     }
// }