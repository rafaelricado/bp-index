import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreatePatientInput {
  legacyRecordNum: string;
  name: string;
  cpf?: string;
  birthDate?: Date;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export async function createPatient(data: CreatePatientInput) {
  return prisma.patient.create({
    data,
    include: {
      medicalRecords: true,
    },
  });
}

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      medicalRecords: {
        include: {
          documents: {
            select: {
              id: true,
              fileName: true,
              documentType: true,
              documentDate: true,
              createdAt: true,
            },
          },
          checklist: true,
        },
      },
    },
  });
}

export async function getPatientByLegacyNum(legacyRecordNum: string) {
  return prisma.patient.findUnique({
    where: { legacyRecordNum },
    include: {
      medicalRecords: true,
    },
  });
}

export async function listPatients(options?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where = options?.search
    ? {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' as const } },
          { cpf: { contains: options.search } },
          { legacyRecordNum: { contains: options.search } },
        ],
      }
    : {};

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { medicalRecords: true },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return {
    patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updatePatient(id: string, data: Partial<CreatePatientInput>) {
  return prisma.patient.update({
    where: { id },
    data,
  });
}

export async function deletePatient(id: string) {
  // Verificar se tem prontuarios vinculados
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { _count: { select: { medicalRecords: true } } },
  });

  if (patient && patient._count.medicalRecords > 0) {
    throw new Error('Nao e possivel excluir paciente com prontuarios vinculados');
  }

  return prisma.patient.delete({
    where: { id },
  });
}

export async function searchPatients(query: string) {
  return prisma.patient.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { cpf: { contains: query } },
        { legacyRecordNum: { contains: query } },
      ],
    },
    take: 10,
    orderBy: { name: 'asc' },
  });
}
