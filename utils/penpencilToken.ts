// utils/penpencilToken.ts
// Resolves which PenPencil (pw.live) access token should be used for a request.
//
//  - guest user            -> global token saved by admin in Settings
//  - auth OFF              -> global token saved by admin in Settings
//  - normal logged-in user -> that user's own ActualToken
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import { getAuthEnabled } from "@/lib/authMode";
import {
  DEFAULT_PENPENCIL_TOKEN,
  DEFAULT_PENPENCIL_REFRESH_TOKEN,
} from "@/lib/defaults";

const CACHE_TTL_MS = 15_000;

type TokenCache = { token: string; refresh: string; at: number } | null;

declare global {
  // eslint-disable-next-line no-var
  var __penpencilTokenCache: TokenCache;
}

global.__penpencilTokenCache = global.__penpencilTokenCache ?? null;

export async function getGlobalPenpencilToken(): Promise<{
  token: string;
  refresh: string;
}> {
  const cached = global.__penpencilTokenCache;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { token: cached.token, refresh: cached.refresh };
  }

  await dbConnect();
  const config = (await ServerConfig.findById(1)
    .select("penpencilToken penpencilRefreshToken")
    .lean()) as { penpencilToken?: string; penpencilRefreshToken?: string } | null;

  const token = (config?.penpencilToken || DEFAULT_PENPENCIL_TOKEN || "").trim();
  const refresh = (
    config?.penpencilRefreshToken || DEFAULT_PENPENCIL_REFRESH_TOKEN || ""
  ).trim();
  global.__penpencilTokenCache = { token, refresh, at: Date.now() };
  return { token, refresh };
}

export function invalidatePenpencilTokenCache() {
  global.__penpencilTokenCache = null;
}

type MaybeUser = { isGuest?: boolean; ActualToken?: string | null } | null | undefined;

/**
 * Always use this instead of `user.ActualToken` when calling PenPencil APIs.
 */
export async function resolvePenpencilToken(user: MaybeUser): Promise<string> {
  const authEnabled = await getAuthEnabled();

  if (!authEnabled || user?.isGuest) {
    const { token } = await getGlobalPenpencilToken();
    if (token) return token;
    // fallback: if admin has not set a global token yet, try the user's own
    return (user?.ActualToken || "").trim();
  }

  const own = (user?.ActualToken || "").trim();
  if (own) return own;

  // logged-in user without a token -> fall back to the global one if present
  const { token } = await getGlobalPenpencilToken();
  return token;
}
