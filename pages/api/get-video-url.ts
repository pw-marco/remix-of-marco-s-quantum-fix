// pages/api/get-video-url.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import Batch from "@/models/Batch";
import crypto from "crypto";
import { getVideoHeaders } from "@/utils/auth";
import {
  forceRenewGlobalPenpencilToken,
  resolvePenpencilToken,
} from "@/utils/penpencilToken";
import dbConnect from "@/lib/mongodb";
import { authenticateUser } from "@/utils/authenticateUser";
import User from "@/models/User";

// ✅ Rate limiting map
const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = 15;
  const win = 60_000;
  const entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + win });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

function fixUrl(u: string): string {
  if (!u) return u;
  return u.replace(/%7E/g, "~").replace(/%7e/g, "~");
}

function cfMpdToM3u8(mpdUrl: string): string {
  if (!mpdUrl) return mpdUrl;
  if (mpdUrl.includes("/master.mpd")) {
    return mpdUrl.replace("/master.mpd", "/master.m3u8");
  }
  return mpdUrl.replace(".mpd", ".m3u8");
}

// ✅ New: Fetch from Python Server
async function fetchFromPythonServer(batchId: string, childId: string, subjectId: string) {
  const PYTHON_SERVER = "https://proxy.deltaverse.site/api/prepare";
  
  const response = await fetch(PYTHON_SERVER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: JSON.stringify({
      batchId: batchId,
      videoId: childId,
      subjectSlug: subjectId,
      useHardcoded: true
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    throw new Error(`Python server HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || "Python server returned error");
  }
  
  const mpdUrl = data.manifest_url || data.m3u8_url || data.hls_url || "";
  const kid = data.kid || "";
  const key = data.key || "";
  const drmProtected = data.drm_protected || false;
  const videoContainer = data.video_container || "DASH";
  const isLive = data.is_live || false;
  const topic = data.topic || "Video";
  
  if (!mpdUrl) {
    throw new Error("No URL in server response");
  }

  const fixedUrl = fixUrl(mpdUrl);
  const cfM3u8 = cfMpdToM3u8(fixedUrl);

  return {
    url: fixedUrl,
    signedUrl: "",
    clearKeys: kid && key ? { [kid]: key } : {},
    topic: topic,
    m3u8_url: cfM3u8,
    hls_url: cfM3u8,
    is_live: isLive,
    video_container: videoContainer,
    drm_protected: drmProtected,
    kid: kid,
    key: key,
    dataFrom: "PythonServer"
  };
}

// ✅ New: Fetch from Marco API
async function fetchFromMarco(batchId: string, childId: string) {
  const MARCO_API = "https://pwstream-proxy-marco.r9140128682.workers.dev/api/video-url";
  const url = `${MARCO_API}?batchId=${batchId}&childId=${childId}`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) {
    throw new Error(`Marco API failed: ${res.status}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error("Marco API returned success:false");
  }

  const d = data.data || {};
  const directUrl = d.directUrl || data.directUrl || "";
  const signedUrl = d.signedUrl || data.signedUrl || "";
  const clearKeys = d.clearKeys || data.clearKeys || {};
  const topic = d.topic || data.topic || "";

  if (!directUrl) {
    throw new Error("No directUrl in response");
  }

  const fullCfUrl = signedUrl ? directUrl + signedUrl : directUrl;
  const fixedUrl = fixUrl(fullCfUrl);
  const cfM3u8 = cfMpdToM3u8(fixedUrl);

  const kid = Object.keys(clearKeys)[0] || "";
  const key = clearKeys[kid] || "";

  return {
    url: fixedUrl,
    signedUrl: signedUrl,
    clearKeys: clearKeys,
    topic: topic,
    m3u8_url: cfM3u8,
    hls_url: cfM3u8,
    is_live: false,
    video_container: "DASH",
    drm_protected: !!kid,
    kid: kid,
    key: key,
    dataFrom: "MarcoAPI"
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { batchId, subjectId, childId } = req.query;

  try {
    const PW_API = process.env.PW_API;
    await dbConnect();

    const user = await authenticateUser(req, res);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!batchId || !subjectId || !childId) {
      return res.status(400).json({
        message: "`batchId`, `subjectId`, and `childId` are required",
      });
    }

    const batch = await Batch.findOne({ batchId });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // ✅ Rate limiting
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || "unknown";
    if (isRateLimited(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    }

    // ✅ First try: Python Server
    try {
      const videoData = await fetchFromPythonServer(
        batchId as string,
        childId as string,
        subjectId as string
      );

      return res.status(200).json({
        success: true,
        data: {
          url: videoData.url,
          signedUrl: videoData.signedUrl,
          clearKeys: videoData.clearKeys,
          topic: videoData.topic,
          m3u8_url: videoData.m3u8_url,
          hls_url: videoData.hls_url,
          is_live: videoData.is_live,
          video_container: videoData.video_container,
          drm_protected: videoData.drm_protected,
          kid: videoData.kid,
          key: videoData.key,
          dataFrom: videoData.dataFrom
        }
      });
    } catch (pythonError) {
      console.warn("Python server failed, trying Marco...", pythonError);
      
      // ✅ Fallback: Marco API
      try {
        const videoData = await fetchFromMarco(
          batchId as string,
          childId as string
        );

        return res.status(200).json({
          success: true,
          data: {
            url: videoData.url,
            signedUrl: videoData.signedUrl,
            clearKeys: videoData.clearKeys,
            topic: videoData.topic,
            m3u8_url: videoData.m3u8_url,
            hls_url: videoData.hls_url,
            is_live: videoData.is_live,
            video_container: videoData.video_container,
            drm_protected: videoData.drm_protected,
            kid: videoData.kid,
            key: videoData.key,
            dataFrom: videoData.dataFrom
          }
        });
      } catch (marcoError) {
        console.error("Both Python and Marco failed:", marcoError);
        
        // ✅ Final fallback: Old logic
        const tokensToTry = [...batch.enrolledTokens];

        // ✅ Guest / auth-OFF: put the global admin token first so guests can
        // always play videos even if the batch has no enrolled user tokens.
        const globalToken = await resolvePenpencilToken(user as any);
        if (globalToken) {
          tokensToTry.unshift({
            ownerId: null,
            accessToken: globalToken,
            randomId: (user as any)?.randomId || crypto.randomUUID(),
          } as any);
        }

        for (const token of tokensToTry) {
          if (!token.accessToken || !token.randomId) {
            continue;
          }

          const videoDetailsUrl = `${PW_API}/v1/videos/video-url-details?type=BATCHES&videoContainerType=DASH&reqType=query&childId=${childId}&parentId=${batchId}&clientVersion=201`;
          try {
            const headers = getVideoHeaders(token.accessToken, token.randomId);
            const response = await axios.get(videoDetailsUrl, { headers });

            return res.status(200).json(response.data);
          } catch (error: any) {
            if (error.response?.status === 401) {
              if (!token.ownerId) {
                const renewedToken = await forceRenewGlobalPenpencilToken();
                if (renewedToken && renewedToken !== token.accessToken) {
                  try {
                    const renewedHeaders = getVideoHeaders(
                      renewedToken,
                      token.randomId || crypto.randomUUID()
                    );
                    const renewedResponse = await axios.get(videoDetailsUrl, {
                      headers: renewedHeaders,
                    });
                    return res.status(200).json(renewedResponse.data);
                  } catch (renewedError: any) {
                    console.warn(
                      "Renewed global PenPencil token was rejected:",
                      renewedError.response?.status || renewedError.message
                    );
                  }
                }
                console.warn("Global PenPencil token rejected and automatic renewal failed.");
                continue;
              }
              console.warn(
                `Token for owner ${token.ownerId} failed for batch ${batchId}. Removing it.`
              );

              await Batch.updateOne(
                { _id: batch._id },
                {
                  $pull: {
                    enrolledTokens: { ownerId: token.ownerId },
                  },
                }
              );

              if (token.ownerId) {
                await User.updateOne(
                  { _id: token.ownerId },
                  { $pull: { enrolledBatches: { batchId: String(batchId) } } }
                );
              }
              continue;
            } else {
              const status = error.response?.status || 500;
              return res.status(status).json({
                success: false,
                message:
                  error.response?.data?.message ||
                  error.message ||
                  "Something went wrong",
              });
            }
          }
        }

        return res.status(403).json({
          success: false,
          message:
            "This Batch is unavailable. Please contact admin to add this batch.",
        });
      }
    }
  } catch (error: any) {
    console.error("Outer error in get-video-url:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An unexpected server error occurred",
    });
  }
}