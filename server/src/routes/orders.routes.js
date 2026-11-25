import { Router } from "express";
import { Book } from "../models/Book.js";
import { Order } from "../models/Order.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";
import { canCookTransition } from "../config/stateMachine.js";

const router = Router();

router.post("/", verifyToken(process.env.JWT_SECRET), requireRole("cliente"), async (req, res, next) => {
  try {
    const { items, address } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "El pedido debe incluir al menos un libro" });
    }
    if (!address || String(address).trim().length < 4) {
      return res.status(400).json({ error: "Debes indicar una dirección de envío válida" });
    }

    const normalizedItems = [];
    let recalculatedTotal = 0;

    for (const rawItem of items) {
      const quantity = Number(rawItem?.quantity);
      if (!rawItem?.bookId || !Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "Cantidad o identificador de libro inválido" });
      }

      const book = await Book.findById(rawItem.bookId);
      if (!book || !book.available || book.stock < quantity) {
        return res.status(400).json({
          error: `Stock insuficiente o libro no disponible: ${book ? book.title : rawItem.bookId}`,
        });
      }

      const unitPrice = Number(book.price);
      recalculatedTotal += unitPrice * quantity;
      normalizedItems.push({
        bookId: book._id,
        title: book.title,
        unitPrice,
        quantity,
      });
    }

    const order = await Order.create({
      userId: req.user.sub,
      items: normalizedItems,
      address: String(address).trim(),
      total: Number(recalculatedTotal.toFixed(2)),
      status: "PENDING_PAYMENT",
      paymentStatus: "CREATED",
    });

    return res.status(201).json({ order });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", verifyToken(process.env.JWT_SECRET), requireRole("cliente"), async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 });
    return res.status(200).json({ orders });
  } catch (err) {
    return next(err);
  }
});

router.get("/shipments", verifyToken(process.env.JWT_SECRET), requireRole("logistica"), async (_req, res, next) => {
  try {
    const orders = await Order.find({
      paymentStatus: "CAPTURED",
      status: { $in: ["PENDIENTE", "PREPARING", "READY", "DELIVERED"] },
    }).sort({ createdAt: 1 });
    return res.status(200).json({ orders });
  } catch (err) {
    return next(err);
  }
});

router.patch("/:id/status", verifyToken(process.env.JWT_SECRET), requireRole("logistica"), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }
    if (order.paymentStatus !== "CAPTURED") {
      return res.status(400).json({ error: "Solo se pueden despachar órdenes pagadas" });
    }
    if (!canCookTransition(order.status, status)) {
      return res.status(409).json({
        error: `Transición de envío no permitida de ${order.status} a ${status}`,
      });
    }

    order.status = status;
    await order.save();

    const io = req.app.get("io");
    if (io) {
      io.to("logistics").emit("order:statusChanged", order);
      io.to(`user:${order.userId.toString()}`).emit("order:updated", order);
    }

    return res.status(200).json({ order });
  } catch (err) {
    return next(err);
  }
});

export default router;