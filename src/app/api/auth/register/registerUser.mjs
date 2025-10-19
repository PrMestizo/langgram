export async function registerUser(payload, deps) {
  const { name, email, password } = payload ?? {};
  const { prisma, bcrypt } = deps ?? {};

  if (!email || !password) {
    return {
      status: 400,
      body: { error: "Email y contraseña son requeridos" },
    };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return {
      status: 400,
      body: { error: "El usuario ya existe" },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  return {
    status: 201,
    body: {
      message: "Usuario registrado correctamente",
      userId: user.id,
    },
  };
}
