// lib/authMode.ts
// Central place to know whether normal (OTP / bot) authentication is enabled.
// Controlled from Admin Panel -> Settings -> Authentication.
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";

const CACHE_TTL_MS = 10_000; // small TTL so the admin toggle feels instant

type CacheShape = { value: boolean; at: number } | null;

declare global {
  // eslint-disable-next-line no-var
  var __authModeCache: CacheShape;
}

global.__authModeCache = global.__authModeCache ?? null;

/**
 * true  -> normal auth (OTP / bot / direct login) is required
 * false -> auth is OFF, every visitor silently gets a guest session
 */
export async function getAuthEnabled(): Promise<boolean> {
  const cached = global.__authModeCache;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    await dbConnect();
    const config = (await ServerConfig.findById(1)
      .select("authEnabled")
      .lean()) as { authEnabled?: boolean } | null;

    // default: auth OFF (guest mode) when the field is missing
    const value = config?.authEnabled === true;
    global.__authModeCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.error("[authMode] failed to read ServerConfig:", err);
    // fail-safe: keep whatever we knew, otherwise assume auth OFF
    return cached?.value ?? false;
  }
}

export function invalidateAuthModeCache() {
  global.__authModeCache = null;
}
