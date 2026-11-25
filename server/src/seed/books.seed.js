import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { Book } from "../models/Book.js";
import { User } from "../models/User.js";

dotenv.config();

const SAMPLE_BOOKS = [
  {
    title: "Arquitectura Limpia",
    author: "Robert C. Martin",
    category: "Ingeniería",
    description: "Guía práctica para diseñar sistemas de software mantenibles y desacoplados.",
    price: 24.5,
    stock: 15,
    available: true,
  },
  {
    title: "Sistemas Distribuidos Modernos",
    author: "Martin Kleppmann",
    category: "Ingeniería",
    description: "Fundamentos de replicación, particionamiento, consistencia y flujo de datos.",
    price: 32.0,
    stock: 8,
    available: true,
  },
  {
    title: "El Problema de los Tres Cuerpos",
    author: "Cixin Liu",
    category: "Ficción",
    description: "Novela de ciencia ficción sobre el primer contacto y la física orbital.",
    price: 18.0,
    stock: 12,
    available: true,
  },
  {
    title: "Lean Startup",
    author: "Eric Ries",
    category: "Negocios",
    description: "Metodología de validación rápida de productos digitales y métricas accionables.",
    price: 19.9,
    stock: 10,
    available: true,
  },
  {
    title: "Breves Respuestas a las Grandes Preguntas",
    author: "Stephen Hawking",
    category: "Ciencia",
    description: "Reflexiones sobre cosmología, inteligencia artificial y el futuro humano.",
    price: 16.5,
    stock: 6,
    available: true,
  },
];

async function runSeed() {
  await connectDB(process.env.MONGODB_URI);

  await Book.deleteMany({});
  await Book.insertMany(SAMPLE_BOOKS);
  console.log("Catálogo de libros cargado:", SAMPLE_BOOKS.length);

  const logisticsEmail = "logistica@libroya.com";
  const existing = await User.findOne({ email: logisticsEmail });
  if (!existing) {
    const passwordHash = await bcrypt.hash("Envios2026!", 10);
    await User.create({
      name: "Coordinador Logística",
      email: logisticsEmail,
      passwordHash,
      role: "logistica",
    });
    console.log("Usuario logística creado:", logisticsEmail);
  }

  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Error ejecutando seed:", err.message);
  process.exit(1);
});