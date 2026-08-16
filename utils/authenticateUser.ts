import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { getAuthEnabled } from "@/lib/authMode";
import { createGuestSession } from "@/lib/guestSession";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const JWT_SECRET = JWT_SECRET_VALUE;
const JWT_ACCESS_EXPIRES_SECONDS = Number(
  process.env.JWT_ACCESS_EXPIRES_SECONDS
);
const JWT_REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS);

// ✅ Accept full payload instead of just userId
const generateAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${JWT_ACCESS_EXPIRES_SECONDS}s`,
  });

type JwtPayload = {
  userId: string;
  name: string;
  telegramId: string;
  PhotoUrl: string;
};

const generateRefreshToken = () => crypto.randomBytes(32).toString("hex");

/**
 * When auth is OFF we never throw / never redirect: the caller instantly gets a
 * brand new guest session instead (cookies are written on the response).
 * When auth is ON the original behaviour is kept exactly as before.
 */
async function guestFallbackOrThrow(
  res: NextApiResponse,
  message: string
): Promise<IUser> {
  const authEnabled = await getAuthEnabled();
  if (!authEnabled) {
    return await createGuestSession(res);
  }
  clearAuthCookies(res);
  throw new Error(message);
}

export async function authenticateUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<IUser> {
  await dbConnect();

  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken || !refreshToken) {
    return guestFallbackOrThrow(res, "Unauthorized: No tokens provided");
  }

  try {
    // Verify access token (if valid and not expired)
    const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.userId);
    if (!user) {
      return guestFallbackOrThrow(res, "User not found");
    }
    return user;
  } catch (err: any) {
    // If token expired, try refreshing
    if (err.name !== "TokenExpiredError") {
      return guestFallbackOrThrow(res, "Unauthorized: Invalid access token");
    }

    try {
      // Decode expired access token (ignore expiration) to get userId
      const decoded = jwt.verify(accessToken, JWT_SECRET, {
        ignoreExpiration: true,
      }) as JwtPayload;

      const user = await User.findById(decoded.userId);
      if (!user) throw new Error("User not found");

      // Match plain 64-hex refresh token
      if (user.refreshToken !== refreshToken) {
        throw new Error("Unauthorized: Refresh token mismatch");
      }

      // All good — issue new tokens
      const payload = {
        userId: user._id,
        name: user.UserName,
        telegramId: user.telegramId,
        PhotoUrl: user.photoUrl,
      };
      const newAccessToken = generateAccessToken(payload as any);
      const newRefreshToken = generateRefreshToken();

      user.refreshToken = newRefreshToken;
      await user.save();

      res.setHeader("Set-Cookie", [
        `accessToken=${newAccessToken}; Path=/; HttpOnly; SameSite=None; Max-Age=${JWT_ACCESS_EXPIRES_SECONDS}; Secure;`,
        `refreshToken=${newRefreshToken}; Path=/; HttpOnly; SameSite=None; Max-Age=${
          60 * 60 * 24 * JWT_REFRESH_EXPIRES_DAYS
        }; Secure;`,
      ]);

      return user;
    } catch {
      return guestFallbackOrThrow(
        res,
        "Unauthorized: Refresh token invalid or expired"
      );
    }
  }
}

function clearAuthCookies(res: NextApiResponse) {
  res.setHeader("Set-Cookie", [
    `accessToken=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Secure`,
    `refreshToken=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Secure`,
  ]);
}
export { clearAuthCookies };
