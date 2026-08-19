// ////middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const REFRESH_API_PATH = "/api/TokenManager/refreshTokens";
const REFRESH_API_KEY = process.env.REFRESH_API_KEY;
const PUBLIC_API_PATHS = ["/api/auth", "/api/origin"];
const ADMIN_API_PATHS = ["/api/admin"];
function getJwtSecret() {
  const secret = JWT_SECRET_VALUE;
  return secret ? new TextEncoder().encode(secret) : null;
}

async function verifyToken(token: string) {
  const secret = getJwtSecret();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwtVerify(token, secret, { algorithms: ["HS256"] });
}

// ⚠️ Never throw at module scope – that breaks the whole deployment on Vercel.
const baseUrl =
  process.env.BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

const isPublicApi = (pathname: string) =>
  PUBLIC_API_PATHS.some((publicPath) => pathname.startsWith(publicPath));

const isAdminApi = (pathname: string) =>
  ADMIN_API_PATHS.some((adminPath) => pathname.startsWith(adminPath));

// ---------------------------------------------------------------------------
// Auth mode (admin toggle). The edge runtime cannot read MongoDB, so we ask a
// tiny internal endpoint and cache the answer for a few seconds.
// ---------------------------------------------------------------------------
type Gate = { authEnabled: boolean; sessionEpoch: number; blockedOrigins: string[] };

let gateCache: { value: Gate; at: number } | null = null;
const GATE_TTL_MS = 5_000;

async function getGate(req: NextRequest): Promise<Gate> {
  if (gateCache && Date.now() - gateCache.at < GATE_TTL_MS) return gateCache.value;
  try {
    const origin = req.nextUrl.origin || baseUrl;
    const res = await fetch(`${origin}/api/auth/mode`, {
      headers: { "x-internal": "middleware" },
      cache: "no-store",
    });
    const json = (await res.json()) as Partial<Gate>;
    const value: Gate = {
      authEnabled: json?.authEnabled === true,
      sessionEpoch: Number(json?.sessionEpoch || 0),
      blockedOrigins: Array.isArray(json?.blockedOrigins)
        ? json!.blockedOrigins!.map((o) => String(o).toLowerCase())
        : [],
    };
    gateCache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.error("[middleware] gate check failed:", err);
    return (
      gateCache?.value ?? { authEnabled: false, sessionEpoch: 0, blockedOrigins: [] }
    );
  }
}

/** Host the request claims to come from (proxy / mirror detection). */
function requestOrigin(req: NextRequest): string {
  const raw =
    req.headers.get("origin") ||
    req.headers.get("referer") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`).host.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function isOriginBlocked(origin: string, blocked: string[]) {
  if (!origin) return false;
  return blocked.some((b) => b && (origin === b || origin.endsWith(`.${b}`)));
}

function trackOrigin(req: NextRequest, origin: string) {
  if (!origin) return;
  try {
    const base = req.nextUrl.origin || baseUrl;
    if (!base) return;
    void fetch(`${base}/api/origin/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin,
        path: req.nextUrl.pathname,
        ip:
          req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "",
        userAgent: req.headers.get("user-agent") || "",
      }),
      keepalive: true,
    });
  } catch {}
}

/** Token issued before the current sessionEpoch => revoked. */
function isRevoked(payload: any, sessionEpoch: number) {
  if (!sessionEpoch) return false;
  const iat = Number(payload?.iat || 0) * 1000;
  if (!iat) return true;
  return iat < sessionEpoch;
}

