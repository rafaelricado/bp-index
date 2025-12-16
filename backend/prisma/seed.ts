import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Criar usuario admin padrao
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hospital.com' },
    update: {},
    create: {
      email: 'admin@hospital.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Usuario admin criado:', admin.email);

  // Criar usuario digitalizador de exemplo
  const digitalizador = await prisma.user.upsert({
    where: { email: 'digitalizador@hospital.com' },
    update: {},
    create: {
      email: 'digitalizador@hospital.com',
      password: await bcrypt.hash('digit123', 10),
      name: 'Digitalizador',
      role: 'DIGITALIZADOR',
      active: true,
    },
  });

  console.log('Usuario digitalizador criado:', digitalizador.email);

  // Criar usuario consulta de exemplo
  const consulta = await prisma.user.upsert({
    where: { email: 'consulta@hospital.com' },
    update: {},
    create: {
      email: 'consulta@hospital.com',
      password: await bcrypt.hash('consulta123', 10),
      name: 'Usuario Consulta',
      role: 'CONSULTA',
      active: true,
    },
  });

  console.log('Usuario consulta criado:', consulta.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
