import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateUser } from "@/utils/authenticateUser";
import { getAuthEnabled } from "@/lib/authMode";
import { createGuestUser } from "@/lib/guestSession";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const authEnabled = await getAuthEnabled();

    // ✅ Auth OFF: logging out must NOT drop the user on /auth.
    // Immediately hand out a brand new guest session instead.
    if (!authEnabled) {
      const { cookies, user } = await createGuestUser();
      res.setHeader("Set-Cookie", cookies);
      return res.status(200).json({
        message: "New guest session created",
        guest: true,
        userId: String(user._id),
        redirect: "/study",
      });
    }

    // Verify user before logout (auth ON = original behaviour)
    await authenticateUser(req, res);

    // Clear cookies by setting empty values and expired dates
    const isProd = process.env.NODE_ENV === "production";
    const cookieSecurity = isProd ? " SameSite=None; Secure;" : " SameSite=Lax;";
    res.setHeader("Set-Cookie", [
      `accessToken=; Path=/; HttpOnly; Max-Age=0;${cookieSecurity}`,
      `refreshToken=; Path=/; HttpOnly; Max-Age=0;${cookieSecurity}`,
    ]);

    return res.status(200).json({ message: "Logged out successfully", redirect: "/auth" });
  } catch (err: any) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
