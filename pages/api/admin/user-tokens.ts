// pages/api/admin/user-tokens.ts
// Admin-only: returns a single user's PenPencil tokens so they can be viewed
// and copied from Admin -> Users. Tokens are never included in the general
// user list; they must be requested explicitly per user.
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

function requireAdmin(req: NextApiRequest): boolean {
  try {
    const token = req.cookies?.admin_token;
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET_VALUE);
    return Boolean(decoded && typeof decoded === "object" && (decoded as any).admin);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!requireAdmin(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = String(req.query.userId || "");
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    await dbConnect();
    const user = (await User.findById(userId)
      .select("UserName phoneNumber ActualToken ActualRefresh randomId updatedAt")
      .lean()) as any;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      userName: user.UserName ?? null,
      phoneNumber: user.phoneNumber ?? null,
      accessToken: user.ActualToken ?? null,
      refreshToken: user.ActualRefresh ?? null,
      randomId: user.randomId ?? null,
      updatedAt: user.updatedAt ?? null,
    });
  } catch (error: any) {
    console.error("[user-tokens]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
