
// lib/firebase-admin.ts
import admin from "firebase-admin"

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")

  // Fail loudly at startup if any credential is missing
  // Better to crash here than get a confusing error inside an API route
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Check FIREBASE_ADMIN_PROJECT_ID, " +
      "FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY in .env.local"
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

// Export specific services instead of the whole admin object
// This way each file imports only what it needs
export const adminAuth = admin.auth()
export const adminStorage = admin.storage()
export default admin