import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { JWT_SECRET_VALUE } from "@/lib/defaults";
const JWT_SECRET = JWT_SECRET_VALUE;

export function verifyToken(req: NextApiRequest) {
  const token = req.cookies.token ?? req.cookies.accessToken;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
