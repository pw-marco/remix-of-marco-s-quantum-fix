// scripts/reset-password.ts
// Run:  npm run reset-password
// Optional: ADMIN_PASSWORD="NewPass123" npm run reset-password
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "../lib/mongodb";
import ServerConfig from "../models/ServerConfig";

const NEW_PASSWORD = process.env.ADMIN_PASSWORD || "Mdsaad#@!12345";
const USERNAME = process.env.ADMIN_USERNAME || "pwmarcofounder@gmail.com";

async function resetPassword() {
  try {
    console.log("🔄 Resetting admin password...");
    await dbConnect();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    const result = await ServerConfig.updateOne(
      { _id: 1 },
      { $set: { password: hashedPassword, username: USERNAME } }
    );
    console.log("📊 Update Result:", result);

    const config: any = await ServerConfig.findById(1).lean();
    if (!config) {
      console.error("❌ No ServerConfig found. Run `npm run setup` first.");
      process.exit(1);
    }

    const isValid = await bcrypt.compare(NEW_PASSWORD, config.password);
    console.log("🔐 Verification:", isValid ? "✅ VALID" : "❌ INVALID");

    if (isValid) {
      console.log(`🎉 Done! Login with:\n   username: ${USERNAME}\n   password: ${NEW_PASSWORD}`);
    } else {
      console.log("⚠️ Still invalid — trying a direct MongoDB update...");
      const db = mongoose.connection.db;
      const collection = db!.collection("serverconfigs");
      const result2 = await collection.updateOne(
        { _id: 1 as any },
        { $set: { password: hashedPassword } }
      );
      console.log("📊 Direct Update Result:", result2);

      const config2: any = await ServerConfig.findById(1).lean();
      const isValid2 = await bcrypt.compare(NEW_PASSWORD, config2.password);
      console.log("🔐 Final Verification:", isValid2 ? "✅ VALID" : "❌ INVALID");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

resetPassword();
