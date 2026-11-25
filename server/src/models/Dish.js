import mongoose from "mongoose";

const dishSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0.01 },
    imageUrl: { type: String, default: "" },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Dish = mongoose.model("Dish", dishSchema);
