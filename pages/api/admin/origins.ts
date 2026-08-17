// pages/api/admin/origins.ts
// Admin Panel -> Origins: see every origin (proxy / mirror) hitting the site
// and block or unblock it instantly.
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import OriginLog from "@/models/OriginLog";
import ServerConfig from "@/models/ServerConfig";
import { verifyAdmin } from "@/lib/adminAuth";
import { invalidateRuntimeGateCache } from "@/lib/runtimeGate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyAdmin(req)) return res.status(401).json({ message: "Unauthorized" });

  try {
    await dbConnect();

    if (req.method === "GET") {
      const [origins, config] = await Promise.all([
        OriginLog.find({}).sort({ lastSeen: -1 }).limit(300).lean(),
        ServerConfig.findById(1).select("blockedOrigins").lean() as any,
      ]);
      const blocked: string[] = Array.isArray(config?.blockedOrigins)
        ? config.blockedOrigins
        : [];
      return res.status(200).json({
        origins: (origins as any[]).map((o) => ({
          ...o,
          blocked: blocked.includes(String(o.origin).toLowerCase()),
        })),
        blockedOrigins: blocked,
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const origin = String(body.origin || "").trim().toLowerCase();
      const block = body.block !== false;
      if (!origin) return res.status(400).json({ message: "origin is required" });

      await ServerConfig.updateOne(
        { _id: 1 },
        block ? { $addToSet: { blockedOrigins: origin } } : { $pull: { blockedOrigins: origin } },
        { upsert: true }
      );
      await OriginLog.updateOne({ origin }, { $set: { blocked: block } }, { upsert: true });

      invalidateRuntimeGateCache();

      const config = (await ServerConfig.findById(1).select("blockedOrigins").lean()) as any;
      return res.status(200).json({ blockedOrigins: config?.blockedOrigins || [] });
    }

    if (req.method === "DELETE") {
      const origin = String(req.query.origin || "").trim().toLowerCase();
      if (origin) await OriginLog.deleteOne({ origin });
      else await OriginLog.deleteMany({});
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("[admin/origins] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
