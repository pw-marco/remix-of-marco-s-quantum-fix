// models/ServerConfig.ts
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface IShortnerServer {
  name: string;
  enabled: boolean;
  api_url: string;
  api_key: string;
}

export interface IPlayerConfig {
  primaryApi: string;
  marcoApi: string;
  pythonApi: string;
  iframeBaseUrl: string;
  useIframe: boolean;
  providerOrder: string[];
  extraHeaders?: Record<string, string>;
}

export interface IServerConfig extends mongoose.Document<number> {
  _id: number;
  webName: string;
  registrationOpen: boolean;
  sidebarLogoUrl: string;
  sidebarTitle: string;
  isDirectLoginOpen: boolean;
  password: string;
  tg_bot: string;
  tg_channel: string;
  tg_username: string;
  username: string;
  shortner_servers: IShortnerServer[];
  /** false => auth OFF: every visitor silently gets a guest session */
  authEnabled: boolean;
  keyGenerationEnabled: boolean;
  /** Global PenPencil access token used by all guest users */
  penpencilToken: string;
  penpencilRefreshToken: string;
  penpencilTokenUpdatedAt?: Date | null;
  /** Bumped whenever every existing session must be invalidated (ms epoch). */
  sessionEpoch: number;
  /** Live-editable player / stream backend configuration. */
  playerConfig: IPlayerConfig;
  /** Origins (hosts) that are not allowed to reach the site. */
  blockedOrigins: string[];
  updatedAt: Date;
}

const serverConfigSchema = new mongoose.Schema<IServerConfig>(
  {
    _id: { type: Number, required: true, default: 1 },
    webName: { type: String, required: true },
    registrationOpen: { type: Boolean, required: true },
    sidebarLogoUrl: { type: String, required: true },
    sidebarTitle: { type: String, required: true },
    isDirectLoginOpen: { type: Boolean, required: false },
    password: { type: String, required: true },
    tg_bot: { type: String, required: true },
    tg_channel: { type: String, required: true },
    tg_username: { type: String, required: true },
    username: { type: String, required: true },
    shortner_servers: {
      type: [
        {
          name: { type: String, required: true },
          enabled: { type: Boolean, required: true },
          api_url: { type: String, required: true },
          api_key: { type: String, required: true },
        },
      ],
      required: true,
    },

    // ---- Guest mode / auth toggle ----
    authEnabled: { type: Boolean, required: false, default: false },
    keyGenerationEnabled: { type: Boolean, required: false, default: false },

    // ---- Global PenPencil token (used when auth is OFF / for guests) ----
    penpencilToken: { type: String, required: false, default: "" },
    penpencilRefreshToken: { type: String, required: false, default: "" },
    penpencilTokenUpdatedAt: { type: Date, required: false, default: null },

    // ---- Session revocation ----
    sessionEpoch: { type: Number, required: false, default: 0 },

    // ---- Live-editable player backends ----
    playerConfig: { type: mongoose.Schema.Types.Mixed, required: false, default: {} },

    // ---- Origin firewall ----
    blockedOrigins: { type: [String], required: false, default: [] },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Hash password before saving if modified
serverConfigSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const ServerConfig = (mongoose.models.ServerConfig ||
  mongoose.model<IServerConfig>("ServerConfig", serverConfigSchema)) as mongoose.Model<any>;

export default ServerConfig;
