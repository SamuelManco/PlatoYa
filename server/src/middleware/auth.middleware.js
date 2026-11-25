import jwt from "jsonwebtoken";

function getJwtSecret(explicitSecret) {
  return explicitSecret || process.env.JWT_SECRET || "platoya-udea-2026-secreto-largo-y-seguro";
}

export function verifyToken(explicitSecret) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ error: "Token requerido" });
    }
    try {
      const secret = getJwtSecret(explicitSecret);
      const payload = jwt.verify(token, secret);
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }
  };
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acceso denegado para este rol" });
    }
    return next();
  };
}