import { PrismaClient, DocumentType } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/env';
import { generateFileHash } from '../utils/hash';
import { extractTextFromImage, isOcrSupported } from '../utils/ocr';

const prisma = new PrismaClient();

export interface UploadDocumentInput {
  medicalRecordId: string;
  uploadedById: string;
  file: {
    filename: string;
    originalname: string;
    mimetype: string;
    size: number;
    path: string;
  };
  documentType?: DocumentType;
  documentDate?: Date;
  description?: string;
  digitizationResponsible?: string;
  originalDocIdentifier?: string;
  resolution?: number;
}

export async function uploadDocument(input: UploadDocumentInput) {
  // Gerar hash SHA-256 do arquivo
  const hashSha256 = await generateFileHash(input.file.path);

  // Verificar se ja existe documento com mesmo hash (evitar duplicatas)
  const existingDoc = await prisma.document.findFirst({
    where: { hashSha256 },
  });

  if (existingDoc) {
    // Remover arquivo duplicado
    await fs.unlink(input.file.path);
    throw new Error('Documento ja existe no sistema (hash duplicado)');
  }

  // Organizar arquivo por prontuario
  const recordDir = path.join(env.UPLOAD_DIR, input.medicalRecordId);
  await fs.mkdir(recordDir, { recursive: true });

  const newPath = path.join(recordDir, input.file.filename);
  await fs.rename(input.file.path, newPath);

  // Criar documento no banco
  const document = await prisma.document.create({
    data: {
      medicalRecordId: input.medicalRecordId,
      uploadedById: input.uploadedById,
      fileName: input.file.filename,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      fileSize: input.file.size,
      filePath: newPath,
      hashSha256,
      documentType: input.documentType || 'OUTROS',
      documentDate: input.documentDate,
      description: input.description,
      digitizationResponsible: input.digitizationResponsible,
      originalDocIdentifier: input.originalDocIdentifier,
      resolution: input.resolution,
    },
  });

  // Processar OCR em background se for imagem
  if (isOcrSupported(input.file.mimetype)) {
    processOcr(document.id, newPath);
  }

  // Atualizar data de ultima atividade do prontuario
  await prisma.medicalRecord.update({
    where: { id: input.medicalRecordId },
    data: {
      lastActivityDate: new Date(),
    },
  });

  return document;
}

async function processOcr(documentId: string, filePath: string) {
  try {
    const text = await extractTextFromImage(filePath);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrText: text,
        ocrProcessed: true,
      },
    });
  } catch (error) {
    console.error(`Erro no OCR do documento ${documentId}:`, error);
  }
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      medicalRecord: {
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              legacyRecordNum: true,
            },
          },
        },
      },
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function listDocuments(options?: {
  medicalRecordId?: string;
  documentType?: DocumentType;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (options?.medicalRecordId) where.medicalRecordId = options.medicalRecordId;
  if (options?.documentType) where.documentType = options.documentType;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { name: true },
        },
      },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deleteDocument(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new Error('Documento nao encontrado');
  }

  // Remover arquivo fisico
  try {
    await fs.unlink(document.filePath);
  } catch (error) {
    console.error('Erro ao remover arquivo:', error);
  }

  return prisma.document.delete({
    where: { id },
  });
}

export async function searchDocumentsByOcr(query: string) {
  return prisma.document.findMany({
    where: {
      ocrText: {
        contains: query,
        mode: 'insensitive',
      },
    },
    include: {
      medicalRecord: {
        include: {
          patient: {
            select: {
              name: true,
              legacyRecordNum: true,
            },
          },
        },
      },
    },
    take: 20,
  });
}

export async function verifyDocumentIntegrity(id: string): Promise<{
  valid: boolean;
  currentHash?: string;
  storedHash?: string;
}> {
  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    throw new Error('Documento nao encontrado');
  }

  try {
    const currentHash = await generateFileHash(document.filePath);
    return {
      valid: currentHash === document.hashSha256,
      currentHash,
      storedHash: document.hashSha256,
    };
  } catch (error) {
    return {
      valid: false,
      storedHash: document.hashSha256,
    };
  }
}
