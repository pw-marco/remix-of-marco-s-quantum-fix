// pages/api/admin/get-batches.ts
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import Batch from "@/models/Batch";
import User from "@/models/User";
import axios from "axios";
import jwt from "jsonwebtoken";
import { parse } from "cookie";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const JWT_SECRET = JWT_SECRET_VALUE;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return handleGetBatches(req, res);
  } else if (req.method === "POST") {
    return handleCheckActiveTokens(req, res);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGetBatches(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.admin_token;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object" || !decoded.admin) {
      return res.status(401).json({ message: "Invalid token" });
    }

    await dbConnect();

    const { page = "1", limit = "10", search = "" } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { batchName: { $regex: search, $options: "i" } },
          { batchId: { $regex: search, $options: "i" } },
          { byName: { $regex: search, $options: "i" } },
          { language: { $regex: search, $options: "i" } },
        ],
      };
    }

    const batches = await Batch.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalBatches = await Batch.countDocuments(searchQuery);

    const batchesWithUsers = await Promise.all(
      batches.map(async (batch) => {
        try {
          const enrolledTokens = (batch as any).enrolledTokens || [];
          const userIds = enrolledTokens
            .map((token: any) => token?.ownerId)
            .filter(Boolean);
          
          let users: any[] = [];
          if (userIds.length > 0) {
            users = await User.find({ _id: { $in: userIds } })
              .select("UserName phoneNumber telegramId")
              .lean();
          }

          const userMap = new Map();
          users.forEach((user: any) => {
            if (user?._id) {
              userMap.set(user._id.toString(), {
                _id: user._id,
                UserName: user.UserName || "Unknown",
                phoneNumber: user.phoneNumber || "N/A",
                telegramId: user.telegramId,
              });
            }
          });

          const enrolledUsers = enrolledTokens.map((token: any) => {
            const userId = token?.ownerId?.toString();
            const user = userId ? userMap.get(userId) : null;
            return {
              _id: token?.ownerId || null,
              UserName: user?.UserName || "Unknown User",
              phoneNumber: user?.phoneNumber || "N/A",
              telegramId: user?.telegramId || null,
              tokenStatus: token?.tokenStatus || false,
              updatedAt: token?.updatedAt || new Date(),
            };
          });

          const { enrolledTokens: _, ...batchWithoutTokens } = batch;
          return {
            ...batchWithoutTokens,
            enrolledUsers,
          };
        } catch {
          return {
            ...batch,
            enrolledUsers: [],
          };
        }
      })
    );

    return res.status(200).json({
      batches: batchesWithUsers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalBatches / limitNum) || 1,
        totalBatches,
        hasNextPage: pageNum * limitNum < totalBatches,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

async function handleCheckActiveTokens(req: NextApiRequest, res: NextApiResponse) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.admin_token;
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== "object" || !decoded.admin) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ message: "Batch ID is required" });
    }

    await dbConnect();

    const batch = await Batch.findOne({ batchId }).lean();
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const PW_API = process.env.PW_API;
    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    const enrolledTokens = ((batch as any).enrolledTokens as any[]) || [];
    for (const token of enrolledTokens) {
      if (!token.accessToken || !token.randomId) {
        failedCount++;
        results.push({
          userId: token.ownerId,
          status: "no_token",
          message: "No access token or random ID",
        });
        continue;
      }

      try {
        const { getHeaders } = await import("@/utils/auth");
        const url = `${PW_API}/v1/users/user-profile-info?fields=cohortId`;
        const headers = getHeaders(token.accessToken);
        const response = await axios.get(url, { headers });

        if (response.data?.success === true) {
          successCount++;
          results.push({
            userId: token.ownerId,
            status: "success",
            message: "Token is active",
          });
        }
      } catch {
        failedCount++;
        results.push({
          userId: token.ownerId,
          status: "failed",
          message: "Token check failed",
        });
      }
    }

    return res.status(200).json({
      batchId,
      totalTokens: enrolledTokens.length,
      successCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Internal server error" });
  }
}