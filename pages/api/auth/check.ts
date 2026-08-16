import type { NextApiRequest, NextApiResponse } from "next";
import { jwtVerify } from "jose";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET_VALUE);
    await jwtVerify(token, secret);
    return res.status(200).json({ authenticated: true });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
