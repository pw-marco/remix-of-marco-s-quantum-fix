import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface IUser extends mongoose.Document {
  UserName: string;
  phoneNumber: string;
  telegramId: string;
  photoUrl?: string | null;
  tag?: string;
  tagExpiry?: Date;
  hasLoggedIn: boolean;
  refreshToken?: string | null; // Your app's refresh token
  ActualToken?: string | null; // PenPencil access_token
  ActualRefresh?: string | null; // PenPencil refresh_token
  randomId?: string | null; // ✅ important to call /video url :)
  isGuest?: boolean; // ✅ auto-created guest session (auth OFF)
  guestId?: string | null; // ✅ unique id of the guest session
  enrolledBatches: { batchId: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    UserName: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    telegramId: { type: String, required: false, unique: false, default: null },
    photoUrl: { type: String, default: null },
    tag: { type: String, default: null, required: false },
    tagExpiry: { type: Date, default: null },
    hasLoggedIn: { type: Boolean, default: false },
    refreshToken: { type: String },
    ActualToken: { type: String },
    ActualRefresh: { type: String },
    randomId: { type: String }, // ✅ Add this line

    // ---- Guest session fields (used when auth is OFF) ----
    isGuest: { type: Boolean, default: false, index: true },
    guestId: { type: String, default: null, unique: true, sparse: true },

    enrolledBatches: [
      {
        batchId: { type: String, required: true },
        name: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const User = (models.User ||
  model<IUser>("User", userSchema)) as import("mongoose").Model<any>;

export default User;
