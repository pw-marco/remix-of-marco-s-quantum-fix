// scripts/cleanup-guests.ts
// Deletes guest users older than N days (default 7).
// Run:  npm run cleanup-guests        |  GUEST_MAX_AGE_DAYS=3 npm run cleanup-guests
import "dotenv/config";
import mongoose from "mongoose";
import dbConnect from "../lib/mongodb";
import User from "../models/User";

const DAYS = Number(process.env.GUEST_MAX_AGE_DAYS || 7);

async function run() {
  try {
    await dbConnect();
    const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
    const result = await User.deleteMany({ isGuest: true, createdAt: { $lt: cutoff } });
    console.log(`🧹 Removed ${result.deletedCount} guest users older than ${DAYS} day(s).`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  }
}

run();
