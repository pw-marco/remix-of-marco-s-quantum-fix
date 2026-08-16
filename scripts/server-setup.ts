// scripts/server-setup.ts
// Run:  npm run setup
// Creates / updates the ServerConfig document (admin login + defaults).
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dbConnect from "../lib/mongodb";
import ServerConfig from "../models/ServerConfig";
import {
  DEFAULT_PENPENCIL_TOKEN,
  DEFAULT_PENPENCIL_REFRESH_TOKEN,
} from "../lib/defaults";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "pwmarcofounder@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Apexmarco@22";

async function setupServer() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await dbConnect();
    console.log("✅ Connected to MongoDB");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const existing = await ServerConfig.findById(1).lean();

    // NOTE: updateOne is used on purpose — the schema's pre("save") hook would
    // hash the already-hashed password a second time.
    const base = {
      webName: "PW-MARCO",
      sidebarTitle: "PW-MARCO",
      sidebarLogoUrl:
        "https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png",
      isDirectLoginOpen: true,
      registrationOpen: existing ? false : true,
      password: hashedPassword,
      username: ADMIN_USERNAME,
      tg_bot: "nothing",
      tg_channel: "official_marco_22",
      tg_username: "officialmarco22",
      shortner_servers: [
        {
          name: "nothing",
          enabled: false,
          api_url: "nothing",
          api_key: "nothing",
        },
      ],
      keyGenerationEnabled: false,
      // ✅ Guest mode: auth OFF by default. Toggle it from Admin -> Settings.
      authEnabled: false,
    };

    await ServerConfig.updateOne(
      { _id: 1 },
      {
        $set: base,
        // never overwrite an already-saved global token
        $setOnInsert: {
          penpencilToken: DEFAULT_PENPENCIL_TOKEN,
          penpencilRefreshToken: DEFAULT_PENPENCIL_REFRESH_TOKEN,
          penpencilTokenUpdatedAt: null,
        },
      },
      { upsert: true }
    );

    console.log(
      existing
        ? "✅ Server config updated successfully!"
        : "✅ Server config created successfully!"
    );

    const config: any = await ServerConfig.findById(1).lean();

    console.log("\n📋 Server Config Details:");
    console.log("─────────────────────────");
    console.log(`Web Name: ${config.webName}`);
    console.log(`Auth Enabled: ${config.authEnabled ? "✅ ON" : "❌ OFF (guest mode)"}`);
    console.log(`Direct Login: ${config.isDirectLoginOpen}`);
    console.log(`Registration Open: ${config.registrationOpen}`);
    console.log(`Username: ${config.username}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Telegram Bot: ${config.tg_bot}`);
    console.log(`Telegram Channel: ${config.tg_channel}`);
    console.log(`Telegram Username: ${config.tg_username}`);
    console.log(`Shortner Enabled: ${config.shortner_servers?.[0]?.enabled}`);
    console.log(`Shortner URL: ${config.shortner_servers?.[0]?.api_url}`);
    console.log(`Shortner Name: ${config.shortner_servers?.[0]?.name}`);
    console.log(
      `Key Generation: ${config.keyGenerationEnabled ? "✅ ENABLED" : "❌ DISABLED"}`
    );
    console.log(
      `Global PenPencil Token: ${config.penpencilToken ? "✅ saved" : "❌ not set (add it in Admin -> Settings)"}`
    );
    console.log("─────────────────────────");

    // verify the hash really works
    const ok = await bcrypt.compare(ADMIN_PASSWORD, config.password);
    console.log(`🔐 Password check: ${ok ? "✅ VALID" : "❌ INVALID"}`);

    console.log("\n✅ Setup complete! You can now login at /admin/login");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error setting up server:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupServer();
