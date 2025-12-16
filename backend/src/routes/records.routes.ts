import { Router, Response } from 'express';
import { z } from 'zod';
import * as recordService from '../services/record.service';
import * as checklistService from '../services/checklist.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

const createRecordSchema = z.object({
  patientId: z.string().uuid('ID do paciente invalido'),
  description: z.string().optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  lastActivityDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  hasHistoricalValue: z.boolean().optional(),
});

// GET /api/records
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, status, page, limit } = req.query;
    const result = await recordService.listRecords({
      patientId: patientId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/records/search
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Parametro de busca obrigatorio' });
      return;
    }
    const records = await recordService.searchRecords(q);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/records/patient/:patientId
router.get('/patient/:patientId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const records = await recordService.getRecordsByPatient(req.params.patientId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/records/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await recordService.getRecordById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Prontuario nao encontrado' });
      return;
    }

    await logAuditEvent(
      req.user!.userId,
      'READ',
      'MedicalRecord',
      req.params.id,
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/records
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = createRecordSchema.parse(req.body);
      const record = await recordService.createMedicalRecord(data);

      await logAuditEvent(
        req.user!.userId,
        'CREATE',
        'MedicalRecord',
        record.id,
        { patientId: data.patientId },
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// PUT /api/records/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = createRecordSchema.partial().parse(req.body);
      const record = await recordService.updateRecord(req.params.id, data);

      await logAuditEvent(
        req.user!.userId,
        'UPDATE',
        'MedicalRecord',
        req.params.id,
        { fields: Object.keys(req.body) },
        req.ip,
        req.headers['user-agent']
      );

      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// DELETE /api/records/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await recordService.deleteRecord(req.params.id);

      await logAuditEvent(
        req.user!.userId,
        'DELETE',
        'MedicalRecord',
        req.params.id,
        {},
        req.ip,
        req.headers['user-agent']
      );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// GET /api/records/:id/checklist
router.get('/:id/checklist', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const checklist = await checklistService.getChecklist(req.params.id);
    const requirements = await checklistService.getChecklistRequirements();

    res.json({
      checklist,
      requirements,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/records/:id/checklist
router.put(
  '/:id/checklist',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const checklist = await checklistService.createOrUpdateChecklist(
        req.params.id,
        req.user!.userId,
        req.body
      );

      await logAuditEvent(
        req.user!.userId,
        'UPDATE',
        'Checklist',
        req.params.id,
        { fields: Object.keys(req.body) },
        req.ip,
        req.headers['user-agent']
      );

      res.json(checklist);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// GET /api/records/:id/checklist/status
router.get('/:id/checklist/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = await checklistService.getChecklistStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
