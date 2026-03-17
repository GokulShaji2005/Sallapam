import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

// Extend the global type to cache the mongoose connection
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

let cached = global._mongooseConn;

if (!cached) {
  cached = global._mongooseConn = null;
}

export async function connectToDatabase() {
  if (cached) return cached;

  cached = await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });

  global._mongooseConn = cached;
  return cached;
}
