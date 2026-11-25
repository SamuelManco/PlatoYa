import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Dish } from "../models/Dish.js";

dotenv.config();

const sampleDishes = [
  {
    name: "Bowl vegetariano",
    description: "Quinoa, aguacate, garbanzos, vegetales asados y tahini.",
    category: "Principales",
    price: 11.5,
    imageUrl: "",
    available: true,
  },
  {
    name: "Hamburguesa PlatoYa",
    description: "Carne, queso cheddar, tocineta y salsa de la casa.",
    category: "Principales",
    price: 12.0,
    imageUrl: "",
    available: true,
  },
  {
    name: "Empanadas de carne",
    description: "Porción de empanadas crocantes con ají suave.",
    category: "Entradas",
    price: 8.0,
    imageUrl: "",
    available: true,
  },
  {
    name: "Lomo saltado",
    description: "Tiras salteadas con cebolla, tomate y papas fritas.",
    category: "Principales",
    price: 16.9,
    imageUrl: "",
    available: true,
  },
];

async function runSeed() {
  await connectDB(process.env.MONGODB_URI);
  for (const dish of sampleDishes) {
    await Dish.updateOne({ name: dish.name }, { $setOnInsert: dish }, { upsert: true });
  }
  console.log("Seed de platos completado");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Error ejecutando seed:", err.message);
  process.exit(1);
});
