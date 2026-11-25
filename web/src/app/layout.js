import "./globals.css";

export const metadata = {
  title: "LibroYa | E-Commerce de Libros y Envíos en Tiempo Real",
  description: "Catálogo de libros, control de stock, pagos PayPal y seguimiento de envíos",
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