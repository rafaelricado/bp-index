import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'DOWNLOAD'
  | 'UPLOAD';

export type EntityType =
  | 'User'
  | 'Patient'
  | 'MedicalRecord'
  | 'Document'
  | 'Checklist';

/**
 * Registra evento no log de auditoria
 * Requisito do Decreto 10.278/2020 para rastreabilidade
 */
export async function logAuditEvent(
  userId: string | null,
  action: AuditAction,
  entityType: EntityType,
  entityId: string | null,
  details?: object,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

/**
 * Middleware para log automatico de requisicoes
 */
export function auditMiddleware(
  action: AuditAction,
  entityType: EntityType,
  getEntityId?: (req: AuthRequest) => string | null
) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const originalSend = res.send;

    res.send = function (body) {
      // Registra apenas se a requisicao foi bem sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = getEntityId ? getEntityId(req) : req.params.id || null;

        logAuditEvent(
          req.user?.userId || null,
          action,
          entityType,
          entityId,
          { method: req.method, path: req.path },
          req.ip,
          req.headers['user-agent']
        );
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
