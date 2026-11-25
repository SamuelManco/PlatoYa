# PRD - LibroYa

**Producto:** LibroYa
**Tipo:** Sistema web e-commerce de libros con control de catálogo/stock, pagos PayPal Sandbox y gestión de envíos en tiempo real

## 1. Problema y objetivo
Permitir que clientes exploren un catálogo de libros con disponibilidad en tiempo real, gestionen su carrito y dirección de envío, paguen mediante PayPal Sandbox validado en servidor (con descuento automático de stock) y sigan el estado de su envío en vivo, mientras el rol de logística gestiona el despacho en un tablero Kanban.

## 2. Roles y permisos
- **Visitante / Cliente:** consulta el catálogo público y el stock, se registra (rol `cliente` asignado por servidor) o inicia sesión, crea órdenes, inicia/captura pagos y consulta únicamente su propio historial y actualizaciones de envío.
- **Logística:** inicia sesión con rol `logistica` (`logistica@libroya.com`), visualiza órdenes pagadas en el tablero Kanban (`Por despachar`, `Empacando`, `En camino`, `Entregado`) y avanza estados siguiendo transiciones válidas.

## 3. Arquitectura y límites de confianza
- Frontend en Next.js (App Router) y backend separado en Node.js + Express + Socket.IO + Mongoose sobre MongoDB Atlas.
- El backend recalcula totales desde MongoDB, verifica stock suficiente antes y durante la captura del pago, valida propiedad de la orden y autentica conexiones WebSocket.
- Nunca se exponen secretos ni claves privadas en el frontend (`NEXT_PUBLIC_*`) ni en el repositorio.

## 4. Criterios de aceptación clave
- El catálogo público carga sin sesión, muestra stock disponible y permite filtrar por categoría.
- El total de la orden se calcula en el backend y no permite exceder el stock real del libro.
- Una orden solo pasa a estado pagado y descuenta stock tras verificarse la captura en el backend y sin duplicarse ante reintentos.
- Un `cliente` no puede acceder al tablero de logística ni consultar órdenes ajenas.
- Los cambios de estado de envío se reflejan en tiempo real para el cliente autorizado.