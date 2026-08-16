import mongoose, { Schema, model, models } from "mongoose";

const PromotionSchema = new Schema({
  title: String,
  message: String,
});

const Promotion = (models.Promotion ||
  model("Promotion", PromotionSchema)) as mongoose.Model<any>;
export default Promotion;
