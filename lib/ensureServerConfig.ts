// lib/ensureServerConfig.ts
// A deployment on Vercel cannot run the interactive setup script, so the
// ServerConfig document (_id: 1) may not exist yet. Every code path that
// needs it should use this helper instead of failing with
// "Server configuration not Setup!".
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import bcrypt from "bcryptjs";
import {
  DEFAULT_SERVER_CONFIG,
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
} from "@/lib/defaults";

/** Returns the ServerConfig document, creating a sane default if missing. */
export async function getOrCreateServerConfig(): Promise<any> {
  await dbConnect();

  let config = await ServerConfig.findOne({ _id: 1 });
  if (config) return config;

  const passwordHash = DEFAULT_ADMIN_PASSWORD
    ? await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)
    : await bcrypt.hash(`unset-${Date.now()}`, 10);

  await ServerConfig.updateOne(
    { _id: 1 },
    {
      $setOnInsert: {
        ...DEFAULT_SERVER_CONFIG,
        username: DEFAULT_ADMIN_USERNAME || "admin",
        password: passwordHash,
      },
    },
    { upsert: true }
  );

  config = await ServerConfig.findOne({ _id: 1 });
  return config;
}
