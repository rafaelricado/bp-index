import { Router, Response } from 'express';
import { z } from 'zod';
import * as patientService from '../services/patient.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

const createPatientSchema = z.object({
  legacyRecordNum: z.string().min(1, 'Numero do prontuario obrigatorio'),
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  cpf: z.string().optional(),
  birthDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/patients
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page, limit } = req.query;
    const result = await patientService.listPatients({
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/patients/search
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Parametro de busca obrigatorio' });
      return;
    }
    const patients = await patientService.searchPatients(q);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/patients/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    if (!patient) {
      res.status(404).json({ error: 'Paciente nao encontrado' });
      return;
    }

    await logAuditEvent(
      req.user!.userId,
      'READ',
      'Patient',
      req.params.id,
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/patients
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = createPatientSchema.parse(req.body);
      const patient = await patientService.createPatient(data);

      await logAuditEvent(
        req.user!.userId,
        'CREATE',
        'Patient',
        patient.id,
        { name: data.name, legacyRecordNum: data.legacyRecordNum },
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        res.status(409).json({ error: 'Paciente com este numero de prontuario ou CPF ja existe' });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// PUT /api/patients/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = createPatientSchema.partial().parse(req.body);
      const patient = await patientService.updatePatient(req.params.id, data);

      await logAuditEvent(
        req.user!.userId,
        'UPDATE',
        'Patient',
        req.params.id,
        { fields: Object.keys(req.body) },
        req.ip,
        req.headers['user-agent']
      );

      res.json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// DELETE /api/patients/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await patientService.deletePatient(req.params.id);

      await logAuditEvent(
        req.user!.userId,
        'DELETE',
        'Patient',
        req.params.id,
        {},
        req.ip,
        req.headers['user-agent']
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

export default router;
