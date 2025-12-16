import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ChecklistData {
  // Requisitos Tecnicos - Decreto 10.278/2020
  hasMinResolution?: boolean;
  hasCorrectFormat?: boolean;
  isFaithfulCopy?: boolean;
  isLegible?: boolean;

  // Requisitos de Seguranca
  hasIntegrityHash?: boolean;
  hasAccessControl?: boolean;
  hasBackup?: boolean;
  hasAuditLog?: boolean;

  // Metadados Obrigatorios - Anexo II
  hasResponsibleName?: boolean;
  hasDigitizationDate?: boolean;
  hasOriginalId?: boolean;
  hasFileHash?: boolean;

  // Requisitos Lei 13.787/2018
  hasRetentionPeriod?: boolean;
  hasHistoricalReview?: boolean;
  hasPatientAccessRight?: boolean;

  notes?: string;
}

export async function getChecklist(medicalRecordId: string) {
  return prisma.digitizationChecklist.findUnique({
    where: { medicalRecordId },
    include: {
      completedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
    },
  });
}

export async function createOrUpdateChecklist(
  medicalRecordId: string,
  userId: string,
  data: ChecklistData
) {
  // Verificar se todos os itens obrigatorios estao marcados
  const isComplete = checkAllRequirements(data);

  const checklistData = {
    ...data,
    completedById: userId,
    completedAt: isComplete ? new Date() : null,
  };

  return prisma.digitizationChecklist.upsert({
    where: { medicalRecordId },
    create: {
      medicalRecordId,
      ...checklistData,
    },
    update: checklistData,
    include: {
      completedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function checkAllRequirements(data: ChecklistData): boolean {
  const requiredFields = [
    'hasMinResolution',
    'hasCorrectFormat',
    'isFaithfulCopy',
    'isLegible',
    'hasIntegrityHash',
    'hasResponsibleName',
    'hasDigitizationDate',
    'hasOriginalId',
    'hasFileHash',
    'hasRetentionPeriod',
  ];

  return requiredFields.every(
    (field) => data[field as keyof ChecklistData] === true
  );
}

export async function getChecklistStatus(medicalRecordId: string) {
  const checklist = await prisma.digitizationChecklist.findUnique({
    where: { medicalRecordId },
  });

  if (!checklist) {
    return {
      exists: false,
      completed: false,
      progress: 0,
    };
  }

  const fields = [
    checklist.hasMinResolution,
    checklist.hasCorrectFormat,
    checklist.isFaithfulCopy,
    checklist.isLegible,
    checklist.hasIntegrityHash,
    checklist.hasAccessControl,
    checklist.hasBackup,
    checklist.hasAuditLog,
    checklist.hasResponsibleName,
    checklist.hasDigitizationDate,
    checklist.hasOriginalId,
    checklist.hasFileHash,
    checklist.hasRetentionPeriod,
    checklist.hasHistoricalReview,
    checklist.hasPatientAccessRight,
  ];

  const completed = fields.filter(Boolean).length;
  const total = fields.length;

  return {
    exists: true,
    completed: checklist.completedAt !== null,
    progress: Math.round((completed / total) * 100),
    completedItems: completed,
    totalItems: total,
  };
}

export async function getChecklistRequirements() {
  return {
    tecnicos: {
      title: 'Requisitos Tecnicos - Decreto 10.278/2020',
      items: [
        {
          field: 'hasMinResolution',
          label: 'Resolucao minima 300 dpi',
          required: true,
        },
        {
          field: 'hasCorrectFormat',
          label: 'Formato PDF/A ou PNG',
          required: true,
        },
        {
          field: 'isFaithfulCopy',
          label: 'Reproducao fiel do documento original',
          required: true,
        },
        {
          field: 'isLegible',
          label: 'Documento legivel',
          required: true,
        },
      ],
    },
    seguranca: {
      title: 'Requisitos de Seguranca',
      items: [
        {
          field: 'hasIntegrityHash',
          label: 'Hash SHA-256 gerado para integridade',
          required: true,
        },
        {
          field: 'hasAccessControl',
          label: 'Controle de acesso configurado',
          required: false,
        },
        {
          field: 'hasBackup',
          label: 'Backup realizado',
          required: false,
        },
        {
          field: 'hasAuditLog',
          label: 'Log de auditoria registrado',
          required: false,
        },
      ],
    },
    metadados: {
      title: 'Metadados Obrigatorios - Anexo II Decreto',
      items: [
        {
          field: 'hasResponsibleName',
          label: 'Nome do responsavel pela digitalizacao',
          required: true,
        },
        {
          field: 'hasDigitizationDate',
          label: 'Data da digitalizacao',
          required: true,
        },
        {
          field: 'hasOriginalId',
          label: 'Identificacao do documento original',
          required: true,
        },
        {
          field: 'hasFileHash',
          label: 'Hash do arquivo digitalizado',
          required: true,
        },
      ],
    },
    lei13787: {
      title: 'Requisitos Lei 13.787/2018',
      items: [
        {
          field: 'hasRetentionPeriod',
          label: 'Prazo de guarda definido (20 anos)',
          required: true,
        },
        {
          field: 'hasHistoricalReview',
          label: 'Avaliacao de valor historico realizada',
          required: false,
        },
        {
          field: 'hasPatientAccessRight',
          label: 'Garantia de acesso ao paciente',
          required: false,
        },
      ],
    },
  };
}
