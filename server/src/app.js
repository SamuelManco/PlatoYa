import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import dishesRoutes from "./routes/dishes.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";

export function createApp(clientOrigin) {
  const app = express();

  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "platoya-server" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/dishes", dishesRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/payments", paymentsRoutes);

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const message = status >= 500 ? "Error interno del servidor" : err.message;
    res.status(status).json({ error: message });
  });

  return app;
}