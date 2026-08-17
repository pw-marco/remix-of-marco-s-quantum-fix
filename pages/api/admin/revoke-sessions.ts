// pages/api/admin/revoke-sessions.ts
// One click => every existing user / guest session becomes invalid instantly
// (middleware rejects any token issued before sessionEpoch).
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import { verifyAdmin } from "@/lib/adminAuth";
import { invalidateRuntimeGateCache } from "@/lib/runtimeGate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req)) return res.status(401).json({ message: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const sessionEpoch = Date.now();
    await ServerConfig.updateOne({ _id: 1 }, { $set: { sessionEpoch } }, { upsert: true });
    invalidateRuntimeGateCache();
    return res.status(200).json({ success: true, sessionEpoch });
  } catch (err) {
    console.error("[admin/revoke-sessions] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
