// models/OriginLog.ts
// Tracks every distinct Origin / Referer host that hits the site, so the admin
// can spot proxies / mirrors and block them instantly.
import mongoose from "mongoose";

export interface IOriginLog extends mongoose.Document {
  origin: string;
  lastPath: string;
  lastIp: string;
  lastUserAgent: string;
  hits: number;
  blocked: boolean;
  firstSeen: Date;
  lastSeen: Date;
}

const originLogSchema = new mongoose.Schema<IOriginLog>({
  origin: { type: String, required: true, unique: true, index: true },
  lastPath: { type: String, default: "" },
  lastIp: { type: String, default: "" },
  lastUserAgent: { type: String, default: "" },
  hits: { type: Number, default: 0 },
  blocked: { type: Boolean, default: false },
  firstSeen: { type: Date, default: () => new Date() },
  lastSeen: { type: Date, default: () => new Date() },
});

const OriginLog = (mongoose.models.OriginLog ||
  mongoose.model<IOriginLog>("OriginLog", originLogSchema)) as mongoose.Model<any>;

export default OriginLog;
