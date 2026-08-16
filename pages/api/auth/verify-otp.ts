// /api/auth/verify-otp.ts - Delta Tenant Fix
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Batch from "@/models/Batch";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import ServerConfig from "@/models/ServerConfig";
import crypto from "crypto";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN!;
const TELEGRAM_CHANNEL_ID = process.env.LOG_CHANNEL_ID!;
const BASE_URL = process.env.PW_API || "https://api.penpencil.co";

async function sendTelegramLog(message: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err: any) {
    console.error("Failed to send Telegram log:", err);
  }
}

const JWT_SECRET = JWT_SECRET_VALUE;
const JWT_ACCESS_EXPIRES_SECONDS = Number(
  process.env.JWT_ACCESS_EXPIRES_SECONDS || 1296000
);

function normalizePhoneNumber(phone: string): string {
  phone = phone.trim().replace(/[^\d+]/g, "");
  return phone.startsWith("+") ? phone : "+91" + phone;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({
      success: false,
      message: "Phone number and OTP are required",
    });
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const userAgent = req.headers["user-agent"] || "unknown";
    
    await dbConnect();

    const config = await ServerConfig.findById(1);
    const isDirectLogin = config?.isDirectLoginOpen ?? false;

    let user = await User.findOne({ phoneNumber: normalizedPhone });

    if (!isDirectLogin) {
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    }

    const randomId = uuidv4();
    
    // ✅ FIX: Add all required headers
    const response = await fetch(`${BASE_URL}/v3/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Randomid: randomId,
        Referer: "https://www.pw.live/",
        Origin: "https://www.pw.live/",
        "client-id": "5eb393ee95fab7468a79d189",
        "client-type": "WEB",
        "client-version": "2.1.1",
        origin: "https://study-mf.pw.live",
        referer: "https://study-mf.pw.live/",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7,zh-CN;q=0.6,zh;q=0.5",
        "user-agent": userAgent,
        priority: "u=1, i",
      },
      body: JSON.stringify({
        username: phoneNumber,
        otp: otp,
        client_id: "system-admin",
        client_secret: "KjPXuAVfC5xbmgreETNMaL7z",
        grant_type: "password",
        organizationId: "5eb393ee95fab7468a79d189",
        latitude: 0,
        longitude: 0,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return res.status(401).json({
        success: false,
        message: "OTP verification failed!",
        data: data,
      });
    }

    // ✅ User creation logic
    if (!user && isDirectLogin) {
      const last4Digits = normalizedPhone.slice(-4);
      user = await User.create({
        UserName:
          data.data.user.firstName + " " + data.data.user.lastName ||
          `User_${last4Digits}`,
        phoneNumber: normalizedPhone,
        telegramId: null,
        photoUrl:
          data.data.user.imageId?.baseUrl && data.data.user.imageId?.key
            ? data.data.user.imageId.baseUrl + data.data.user.imageId.key
            : "https://cdn-icons-png.flaticon.com/512/3607/3607444.png",
        tag: "user",
        tagExpiry: null,
        hasLoggedIn: false,
        enrolledBatches: [],
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const realAccessToken = data.data.access_token;
    const realRefreshToken = data.data.refresh_token;

    user.ActualToken = realAccessToken;
    user.ActualRefresh = realRefreshToken;
    user.randomId = randomId;

    // ✅ Batch sync logic
    async function fetchPurchasedBatches(accessToken: string) {
      const randomId = uuidv4();
      const response = await fetch(
        `${BASE_URL}/batch-service/v1/batches/purchased-batches?page=1&type=ALL&amount=paid`,
        {
          method: "GET",
          headers: {
            accept: "application/json, text/plain, */*",
            authorization: `Bearer ${accessToken}`,
            "client-id": "5eb393ee95fab7468a79d189",
            "client-type": "WEB",
            "client-version": "1.1.1",
            randomid: randomId,
          },
        }
      );
      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) return [];
      return data.data.map((item: any) => item.batch || item);
    }

    const { getBatchInfo } = await import("@/lib/batch");
    const purchasedBatches = await fetchPurchasedBatches(realAccessToken);
    
    for (const batch of purchasedBatches) {
      const batchDetails = await getBatchInfo(batch._id, "details");
      const batchDoc = {
        batchId: batch._id,
        batchName: batchDetails?.name || batch.name || "Unknown Batch",
        batchPrice: batchDetails?.fee?.total || 0,
        batchImage:
          batchDetails?.iosPreviewImageUrl ||
          (batchDetails?.previewImage?.baseUrl &&
          batchDetails?.previewImage?.key
            ? batchDetails.previewImage.baseUrl + batchDetails.previewImage.key
            : ""),
        template: batchDetails?.template || "NORMAL",
        BatchType: "FREE",
        language: batchDetails?.language || "English",
        byName: batchDetails?.byName || "Unknown",
        startDate: batchDetails?.startDate || "",
        endDate: batchDetails?.endDate || "",
        batchStatus: !(batchDetails?.isBlocked || batch.isBlocked) || true,
      };
      
      const enrolledToken = {
        ownerId: user._id,
        accessToken: realAccessToken,
        refreshToken: realRefreshToken,
        tokenStatus: true,
        randomId,
        updatedAt: new Date(),
      };
      
      const existingBatch = await Batch.findOne({ batchId: batch._id });
      if (!existingBatch) {
        await Batch.create({ ...batchDoc, enrolledTokens: [enrolledToken] });
      } else {
        const tokenIdx = existingBatch.enrolledTokens.findIndex(
          (t: any) => t.ownerId.toString() === user._id.toString()
        );
        if (tokenIdx !== -1) {
          existingBatch.enrolledTokens[tokenIdx] = enrolledToken;
        } else {
          existingBatch.enrolledTokens.push(enrolledToken);
        }
        Object.assign(existingBatch, batchDoc);
        await existingBatch.save();
      }
    }

    await Batch.updateMany(
      { "enrolledTokens.ownerId": user._id },
      {
        $set: {
          "enrolledTokens.$[elem].accessToken": realAccessToken,
          "enrolledTokens.$[elem].refreshToken": realRefreshToken,
          "enrolledTokens.$[elem].updatedAt": new Date(),
          "enrolledTokens.$[elem].randomId": randomId,
          "enrolledTokens.$[elem].tokenStatus": true,
        },
      },
      {
        arrayFilters: [{ "elem.ownerId": user._id }],
      }
    );

    // ✅ JWT Generation
    const payload = {
      userId: user._id,
      name: user.UserName,
      telegramId: user.telegramId,
      PhotoUrl: user.photoUrl,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRES_SECONDS,
    });

    let refreshToken = "";
    while (true) {
      refreshToken = crypto.randomBytes(64).toString("hex");
      if (!(await User.findOne({ refreshToken }))) break;
    }

    user.refreshToken = refreshToken;
    user.hasLoggedIn = true;
    await user.save();

    const isProd = process.env.NODE_ENV === "production";
    const cookieSecurity = isProd
      ? "; SameSite=None; Secure"
      : "; SameSite=Lax";

    res.setHeader("Set-Cookie", [
      `accessToken=${accessToken}; Path=/; HttpOnly${cookieSecurity}; Max-Age=${
        60 * 60 * 24 * 15
      }`,
      `refreshToken=${refreshToken}; Path=/; HttpOnly${cookieSecurity}; Max-Age=${
        60 * 60 * 24 * 30
      }`,
    ]);

    await sendTelegramLog(`
✅ *OTP Login Verified for ${user.UserName || "Unknown User"}*

📱 *Phone:* ${normalizedPhone}
🧠 *User ID:* \`${user._id}\`
🔁 *Batches Updated:* ${purchasedBatches.length}
    `);

    return res.status(200).json({
      success: true,
      message: "OTP verified",
      user: {
        id: user._id.toString(),
        name: user.UserName,
        telegramId: user.telegramId,
        photoUrl: user.photoUrl,
      },
    });
  } catch (err: any) {
    console.error("OTP Verification Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", err: err.message });
  }
}