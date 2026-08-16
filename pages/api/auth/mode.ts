// pages/api/auth/mode.ts
// Tiny public endpoint: middleware (edge runtime) cannot read MongoDB directly,
// so it asks this route whether authentication is currently enabled.
import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthEnabled } from "@/lib/authMode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authEnabled = await getAuthEnabled();
    res.setHeader("Cache-Control", "public, max-age=10, s-maxage=10");
    return res.status(200).json({ authEnabled });
  } catch (err) {
    console.error("[auth/mode] error:", err);
    return res.status(200).json({ authEnabled: false });
  }
}
