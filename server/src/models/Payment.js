import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    provider: { type: String, default: "PAYPAL" },
    providerOrderId: { type: String, required: true, unique: true },
    captureId: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["CREATED", "APPROVED", "CAPTURED", "FAILED", "CANCELLED"],
      default: "CREATED",
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
