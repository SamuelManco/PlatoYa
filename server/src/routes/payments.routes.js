import { Router } from "express";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { verifyToken, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

function hasPaypalCredentials() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function getPaypalAccessToken() {
  const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error("No se pudo autenticar con PayPal Sandbox");
  }
  const data = await res.json();
  return data.access_token;
}

router.post(
  "/paypal/order",
  verifyToken(process.env.JWT_SECRET),
  requireRole("cliente"),
  async (req, res, next) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ error: "orderId es requerido" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      if (order.userId.toString() !== req.user.sub) {
        return res.status(403).json({ error: "No eres propietario de este pedido" });
      }
      if (order.paymentStatus === "CAPTURED" || order.status !== "PENDING_PAYMENT") {
        return res.status(409).json({ error: "El pedido ya fue pagado o no está pendiente de pago" });
      }

      const amountValue = Number(order.total).toFixed(2);
      const currency = "USD";

      if (!hasPaypalCredentials()) {
        const mockOrderId = `SANDBOX-LOCAL-${order._id}-${Date.now()}`;
        await Payment.create({
          orderId: order._id,
          provider: "PAYPAL_SANDBOX_LOCAL",
          providerOrderId: mockOrderId,
          amount: Number(amountValue),
          currency,
          status: "CREATED",
        });
        return res.status(201).json({
          paypalOrderId: mockOrderId,
          amount: amountValue,
          currency,
          simulated: true,
        });
      }

      const accessToken = await getPaypalAccessToken();
      const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
      const ppRes = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: order._id.toString(),
              amount: {
                currency_code: currency,
                value: amountValue,
              },
            },
          ],
        }),
      });

      const ppData = await ppRes.json();
      if (!ppRes.ok || !ppData.id) {
        return res.status(502).json({ error: "PayPal rechazó la creación de la orden" });
      }

      await Payment.create({
        orderId: order._id,
        provider: "PAYPAL",
        providerOrderId: ppData.id,
        amount: Number(amountValue),
        currency,
        status: "CREATED",
      });

      return res.status(201).json({
        paypalOrderId: ppData.id,
        amount: amountValue,
        currency,
        simulated: false,
      });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/paypal/capture",
  verifyToken(process.env.JWT_SECRET),
  requireRole("cliente"),
  async (req, res, next) => {
    try {
      const { orderId, paypalOrderId } = req.body || {};
      if (!orderId || !paypalOrderId) {
        return res.status(400).json({ error: "orderId y paypalOrderId son requeridos" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      if (order.userId.toString() !== req.user.sub) {
        return res.status(403).json({ error: "No eres propietario de este pedido" });
      }

      const existingPayment = await Payment.findOne({ providerOrderId: paypalOrderId });
      if (!existingPayment || existingPayment.orderId.toString() !== order._id.toString()) {
        return res.status(404).json({ error: "Orden de pago no válida para este pedido" });
      }

      if (existingPayment.status === "CAPTURED" || order.paymentStatus === "CAPTURED") {
        return res.status(200).json({ order, idempotent: true });
      }

      let captureId = `CAP-${Date.now()}`;

      if (!hasPaypalCredentials()) {
        if (Number(existingPayment.amount).toFixed(2) !== Number(order.total).toFixed(2)) {
          return res.status(400).json({ error: "Inconsistencia en el monto del pedido" });
        }
      } else {
        const accessToken = await getPaypalAccessToken();
        const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
        const capRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        const capData = await capRes.json();
        const captureUnit = capData?.purchase_units?.[0]?.payments?.captures?.[0];
        const capturedAmount = captureUnit?.amount?.value;
        const capturedCurrency = captureUnit?.amount?.currency_code;

        if (
          !capRes.ok ||
          capData?.status !== "COMPLETED" ||
          !captureUnit ||
          capturedCurrency !== "USD" ||
          Number(capturedAmount).toFixed(2) !== Number(order.total).toFixed(2)
        ) {
          existingPayment.status = "FAILED";
          await existingPayment.save();
          order.paymentStatus = "FAILED";
          await order.save();
          return res.status(400).json({ error: "El pago en PayPal no fue completado o no coincide" });
        }
        captureId = captureUnit.id;
      }

      existingPayment.status = "CAPTURED";
      existingPayment.captureId = captureId;
      await existingPayment.save();

      order.paymentStatus = "CAPTURED";
      order.status = "PENDIENTE";
      await order.save();

      const io = req.app.get("io");
      if (io) {
        const publicSummary = {
          _id: order._id,
          items: order.items,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt,
        };
        io.to("kitchen").emit("order:created", publicSummary);
        io.to(`user:${order.userId.toString()}`).emit("order:updated", order);
      }

      return res.status(200).json({ order, idempotent: false });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;