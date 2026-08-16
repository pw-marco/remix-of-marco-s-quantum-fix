// pages/api/admin/db-status.ts
// Admin-only diagnostics: tells exactly WHICH MongoDB database the app is
// connected to and how many documents each important collection has.
// Use this when the admin panel says "No batches found".
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import dbConnect, { resolveDbName } from "@/lib/mongodb";
import { JWT_SECRET_VALUE } from "@/lib/defaults";

function isAdmin(req: NextApiRequest): boolean {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.admin_token;
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET_VALUE);
    return Boolean(decoded && typeof decoded === "object" && (decoded as any).admin);
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: "No database handle" });
    }

    const collections = await db.listCollections().toArray();
    const counts: Record<string, number> = {};
    for (const c of collections) {
      counts[c.name] = await db.collection(c.name).countDocuments();
    }

    // Also look for batches sitting in a different database (a very common
    // cause of "No batches found" when MONGODB_URI has no db name).
    let otherDatabases: { name: string; batches: number }[] = [];
    try {
      const admin = db.admin();
      const list = await admin.listDatabases();
      otherDatabases = await Promise.all(
        list.databases
          .filter((d: any) => !["admin", "local", "config"].includes(d.name))
          .map(async (d: any) => ({
            name: d.name,
            batches: await mongoose.connection
              .getClient()
              .db(d.name)
              .collection("batches")
              .countDocuments()
              .catch(() => 0),
          }))
      );
    } catch {
      otherDatabases = [];
    }

    return res.status(200).json({
      connectedDatabase: db.databaseName,
      resolvedFrom: resolveDbName(process.env.MONGODB_URI),
      mongodbDbEnv: process.env.MONGODB_DB || null,
      collections: counts,
      batches: counts["batches"] ?? 0,
      users: counts["users"] ?? 0,
      serverConfigs: counts["serverconfigs"] ?? 0,
      otherDatabases,
      hint:
        (counts["batches"] ?? 0) === 0
          ? "No batches in the connected database. Check `otherDatabases` above and set MONGODB_DB (or add the db name to MONGODB_URI) to that database."
          : "OK",
    });
  } catch (error: any) {
    console.error("[db-status]", error);
    return res
      .status(500)
      .json({ message: "Database error", error: error?.message || String(error) });
  }
}
