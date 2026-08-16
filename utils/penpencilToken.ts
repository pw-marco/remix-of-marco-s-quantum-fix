// utils/penpencilToken.ts
// Resolves which PenPencil (pw.live) access token should be used for a request.
//
//  - guest user            -> global token saved by admin in Settings
//  - auth OFF              -> global token saved by admin in Settings
//  - normal logged-in user -> that user's own ActualToken
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import User from "@/models/User";
import { getAuthEnabled } from "@/lib/authMode";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_PENPENCIL_TOKEN,
  DEFAULT_PENPENCIL_REFRESH_TOKEN,
} from "@/lib/defaults";

const CACHE_TTL_MS = 15_000;
const TOKEN_SOURCE_URL = "https://pw.deltaverse.site/api/internal/tokens";
const PW_API = process.env.PW_API || "https://api.penpencil.co";
const EXPIRY_MARGIN_SECONDS = 60;

type TokenCache = { token: string; refresh: string; at: number } | null;
type TokenPair = { token: string; refresh: string; randomId?: string };

declare global {
  // eslint-disable-next-line no-var
  var __penpencilTokenCache: TokenCache;
  // eslint-disable-next-line no-var
  var __penpencilRefreshPromise: Promise<TokenPair | null> | null;
}

global.__penpencilTokenCache = global.__penpencilTokenCache ?? null;
global.__penpencilRefreshPromise = global.__penpencilRefreshPromise ?? null;

function readJwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
}

export function isPenpencilTokenUsable(token: string): boolean {
  if (!token?.trim()) return false;
  const expiry = readJwtExpiry(token);
  return expiry === null || expiry > Math.floor(Date.now() / 1000) + EXPIRY_MARGIN_SECONDS;
}

async function saveGlobalToken(pair: TokenPair): Promise<TokenPair> {
  await dbConnect();
  await ServerConfig.findByIdAndUpdate(
    1,
    {
      $set: {
        penpencilToken: pair.token,
        penpencilRefreshToken: pair.refresh,
        penpencilTokenUpdatedAt: new Date(),
      },
    },
    { upsert: false }
  );
  global.__penpencilTokenCache = {
    token: pair.token,
    refresh: pair.refresh,
    at: Date.now(),
  };
  return pair;
}

async function fetchSourceToken(): Promise<TokenPair | null> {
  const response = await fetch(TOKEN_SOURCE_URL, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const body = await response.json();
  const source = body?.token ?? body?.data ?? body;
  const token = String(source?.accessToken ?? source?.access_token ?? "").trim();
  const refresh = String(source?.refreshToken ?? source?.refresh_token ?? "").trim();
  const randomId = String(source?.randomId ?? source?.random_id ?? "").trim();
  if (!isPenpencilTokenUsable(token)) return null;
  return { token, refresh, randomId: randomId || undefined };
}

async function refreshToken(refresh: string): Promise<TokenPair | null> {
  if (!refresh) return null;
  const randomId = uuidv4();
  const response = await fetch(`${PW_API}/v3/oauth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Randomid: randomId },
    body: JSON.stringify({ refresh_token: refresh, client_id: "system-admin" }),
  });
  if (!response.ok) return null;

  const body = await response.json();
  const token = String(body?.data?.access_token ?? "").trim();
  const nextRefresh = String(body?.data?.refresh_token ?? refresh).trim();
  if (!isPenpencilTokenUsable(token)) return null;
  return { token, refresh: nextRefresh, randomId };
}

async function renewGlobalToken(): Promise<TokenPair | null> {
  if (global.__penpencilRefreshPromise) return global.__penpencilRefreshPromise;
  global.__penpencilRefreshPromise = (async () => {
    const current = await readStoredGlobalToken();
    const refreshed = await refreshToken(current.refresh).catch(() => null);
    if (refreshed) return saveGlobalToken(refreshed);

    const sourced = await fetchSourceToken().catch(() => null);
    if (sourced) return saveGlobalToken(sourced);
    return null;
  })().finally(() => {
    global.__penpencilRefreshPromise = null;
  });
  return global.__penpencilRefreshPromise;
}

async function readStoredGlobalToken(): Promise<TokenPair> {
  await dbConnect();
  const config = (await ServerConfig.findById(1)
    .select("penpencilToken penpencilRefreshToken")
    .lean()) as { penpencilToken?: string; penpencilRefreshToken?: string } | null;
  return {
    token: (config?.penpencilToken || DEFAULT_PENPENCIL_TOKEN || "").trim(),
    refresh: (config?.penpencilRefreshToken || DEFAULT_PENPENCIL_REFRESH_TOKEN || "").trim(),
  };
}

export async function getGlobalPenpencilToken(): Promise<{
  token: string;
  refresh: string;
}> {
  const cached = global.__penpencilTokenCache;
  if (
    cached &&
    Date.now() - cached.at < CACHE_TTL_MS &&
    isPenpencilTokenUsable(cached.token)
  ) {
    return { token: cached.token, refresh: cached.refresh };
  }

  const stored = await readStoredGlobalToken();
  let { token, refresh } = stored;
  if (!isPenpencilTokenUsable(token)) {
    const renewed = await renewGlobalToken();
    token = renewed?.token || "";
    refresh = renewed?.refresh || "";
  }
  global.__penpencilTokenCache = { token, refresh, at: Date.now() };
  return { token, refresh };
}

export async function forceRenewGlobalPenpencilToken(): Promise<string> {
  global.__penpencilTokenCache = null;
  return (await renewGlobalToken())?.token || "";
}

export async function refreshUserPenpencilToken(userId: string): Promise<string> {
  await dbConnect();
  const user = await User.findById(userId).select("ActualRefresh");
  const refreshed = await refreshToken(String(user?.ActualRefresh || "")).catch(() => null);
  if (!refreshed || !user) return "";
  await User.findByIdAndUpdate(userId, {
    $set: {
      ActualToken: refreshed.token,
      ActualRefresh: refreshed.refresh,
      randomId: refreshed.randomId,
    },
  });
  return refreshed.token;
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
