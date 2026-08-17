// pages/api/admin/player-config.ts
// Admin Panel -> Player Session: read / edit every stream backend + iframe URL
// live, without a redeploy.
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import { verifyAdmin } from "@/lib/adminAuth";
import {
  getPlayerConfig,
  invalidatePlayerConfigCache,
  normalizePlayerConfig,
} from "@/lib/playerConfig";
import { invalidateRuntimeGateCache } from "@/lib/runtimeGate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req)) return res.status(401).json({ message: "Unauthorized" });

  try {
    await dbConnect();

    if (req.method === "GET") {
      const playerConfig = await getPlayerConfig();
      return res.status(200).json({ playerConfig });
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const playerConfig = normalizePlayerConfig(body.playerConfig ?? body);

      await ServerConfig.updateOne(
        { _id: 1 },
        { $set: { playerConfig } },
        { upsert: true }
      );

      invalidatePlayerConfigCache();
      invalidateRuntimeGateCache();

      return res.status(200).json({ playerConfig });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("[admin/player-config] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
