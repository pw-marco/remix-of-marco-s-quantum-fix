import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { parse } from "cookie";
import { invalidateAuthModeCache } from "@/lib/authMode";
import { invalidatePenpencilTokenCache } from "@/utils/penpencilToken";
import { invalidateRuntimeGateCache } from "@/lib/runtimeGate";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const JWT_SECRET = JWT_SECRET_VALUE;

// Only these fields can be written from the admin panel.
const ALLOWED_FIELDS = [
  "webName",
  "registrationOpen",
  "sidebarLogoUrl",
  "sidebarTitle",
  "isDirectLoginOpen",
  "tg_bot",
  "tg_channel",
  "tg_username",
  "username",
  "shortner_servers",
  "authEnabled",
  "keyGenerationEnabled",
  "penpencilToken",
  "penpencilRefreshToken",
  "playerConfig",
  "blockedOrigins",
] as const;

function verifyAdminTokenFromCookie(req: NextApiRequest) {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.admin_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && decoded.admin) return decoded;
    return null;
  } catch {
    return null;
  }
}

function maskToken(token?: string | null) {
  if (!token) return "";
  const t = String(token);
  if (t.length <= 8) return "••••";
  return `••••••••${t.slice(-6)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const admin = verifyAdminTokenFromCookie(req);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await dbConnect();

    if (req.method === "GET") {
      const config = (await ServerConfig.findOne({ _id: 1 }).lean()) as any;
      if (!config) return res.status(200).json({ serverConfig: null });

      const reveal = String(req.query.reveal || "") === "1";
      const serverConfig = { ...config };
      delete serverConfig.password;

      serverConfig.authEnabled = config.authEnabled === true;
      serverConfig.keyGenerationEnabled = config.keyGenerationEnabled === true;
      serverConfig.hasPenpencilToken = Boolean(config.penpencilToken);
      serverConfig.penpencilTokenMasked = maskToken(config.penpencilToken);

      if (!reveal) {
        serverConfig.penpencilToken = "";
        serverConfig.penpencilRefreshToken = "";
      }

      return res.status(200).json({ serverConfig });
    }

    if (req.method === "PUT") {
      const body: any = req.body || {};
      const update: any = {};

      for (const key of ALLOWED_FIELDS) {
        if (body[key] !== undefined) update[key] = body[key];
      }

      // Empty token strings mean "don't change" (the UI shows a masked value).
      // Use { penpencilToken: null } to explicitly clear it.
      if (update.penpencilToken === "") delete update.penpencilToken;
      if (update.penpencilRefreshToken === "") delete update.penpencilRefreshToken;

      if (update.penpencilToken === null) update.penpencilToken = "";
      if (update.penpencilRefreshToken === null) update.penpencilRefreshToken = "";

      if (typeof update.penpencilToken === "string") {
        update.penpencilToken = update.penpencilToken.trim();
        update.penpencilTokenUpdatedAt = new Date();
      }
      if (typeof update.penpencilRefreshToken === "string") {
        update.penpencilRefreshToken = update.penpencilRefreshToken.trim();
      }

      // Turning auth ON must instantly kill every existing (guest) session.
      if (update.authEnabled === true) {
        const current = (await ServerConfig.findById(1)
          .select("authEnabled")
          .lean()) as any;
        if (current?.authEnabled !== true) {
          update.sessionEpoch = Date.now();
        }
      }

      // Hash password if provided
      if (body.password) {
        const salt = await bcrypt.genSalt(10);
        update.password = await bcrypt.hash(body.password, salt);
      }

      const config = await ServerConfig.findOneAndUpdate(
        { _id: 1 },
        { $set: update },
        { new: true, upsert: true }
      ).lean() as any;

      // make the toggle / new token take effect immediately
      invalidateAuthModeCache();
      invalidatePenpencilTokenCache();
      invalidateRuntimeGateCache();

      const safe = { ...config };
      delete safe.password;
      safe.hasPenpencilToken = Boolean(config?.penpencilToken);
      safe.penpencilTokenMasked = maskToken(config?.penpencilToken);
      safe.penpencilToken = "";
      safe.penpencilRefreshToken = "";

      return res.status(200).json({ serverConfig: safe });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("[serverConfig] Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
