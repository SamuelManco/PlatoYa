import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    dishId: { type: mongoose.Schema.Types.ObjectId, ref: "Dish", required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0.01 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "PENDIENTE", "PREPARING", "READY", "DELIVERED"],
      default: "PENDING_PAYMENT",
    },
    paymentStatus: {
      type: String,
      enum: ["CREATED", "APPROVED", "CAPTURED", "FAILED", "CANCELLED"],
      default: "CREATED",
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
