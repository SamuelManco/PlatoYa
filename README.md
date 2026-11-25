# LibroYa

Sistema web full-stack de comercio electrónico de libros con control de catálogo/stock, pagos validados en servidor (PayPal Sandbox) y seguimiento de envíos en tiempo real mediante WebSockets (`Socket.IO`).

## Estructura del monorepo
- `web/`: Frontend en Next.js (App Router) + Tailwind CSS + Socket.IO Client.
- `server/`: Backend en Node.js + Express + Mongoose + Socket.IO + JWT.
- `PRD.md`: Documento de requerimientos del producto para pruebas funcionales.

## Ejecución local
1. Configurar `server/.env` y `web/.env.local` a partir de sus respectivos `.env.example`.
2. Instalar dependencias en `server/` y `web/` con `npm install`.
3. Poblar catálogo de libros y usuario de logística en `server/`: `node src/seed/books.seed.js`.
4. Iniciar backend (`npm run dev` en `server/`) y frontend (`npm run dev` en `web/`).