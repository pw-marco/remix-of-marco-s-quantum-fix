// lib/adminAuth.ts
import type { NextApiRequest } from "next";
import jwt from "jsonwebtoken";
import { parse } from "cookie";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

/** Returns the decoded admin payload, or null when the caller is not an admin. */
export function verifyAdmin(req: NextApiRequest): any | null {
  const cookies = parse(req.headers.cookie || "");
  const token = cookies.admin_token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE);
    if (typeof decoded === "object" && (decoded as any).admin) return decoded;
    return null;
  } catch {
    return null;
  }
}
