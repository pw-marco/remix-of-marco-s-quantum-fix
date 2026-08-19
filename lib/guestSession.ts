// lib/guestSession.ts
// Creates a brand-new guest user in MongoDB and sets the same auth cookies
// a normal logged-in user gets, so the whole app keeps working unchanged.
import type { NextApiResponse } from "next";
import type { ServerResponse } from "http";
import crypto from "crypto";
import { SignJWT } from "jose";
import dbConnect from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

function getJwtSecret() {
  const secret = JWT_SECRET_VALUE;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}
const ACCESS_EXPIRES_SECONDS = Number(process.env.JWT_ACCESS_EXPIRES_SECONDS) || 60 * 60 * 24 * 7;
const REFRESH_EXPIRES_DAYS = Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 30;

export type GuestCookiePair = [string, string];

function randomId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString("hex");
}

export function buildAuthCookies(accessToken: string, refreshToken: string): GuestCookiePair {
  const isProd = process.env.NODE_ENV === "production";
  const cookieSecurity = isProd ? " SameSite=None; Secure;" : " SameSite=Lax;";
  return [
    `accessToken=${accessToken}; Path=/; HttpOnly;${cookieSecurity} Max-Age=${ACCESS_EXPIRES_SECONDS};`,
    `refreshToken=${refreshToken}; Path=/; HttpOnly;${cookieSecurity} Max-Age=${
      60 * 60 * 24 * REFRESH_EXPIRES_DAYS
    };`,
  ];
}

/**
 * Creates the guest user document + JWTs. Does NOT touch any response.
 */
export async function createGuestUser(): Promise<{
  user: IUser;
  accessToken: string;
  refreshToken: string;
  cookies: GuestCookiePair;
}> {
  await dbConnect();

  const guestId = randomId();
  const refreshToken = crypto.randomBytes(32).toString("hex");

  const user = (await User.create({
    UserName: `Guest-${guestId.slice(0, 8)}`,
    phoneNumber: `guest_${guestId}`,
    telegramId: null,
    isGuest: true,
    guestId,
    hasLoggedIn: true,
    refreshToken,
    randomId: randomId(),
    enrolledBatches: [],
  })) as IUser;

  const accessToken = await new SignJWT({
      userId: String(user._id),
      name: user.UserName,
      telegramId: "",
      PhotoUrl: "",
      guest: true,
    })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_EXPIRES_SECONDS)
    .sign(getJwtSecret());

  return {
    user,
    accessToken,
    refreshToken,
    cookies: buildAuthCookies(accessToken, refreshToken),
  };
}

/**
 * Creates a guest session and writes the cookies on the given response.
 * Works with both pages/api handlers and raw node responses.
 */
export async function createGuestSession(
  res: NextApiResponse | ServerResponse
): Promise<IUser> {
  const { user, cookies } = await createGuestUser();
  res.setHeader("Set-Cookie", cookies);
  return user;
}
