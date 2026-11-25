import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI no está definida en el entorno");
  }
  await mongoose.connect(uri);
  console.log("Conectado a MongoDB Atlas");
}
