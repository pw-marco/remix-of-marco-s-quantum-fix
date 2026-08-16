import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import ServerConfig from "@/models/ServerConfig";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  DEFAULT_ADMIN_USERNAME,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_PENPENCIL_TOKEN,
  DEFAULT_PENPENCIL_REFRESH_TOKEN,
  JWT_SECRET_VALUE,
} from "@/lib/defaults";

const isProd = process.env.NODE_ENV === "production";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  await dbConnect();
  let config = await ServerConfig.findOne({ _id: 1 });

  // Vercel cannot run the interactive setup script during deployment. When
  // ADMIN_USERNAME and ADMIN_PASSWORD are configured, keep the DB login in
  // sync on the first successful environment-credential login.
  const envUsername = DEFAULT_ADMIN_USERNAME;
  const envPassword = DEFAULT_ADMIN_PASSWORD;
  const isEnvironmentLogin =
    Boolean(envUsername && envPassword) &&
    username === envUsername &&
    password === envPassword;

  if (isEnvironmentLogin) {
    const currentHashMatches = config?.password
      ? await bcrypt.compare(envPassword as string, config.password)
      : false;
    if (!config || config.username !== envUsername || !currentHashMatches) {
      const passwordHash = await bcrypt.hash(envPassword as string, 10);
      await ServerConfig.updateOne(
        { _id: 1 },
        {
          $set: { username: envUsername, password: passwordHash },
          $setOnInsert: {
            webName: "PW-MARCO",
            sidebarTitle: "PW-MARCO",
            sidebarLogoUrl: "https://i.ibb.co/YBbwNGxz/Logo-pw-removebg-preview.png",
            isDirectLoginOpen: true,
            registrationOpen: true,
            tg_bot: "nothing",
            tg_channel: "official_marco_22",
            tg_username: "officialmarco22",
            shortner_servers: [],
            authEnabled: false,
            keyGenerationEnabled: false,
            penpencilToken: DEFAULT_PENPENCIL_TOKEN,
            penpencilRefreshToken: DEFAULT_PENPENCIL_REFRESH_TOKEN,
          },
        },
        { upsert: true }
      );
      config = await ServerConfig.findOne({ _id: 1 });
    }

    // Seed the default global PenPencil token if none is saved yet.
    if (config && !config.penpencilToken && DEFAULT_PENPENCIL_TOKEN) {
      await ServerConfig.updateOne(
        { _id: 1 },
        {
          $set: {
            penpencilToken: DEFAULT_PENPENCIL_TOKEN,
            penpencilRefreshToken: DEFAULT_PENPENCIL_REFRESH_TOKEN,
            penpencilTokenUpdatedAt: new Date(),
          },
        }
      );
      config = await ServerConfig.findOne({ _id: 1 });
    }
  }
  if (!config || !config.username) {
    return res.status(503).json({
      message: "Admin not configured. Add ADMIN_USERNAME and ADMIN_PASSWORD in Vercel Environment Variables.",
    });
  }

  const isMatch = await bcrypt.compare(password, config.password);
  if (!isMatch || username !== config.username) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const jwtSecret = JWT_SECRET_VALUE;
  if (!jwtSecret) {
    return res.status(503).json({ message: "JWT_SECRET is not configured" });
  }

  const token = jwt.sign(
    { admin: true, username: config.username },
    jwtSecret,
    { expiresIn: "2h" }
  );

  const cookieSecurity = isProd
    ? "; SameSite=None; Secure"
    : "; SameSite=Lax"; // for dev use

  res.setHeader("Set-Cookie", [
    `admin_token=${token}; Path=/; HttpOnly${cookieSecurity}; Max-Age=${60 * 60 * 2}`
  ]);

  return res.status(200).json({ success: true });
}
