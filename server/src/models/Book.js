import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Ingeniería", "Ficción", "Negocios", "Ciencia"],
    },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 10 },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Book = mongoose.model("Book", bookSchema);