// pages/api/auth/guest.ts
// Creates a fresh guest session (unique id in DB + auth cookies) and sends the
// visitor back to where they wanted to go. Used by middleware when auth is OFF.
import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthEnabled } from "@/lib/authMode";
import { createGuestSession } from "@/lib/guestSession";

function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/")) return "/study";
  if (next.startsWith("//")) return "/study";
  if (next.startsWith("/auth") || next.startsWith("/api/auth/guest")) return "/study";
  return next;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const wantsJson =
    req.method === "POST" || String(req.query.json || "") === "1";
  const next = safeNext(req.query.next);

  try {
    const authEnabled = await getAuthEnabled();

    if (authEnabled) {
      if (wantsJson) {
        return res
          .status(403)
          .json({ success: false, message: "Guest mode is disabled" });
      }
      res.writeHead(302, { Location: "/auth" });
      return res.end();
    }

    const user = await createGuestSession(res);

    if (wantsJson) {
      return res.status(200).json({
        success: true,
        guest: true,
        userId: String(user._id),
        guestId: (user as any).guestId,
        name: user.UserName,
        redirect: next,
      });
    }

    res.writeHead(302, { Location: next, "Cache-Control": "no-store" });
    return res.end();
  } catch (err: any) {
    console.error("[auth/guest] failed to create guest session:", err);
    if (wantsJson) {
      return res
        .status(500)
        .json({ success: false, message: "Could not create guest session" });
    }
    return res.status(503).send("Guest session could not be created. Check the server environment variables.");
  }
}
