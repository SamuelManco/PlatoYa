import { Router } from "express";
import { Book } from "../models/Book.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== "Todos") {
      filter.category = req.query.category;
    }
    const books = await Book.find(filter).sort({ createdAt: 1 });
    return res.status(200).json({ books });
  } catch (err) {
    return next(err);
  }
});

export default router;