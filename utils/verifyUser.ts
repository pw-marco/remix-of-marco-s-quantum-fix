// utils/verifyUser.ts
import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthEnabled } from "@/lib/authMode";
import { createGuestSession } from "@/lib/guestSession";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const JWT_SECRET = JWT_SECRET_VALUE;

/**
 * `res` is optional for backwards compatibility. Pass it whenever you can:
 * with auth OFF a fresh guest session can then be created instead of throwing.
 */
export const verifyUser = async (req: NextApiRequest, res?: NextApiResponse) => {
  const token = req.cookies?.accessToken;
  await dbConnect();

  const guestFallback = async (message: string) => {
    const authEnabled = await getAuthEnabled();
    if (!authEnabled && res) {
      return await createGuestSession(res);
    }
    throw new Error(message);
  };

  if (!token) {
    return guestFallback("Unauthorized: No token provided");
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return guestFallback("User not found");
    }

    return user; // Return full user document
  } catch (err: any) {
    console.warn("Token verification failed:", err?.message || err);
    return guestFallback("Unauthorized: Invalid or expired token");
  }
};
