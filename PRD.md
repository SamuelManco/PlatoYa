# PRD - PlatoYa

**Producto:** PlatoYa
**Tipo:** Sistema web de reserva y pedido de platos de restaurante con seguimiento en tiempo real

## 1. Problema y objetivo
Permitir que clientes exploren un menú de restaurante, gestionen su carrito y dirección de entrega, paguen mediante PayPal Sandbox validado en servidor y sigan el estado de su pedido en tiempo real, mientras el rol de cocina gestiona el flujo de preparación en un tablero Kanban.

## 2. Roles y permisos
- **Visitante / Cliente:** consulta el menú público, se registra (rol `cliente` asignado por servidor) o inicia sesión, crea pedidos, inicia/captura pagos y consulta únicamente su propio historial y actualizaciones de estado.
- **Cocinero:** inicia sesión con rol `cocinero`, visualiza pedidos pagados en el tablero Kanban (`Pendiente`, `En preparación`, `Listo`, `Entregado`) y avanza estados siguiendo transiciones válidas.

## 3. Arquitectura y límites de confianza
- Frontend en Next.js (App Router) y backend separado en Node.js + Express + Socket.IO + Mongoose sobre MongoDB Atlas.
- El backend recalcula totales desde MongoDB, valida disponibilidad y propiedad del pedido, verifica órdenes/capturas de PayPal Sandbox y autentica conexiones WebSocket.
- Nunca se exponen secretos ni claves privadas en el frontend (`NEXT_PUBLIC_*`) ni en el repositorio.

## 4. Criterios de aceptación clave
- El menú público carga sin sesión y permite filtrar por categoría.
- El total del pedido se calcula en el backend y no depende de valores enviados por el navegador.
- Un pedido solo pasa a estado pagado tras verificarse la captura en el backend y sin duplicarse ante reintentos.
- Un `cliente` no puede acceder al tablero de cocina ni consultar pedidos ajenos.
- Los cambios de estado en cocina se reflejan en tiempo real para el cliente autorizado.