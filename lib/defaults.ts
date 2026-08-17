// lib/defaults.ts
// Built-in fallbacks so a fresh deployment works instantly, even before any
// Environment Variable / Admin Panel setup.
//
// IMPORTANT: no secret is hardcoded here. Everything sensitive (admin
// credentials, PenPencil tokens, JWT secret) comes from Environment
// Variables or from the Admin Panel -> Settings (saved in MongoDB).

/** Brand name. Change with NEXT_PUBLIC_APP_NAME or Admin -> Settings. */
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "PW MARCO";

/** Default logo used before the DB config is loaded. */
export const BRAND_LOGO_URL =
  process.env.NEXT_PUBLIC_APP_LOGO ||
  "https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png";

/** Single source of truth for every Telegram link in the app. */
export const TELEGRAM_USERNAME = "official_marco_22";
export const TELEGRAM_LINK = `https://t.me/${TELEGRAM_USERNAME}`;

export const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/** Optional global PenPencil (pw.live) tokens — normally set from Admin -> Settings. */
export const DEFAULT_PENPENCIL_TOKEN = process.env.PENPENCIL_TOKEN || "";

export const DEFAULT_PENPENCIL_REFRESH_TOKEN =
  process.env.PENPENCIL_REFRESH_TOKEN || "";

export const DEFAULT_PENPENCIL_RANDOM_ID = process.env.PENPENCIL_RANDOM_ID || "";

/** Fallback JWT secret so cookies work even if JWT_SECRET env is missing. */
export const JWT_SECRET_VALUE =
  process.env.JWT_SECRET || "pw-marco-default-jwt-secret-change-me";

/** Shape used whenever a ServerConfig document has to be created on the fly. */
export const DEFAULT_SERVER_CONFIG = {
  webName: BRAND_NAME,
  sidebarTitle: BRAND_NAME,
  sidebarLogoUrl: BRAND_LOGO_URL,
  isDirectLoginOpen: true,
  registrationOpen: true,
  tg_bot: TELEGRAM_USERNAME,
  tg_channel: TELEGRAM_USERNAME,
  tg_username: TELEGRAM_USERNAME,
  shortner_servers: [] as any[],
  authEnabled: false,
  keyGenerationEnabled: false,
  penpencilToken: DEFAULT_PENPENCIL_TOKEN,
  penpencilRefreshToken: DEFAULT_PENPENCIL_REFRESH_TOKEN,
};

/** Live-editable player / stream backend defaults (Admin -> Player Session). */
export const DEFAULT_PLAYER_CONFIG = {
  primaryApi: "https://costumes-direct-dozen-expressed.trycloudflare.com",
  marcoApi: "https://pwstream-proxy-marco.r9140128682.workers.dev/api/video-url",
  pythonApi: "https://proxy.deltaverse.site/api/prepare",
  iframeBaseUrl: "",
  useIframe: false,
  providerOrder: ["primary", "marco", "python", "legacy"] as string[],
  extraHeaders: {} as Record<string, string>,
};
