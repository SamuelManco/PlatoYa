# PlatoYa

Sistema web full-stack para reserva y pedido de platos en tiempo real, con autenticación basada en roles (`cliente` y `cocinero`), pagos validados en servidor (PayPal Sandbox) y tablero Kanban sincronizado mediante WebSockets (`Socket.IO`).

## Estructura del monorepo
- `web/`: Frontend en Next.js (App Router) + Tailwind CSS + Socket.IO Client.
- `server/`: Backend en Node.js + Express + Mongoose + Socket.IO + JWT.
- `PRD.md`: Documento de requerimientos del producto para pruebas funcionales.

## Ejecución local
1. Configurar `server/.env` a partir de `server/.env.example` y `web/.env.local` a partir de `web/.env.example`.
2. Instalar dependencias en `server/` y `web/` con `npm install`.
3. Poblar datos iniciales en `server/`: `npm run seed` y `node src/seed/cook.seed.js`.
4. Iniciar backend (`npm run dev` en `server/`) y frontend (`npm run dev` en `web/`).