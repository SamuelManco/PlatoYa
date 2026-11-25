import "./globals.css";

export const metadata = {
  title: "PlatoYa | Pedidos y reservas en tiempo real",
  description: "Sistema de reserva y pedido de platos de restaurante",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">
        {children}
      </body>
    </html>
  );
}