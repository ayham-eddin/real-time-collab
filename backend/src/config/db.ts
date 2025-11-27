// backend/src/config/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

export const connectDB = async () => {
  try {
    // Disable auto index creation to prevent old indexes from returning
    mongoose.set("autoIndex", false);

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};
