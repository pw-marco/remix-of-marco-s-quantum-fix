// lib/playerConfig.ts
// Single source of truth for the live-editable player / stream backend config.
// Admin Panel -> Player Session writes it, every backend API reads it here.
import { getOrCreateServerConfig } from "@/lib/ensureServerConfig";
import { DEFAULT_PLAYER_CONFIG } from "@/lib/defaults";
import type { IPlayerConfig } from "@/models/ServerConfig";

const CACHE_TTL_MS = 5_000;

type CacheShape = { value: IPlayerConfig; at: number } | null;

declare global {
  // eslint-disable-next-line no-var
  var __playerConfigCache: CacheShape;
}

global.__playerConfigCache = global.__playerConfigCache ?? null;

export function normalizePlayerConfig(raw: any): IPlayerConfig {
  const cfg = raw && typeof raw === "object" ? raw : {};
  const order = Array.isArray(cfg.providerOrder) && cfg.providerOrder.length
    ? cfg.providerOrder.map((p: any) => String(p))
    : DEFAULT_PLAYER_CONFIG.providerOrder;

  return {
    primaryApi: String(cfg.primaryApi ?? DEFAULT_PLAYER_CONFIG.primaryApi).trim(),
    marcoApi: String(cfg.marcoApi ?? DEFAULT_PLAYER_CONFIG.marcoApi).trim(),
    pythonApi: String(cfg.pythonApi ?? DEFAULT_PLAYER_CONFIG.pythonApi).trim(),
    iframeBaseUrl: String(cfg.iframeBaseUrl ?? DEFAULT_PLAYER_CONFIG.iframeBaseUrl).trim(),
    useIframe: cfg.useIframe === undefined ? DEFAULT_PLAYER_CONFIG.useIframe : cfg.useIframe === true,
    providerOrder: order,
    extraHeaders:
      cfg.extraHeaders && typeof cfg.extraHeaders === "object" ? cfg.extraHeaders : {},
  };
}

export async function getPlayerConfig(): Promise<IPlayerConfig> {
  const cached = global.__playerConfigCache;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  try {
    const config = await getOrCreateServerConfig();
    const value = normalizePlayerConfig(config?.playerConfig);
    global.__playerConfigCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.error("[playerConfig] failed to read ServerConfig:", err);
    return cached?.value ?? normalizePlayerConfig(null);
  }
}

export function invalidatePlayerConfigCache() {
  global.__playerConfigCache = null;
}
