import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

dotenv.config();

async function seedCook() {
  await connectDB(process.env.MONGODB_URI);
  const email = "cocinero@platoya.com";
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash("Cocina2026!", 10);
    await User.create({
      name: "Cocinero PlatoYa",
      email,
      passwordHash,
      role: "cocinero",
    });
    console.log("Usuario cocinero de prueba creado:", email);
  } else {
    console.log("Usuario cocinero ya existe:", email);
  }
  process.exit(0);
}

seedCook().catch((err) => {
  console.error("Error creando cocinero:", err.message);
  process.exit(1);
});