import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import { getOrCreateServerConfig } from "@/lib/ensureServerConfig";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    const configDoc = await getOrCreateServerConfig();
    const config = (configDoc?.toObject ? configDoc.toObject() : configDoc) as any;
    if (!config) {
      return res.status(404).json({ error: "Server config not found" });
    }
    const { sidebarLogoUrl, sidebarTitle, tg_channel, tg_username, isDirectLoginOpen, webName, tg_bot } = config;
    const authEnabled = config.authEnabled === true;
    return res.status(200).json({
      webName,
      sidebarLogoUrl,
      sidebarTitle,
      tg_channel,
      tg_username,
      isDirectLoginOpen,
      tg_bot,
      authEnabled,
      guestMode: !authEnabled
    });
  } catch (error) {
    console.error("[serverInfo] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
