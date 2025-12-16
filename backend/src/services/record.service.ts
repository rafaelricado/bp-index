import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateRecordInput {
  patientId: string;
  description?: string;
  startDate?: Date;
  lastActivityDate?: Date;
  hasHistoricalValue?: boolean;
}

/**
 * Calcula a data de expiracao da guarda (20 anos apos ultima atividade)
 * Conforme Lei 13.787/2018
 */
function calculateRetentionExpiry(lastActivityDate: Date): Date {
  const expiry = new Date(lastActivityDate);
  expiry.setFullYear(expiry.getFullYear() + 20);
  return expiry;
}

export async function createMedicalRecord(data: CreateRecordInput) {
  const lastActivity = data.lastActivityDate || new Date();

  return prisma.medicalRecord.create({
    data: {
      ...data,
      lastActivityDate: lastActivity,
      retentionExpiryDate: calculateRetentionExpiry(lastActivity),
    },
    include: {
      patient: true,
      documents: true,
      checklist: true,
    },
  });
}

export async function getRecordById(id: string) {
  return prisma.medicalRecord.findUnique({
    where: { id },
    include: {
      patient: true,
      documents: {
        orderBy: { createdAt: 'desc' },
      },
      checklist: true,
    },
  });
}

export async function listRecords(options?: {
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (options?.patientId) where.patientId = options.patientId;
  if (options?.status) where.status = options.status;

  const [records, total] = await Promise.all([
    prisma.medicalRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            legacyRecordNum: true,
            cpf: true,
          },
        },
        _count: {
          select: { documents: true },
        },
        checklist: {
          select: { completedAt: true },
        },
      },
    }),
    prisma.medicalRecord.count({ where }),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateRecord(
  id: string,
  data: Partial<CreateRecordInput>
) {
  const updateData: any = { ...data };

  // Recalcular data de expiracao se lastActivityDate foi atualizado
  if (data.lastActivityDate) {
    updateData.retentionExpiryDate = calculateRetentionExpiry(
      data.lastActivityDate
    );
  }

  return prisma.medicalRecord.update({
    where: { id },
    data: updateData,
    include: {
      patient: true,
      documents: true,
    },
  });
}

export async function deleteRecord(id: string) {
  // Primeiro deletar documentos associados
  await prisma.document.deleteMany({
    where: { medicalRecordId: id },
  });

  // Deletar checklist associado
  await prisma.digitizationChecklist.deleteMany({
    where: { medicalRecordId: id },
  });

  return prisma.medicalRecord.delete({
    where: { id },
  });
}

export async function getRecordsByPatient(patientId: string) {
  return prisma.medicalRecord.findMany({
    where: { patientId },
    include: {
      documents: {
        select: {
          id: true,
          fileName: true,
          documentType: true,
          createdAt: true,
        },
      },
      checklist: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function searchRecords(query: string) {
  return prisma.medicalRecord.findMany({
    where: {
      OR: [
        { description: { contains: query, mode: 'insensitive' } },
        { patient: { name: { contains: query, mode: 'insensitive' } } },
        { patient: { legacyRecordNum: { contains: query } } },
        { patient: { cpf: { contains: query } } },
      ],
    },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          legacyRecordNum: true,
        },
      },
      _count: {
        select: { documents: true },
      },
    },
    take: 20,
  });
}
