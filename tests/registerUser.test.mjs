import test from "node:test";
import assert from "node:assert/strict";
import { registerUser } from "../src/app/api/auth/register/registerUser.mjs";

const createDeps = () => {
  const findUnique = test.mock.fn();
  const create = test.mock.fn();
  const hash = test.mock.fn();

  const prisma = {
    user: {
      findUnique,
      create,
    },
  };

  const bcrypt = { hash };

  return { prisma, bcrypt, findUnique, create, hash };
};

test("returns 400 when email or password are missing", async () => {
  const { prisma, bcrypt } = createDeps();
  const result = await registerUser({ name: "Test" }, { prisma, bcrypt });

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    error: "Email y contraseña son requeridos",
  });
  assert.equal(prisma.user.findUnique.mock.callCount(), 0);
  assert.equal(bcrypt.hash.mock.callCount(), 0);
});

test("returns 400 when user already exists", async () => {
  const { prisma, bcrypt, findUnique } = createDeps();
  findUnique.mock.mockImplementation(async () => ({ id: "user-1" }));

  const result = await registerUser(
    { name: "Test", email: "test@example.com", password: "secret" },
    { prisma, bcrypt },
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, { error: "El usuario ya existe" });
  assert.equal(bcrypt.hash.mock.callCount(), 0);
});

test("creates a new user and returns success", async () => {
  const { prisma, bcrypt, findUnique, create, hash } = createDeps();
  findUnique.mock.mockImplementation(async () => null);
  hash.mock.mockImplementation(async (password) => `hashed-${password}`);
  create.mock.mockImplementation(async ({ data }) => ({
    id: "user-123",
    ...data,
  }));

  const payload = {
    name: "New User",
    email: "new@example.com",
    password: "secret123",
  };

  const result = await registerUser(payload, { prisma, bcrypt });

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, {
    message: "Usuario registrado correctamente",
    userId: "user-123",
  });

  assert.deepEqual(findUnique.mock.calls[0].arguments[0], {
    where: { email: "new@example.com" },
  });

  assert.deepEqual(hash.mock.calls[0].arguments, ["secret123", 10]);

  assert.deepEqual(create.mock.calls[0].arguments[0], {
    data: {
      name: "New User",
      email: "new@example.com",
      password: "hashed-secret123",
    },
  });
});