// Add a web-compatible UUID v4 generator
function generateUUIDv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to get or set anon_id cookie
async function getOrSetAnonId(req: NextRequest, res?: NextResponse) {
  let anon_id = req.cookies.get("anon_id")?.value;
  if (!anon_id) {
    anon_id = generateUUIDv4();
    if (res) {
      res.cookies.set("anon_id", anon_id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
    try {
      if (baseUrl) {
        await fetch(`${baseUrl}/api/track-anon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anon_id,
            useragent: req.headers.get("user-agent") || "",
            ip:
              req.headers.get("x-forwarded-for") ||
              req.headers.get("x-real-ip") ||
              "",
          }),
          keepalive: true,
        });
      }
    } catch (error) {
      console.error("Failed to track anon_id:", error);
    }
  }
  return anon_id;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The middleware gate-check calls this endpoint internally; running the
  // full middleware on it would create a recursive self-request.
  if (pathname === "/api/auth/mode") return NextResponse.next();

  // ---- Origin firewall (log + block proxies / mirrors) ----
  const origin = requestOrigin(req);
  const selfHost = req.nextUrl.host.toLowerCase();
  if (origin && origin !== selfHost && !pathname.startsWith("/api/origin")) {
    const gateForOrigin = await getGate(req);
    trackOrigin(req, origin);
    if (isOriginBlocked(origin, gateForOrigin.blockedOrigins)) {
      return new Response("This origin is blocked.", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  const adminToken = req.cookies.get("admin_token")?.value;

  // Do not enter a guest redirect loop when deployment configuration is
  // incomplete. Admin pages stay reachable so the deployment can be checked.
  if (!getJwtSecret() && !pathname.startsWith("/admin")) {
    return new Response(
      "Server configuration is incomplete: JWT_SECRET is missing.",
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const adminDashboard = req.nextUrl.clone();
  adminDashboard.pathname = "/admin/dashboard";

  if (pathname === "/admin/login" && adminToken) {
    try {
      const { payload } = await verifyToken(adminToken);
      if (payload?.admin) return NextResponse.redirect(adminDashboard);
    } catch {}
  }

  // ✅ Admin route protection — ALWAYS on, independent of the auth toggle
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";

    if (!adminToken) return NextResponse.redirect(url);

    try {
      const { payload } = await verifyToken(adminToken);
      if (!payload.admin) throw new Error("Not an admin");
    } catch {
      return NextResponse.redirect(url);
    }
  }

  const token = req.cookies.get("accessToken")?.value;

  if (pathname === REFRESH_API_PATH) {
    // check API key
    const apiKeyFromQuery = req.nextUrl.searchParams.get("key");
    const apiKeyFromHeader = req.headers.get("x-api-key");

    if (
      apiKeyFromQuery !== REFRESH_API_KEY &&
      apiKeyFromHeader !== REFRESH_API_KEY
    ) {
      return new Response("Unauthorized BABU", { status: 401 });
    }
    return NextResponse.next();
  }

  const gate = await getGate(req);
  const authEnabled = gate.authEnabled;

  // ---- /auth page ----
  if (pathname === "/auth") {
    // Auth OFF: nobody should ever see the login page again.
    if (!authEnabled) {
      if (token) {
        try {
          await verifyToken(token);
          const url = req.nextUrl.clone();
          url.pathname = "/study";
          return NextResponse.redirect(url);
        } catch {
          /* fall through to guest creation */
        }
      }
      return guestRedirect(req, "/study");
    }

    // Auth ON: original behaviour
    if (token) {
      try {
        const { payload } = await verifyToken(token);
        if (!isRevoked(payload, gate.sessionEpoch)) {
          const url = req.nextUrl.clone();
          url.pathname = "/study";
          return NextResponse.redirect(url);
        }
      } catch {}
      return handleUnauthenticated(req, authEnabled, true);
    }
  }

  const isApi = pathname.startsWith("/api/");
  const isProtectedApi =
    isApi && !(isPublicApi(pathname) || isAdminApi(pathname));
  const isStudyPage = pathname.startsWith("/study");
  const isWatchPage = pathname.startsWith("/watch");

  if (isProtectedApi || isStudyPage || isWatchPage) {
    if (!token) {
      return handleUnauthenticated(req, authEnabled);
    }

    try {
      const { payload } = await verifyToken(token);
      if (isRevoked(payload, gate.sessionEpoch)) {
        return handleUnauthenticated(req, authEnabled, true);
      }
      return NextResponse.next();
    } catch (err: any) {
      console.warn("JWT invalid or expired:", err);
      return handleUnauthenticated(req, authEnabled);
    }
  }

  // ---- Any other page: auth OFF means every visitor gets a session ----
  if (!authEnabled && !isApi && !pathname.startsWith("/admin")) {
    if (!token) {
      return guestRedirect(req, pathname + req.nextUrl.search);
    }
    try {
      const { payload } = await verifyToken(token);
      if (isRevoked(payload, gate.sessionEpoch)) {
        return guestRedirect(req, pathname + req.nextUrl.search);
      }
    } catch {
      return guestRedirect(req, pathname + req.nextUrl.search);
    }
  }

  return NextResponse.next();
}

/** Send the visitor through the guest-session endpoint and back to `next`. */
function guestRedirect(req: NextRequest, next: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/api/auth/guest";
  url.search = `?next=${encodeURIComponent(next || "/study")}`;
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function handleUnauthenticated(
  req: NextRequest,
  authEnabled: boolean,
  revoked = false
) {
  const { pathname } = req.nextUrl;

  // Auth OFF -> never redirect to /auth.
  if (!authEnabled) {
    if (revoked && !pathname.startsWith("/api/")) {
      return guestRedirect(req, pathname + req.nextUrl.search);
    }
    // API calls must stay API calls: the handlers themselves create the guest
    // session (see utils/authenticateUser.ts), so just let them through.
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.next();
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    return guestRedirect(req, pathname + req.nextUrl.search);
  }

  return redirectWithCookieClear(req);
}

function redirectWithCookieClear(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/auth", req.url));

  res.cookies.set("accessToken", "", { path: "/", expires: new Date(0) });
  res.cookies.set("refreshToken", "", { path: "/", expires: new Date(0) });

  return res;
}

export const config = {
  matcher: [
    // Include all routes EXCEPT:
    // - _next (Next.js internal assets)
    // - static files (e.g., favicon, images)
    // - any file with an extension (e.g., .js, .css)
    "/((?!_next|favicon.ico|.*\\..*).*)",
  ],
};
