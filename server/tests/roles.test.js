import assert from "node:assert/strict";
import test from "node:test";
import { requireRole, verifyToken } from "../src/middleware/auth.middleware.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("verifyToken responde 401 sin token", () => {
  const req = { headers: {} };
  const res = mockRes();
  let nextCalled = false;

  verifyToken("test-secret")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Token requerido");
  assert.equal(nextCalled, false);
});

test("verifyToken responde 401 con token inválido", () => {
  const req = { headers: { authorization: "Bearer no-es-un-jwt" } };
  const res = mockRes();
  let nextCalled = false;

  verifyToken("test-secret")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Token inválido o expirado");
  assert.equal(nextCalled, false);
});

test("requireRole responde 403 si el rol no está permitido", () => {
  const req = { user: { role: "cliente" } };
  const res = mockRes();
  let nextCalled = false;

  requireRole("cocinero")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, "Acceso denegado para este rol");
  assert.equal(nextCalled, false);
});

test("requireRole llama a next cuando el rol está permitido", () => {
  const req = { user: { role: "cocinero" } };
  const res = mockRes();
  let nextCalled = false;

  requireRole("cocinero")(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});
