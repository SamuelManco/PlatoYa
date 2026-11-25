import { Router } from "express";
import { Dish } from "../models/Dish.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== "Todos") {
      filter.category = String(req.query.category).trim();
    }
    if (req.query.available !== undefined) {
      filter.available = req.query.available === "true";
    }

    const dishes = await Dish.find(filter).sort({ createdAt: 1 });
    return res.status(200).json({ dishes });
  } catch (err) {
    return next(err);
  }
});

export default router;
