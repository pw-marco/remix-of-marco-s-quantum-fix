// pages/api/origin/track.ts
// Called (keepalive) by the middleware so the admin can see exactly which
// origins / proxies are hitting the site and block them.
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import OriginLog from "@/models/OriginLog";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const origin = String(body.origin || "").trim().toLowerCase();
    if (!origin) return res.status(200).json({ ok: true });

    await dbConnect();
    await OriginLog.updateOne(
      { origin },
      {
        $inc: { hits: 1 },
        $set: {
          lastPath: String(body.path || "").slice(0, 300),
          lastIp: String(body.ip || "").slice(0, 100),
          lastUserAgent: String(body.userAgent || "").slice(0, 400),
          lastSeen: new Date(),
        },
        $setOnInsert: { firstSeen: new Date(), blocked: false },
      },
      { upsert: true }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[origin/track] error:", err);
    return res.status(200).json({ ok: false });
  }
}
