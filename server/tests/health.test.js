import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

test("GET /health responde 200 sin base de datos", async () => {
  const app = createApp("http://localhost:3000");
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "platoya-server");
});
