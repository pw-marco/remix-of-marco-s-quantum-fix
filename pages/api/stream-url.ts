import type { NextApiRequest, NextApiResponse } from "next";
import { authenticateUser } from "@/utils/authenticateUser";

const DEFAULT_STREAM_WORKER =
  process.env.STREAM_URL_API ||
  "https://pwmarco-streamurl.r9140128682.workers.dev/v6/xvideos";

function pick(obj: any, keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  }
  return "";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await authenticateUser(req, res);

    const one = (v: string | string[] | undefined) =>
      (Array.isArray(v) ? v[0] : v) || "";

    const parentId = one(req.query.parentId as any) || one(req.query.batchId as any);
    const childId = one(req.query.childId as any);
    const urlType = one(req.query.urlType as any) || "penpencilvdo";

    if (!parentId || !childId) {
      return res
        .status(400)
        .json({ success: false, message: "`parentId` and `childId` are required" });
    }

    const target = `${DEFAULT_STREAM_WORKER}?parentId=${encodeURIComponent(
      parentId
    )}&childId=${encodeURIComponent(childId)}&urlType=${encodeURIComponent(urlType)}`;

    const upstream = await fetch(target, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: `Stream API HTTP ${upstream.status}`,
      });
    }

    const json: any = await upstream.json();

    if (json?.success === false) {
      return res.status(502).json({
        success: false,
        message: json?.message || json?.error || "Stream API failed",
      });
    }

    const d = (json && typeof json.data === "object" && json.data) || json || {};

    const videoUrl =
      pick(d, [
        "videoUrl",
        "m3u8_url",
        "hls_url",
        "stream_url",
        "streamUrl",
        "url",
        "playbackUrl",
        "manifest_url",
      ]) || pick(json, ["videoUrl", "url"]);

    if (!videoUrl) {
      return res
        .status(502)
        .json({ success: false, message: "No stream url in response" });
    }

    const kid = d.kid || json.kid || "";
    const key = d.key || json.key || "";

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      success: true,
      data: {
        videoUrl,
        urlType: d.urlType || json.urlType || urlType,
        kid,
        key,
        clearKeys: kid && key ? { [kid]: key } : d.clearKeys || {},
        topic: d.topic || json.topic || "Video",
      },
    });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({
      success: false,
      message: error?.message || "Error fetching stream url",
    });
  }
}
