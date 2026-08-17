// pages/api/auth/mode.ts
// Tiny public endpoint: middleware (edge runtime) cannot read MongoDB directly,
// so it asks this route for the current auth mode, the session epoch (mass
// revocation marker) and the list of blocked origins.
import type { NextApiRequest, NextApiResponse } from "next";
import { getRuntimeGate } from "@/lib/runtimeGate";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const gate = await getRuntimeGate();
    // must stay fresh: revoking sessions has to feel instant
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(gate);
  } catch (err) {
    console.error("[auth/mode] error:", err);
    return res
      .status(200)
      .json({ authEnabled: false, sessionEpoch: 0, blockedOrigins: [] });
  }
}
