import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO;

// Global cache for MongoDB connection (works across re-renders on Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectToDb = async () => {
  if (cached.conn) {
    console.log("🟢 Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => {
      console.log("✅ Connected to MongoDB:", mongoose.connection.name);
      return mongoose;
    }).catch((err) => {
      console.error("❌ Error connecting to MongoDB:", err.message);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
