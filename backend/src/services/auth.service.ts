import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken, JwtPayload } from '../middleware/auth';

const prisma = new PrismaClient();

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error('Credenciais invalidas');
  }

  if (!user.active) {
    throw new Error('Usuario inativo');
  }

  const passwordValid = await bcrypt.compare(input.password, user.password);

  if (!passwordValid) {
    throw new Error('Credenciais invalidas');
  }

  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'DIGITALIZADOR' | 'CONSULTA';
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: 'ADMIN' | 'DIGITALIZADOR' | 'CONSULTA';
    active?: boolean;
  }
) {
  const updateData: any = { ...data };

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
}
