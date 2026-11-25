import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";

process.env.JWT_SECRET = "test-secret-platoya";

const app = createApp("http://localhost:3000");
let mongo;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

describe("auth", { concurrency: 1 }, () => {
  test("POST /api/auth/register asigna rol cliente aunque el body pida otro", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Ana Demo",
      email: "ana@example.com",
      password: "secreto1",
      role: "cocinero",
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.role, "cliente");
    assert.equal(response.body.user.email, "ana@example.com");
    assert.equal(response.body.passwordHash, undefined);
    assert.equal(response.body.user.passwordHash, undefined);
    assert.equal(typeof response.body.token, "string");

    const stored = await User.findOne({ email: "ana@example.com" });
    assert.equal(stored.role, "cliente");
    assert.notEqual(stored.passwordHash, "secreto1");
    assert.equal(await bcrypt.compare("secreto1", stored.passwordHash), true);
  });

  test("POST /api/auth/register rechaza payload inválido y correo duplicado", async () => {
    const invalid = await request(app).post("/api/auth/register").send({
      name: "Sin clave",
      email: "sin-clave@example.com",
    });
    assert.equal(invalid.status, 400);

    const duplicate = await request(app).post("/api/auth/register").send({
      name: "Ana Otra",
      email: "ana@example.com",
      password: "secreto1",
    });
    assert.equal(duplicate.status, 409);
  });

  test("POST /api/auth/login acepta la contraseña correcta y rechaza la incorrecta", async () => {
    const wrong = await request(app).post("/api/auth/login").send({
      email: "ana@example.com",
      password: "incorrecta",
    });
    assert.equal(wrong.status, 401);

    const ok = await request(app).post("/api/auth/login").send({
      email: "ana@example.com",
      password: "secreto1",
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.role, "cliente");
    assert.equal(ok.body.passwordHash, undefined);
    assert.equal(typeof ok.body.token, "string");
  });
});
