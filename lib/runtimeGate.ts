// lib/runtimeGate.ts
// Everything the edge middleware needs in ONE cached read:
//  - authEnabled     -> guest mode or real login
//  - sessionEpoch    -> any token issued before this is instantly revoked
//  - blockedOrigins  -> hosts that must get a 403
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";

export type RuntimeGate = {
  authEnabled: boolean;
  sessionEpoch: number;
  blockedOrigins: string[];
};

const CACHE_TTL_MS = 5_000;

type CacheShape = { value: RuntimeGate; at: number } | null;

declare global {
  // eslint-disable-next-line no-var
  var __runtimeGateCache: CacheShape;
}

global.__runtimeGateCache = global.__runtimeGateCache ?? null;

const FALLBACK: RuntimeGate = {
  authEnabled: false,
  sessionEpoch: 0,
  blockedOrigins: [],
};

export async function getRuntimeGate(): Promise<RuntimeGate> {
  const cached = global.__runtimeGateCache;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    await dbConnect();
    const config = (await ServerConfig.findById(1)
      .select("authEnabled sessionEpoch blockedOrigins")
      .lean()) as any;

    const value: RuntimeGate = {
      authEnabled: config?.authEnabled === true,
      sessionEpoch: Number(config?.sessionEpoch || 0),
      blockedOrigins: Array.isArray(config?.blockedOrigins)
        ? config.blockedOrigins.map((o: any) => String(o).toLowerCase())
        : [],
    };

    global.__runtimeGateCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.error("[runtimeGate] failed to read ServerConfig:", err);
    return cached?.value ?? FALLBACK;
  }
}

export function invalidateRuntimeGateCache() {
  global.__runtimeGateCache = null;
}
