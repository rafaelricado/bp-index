import { Router, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
});

const createUserSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  role: z.enum(['ADMIN', 'DIGITALIZADOR', 'CONSULTA']),
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    await logAuditEvent(
      result.user.id,
      'LOGIN',
      'User',
      result.user.id,
      { email: data.email },
      req.ip,
      req.headers['user-agent']
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    if (error instanceof Error) {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  await logAuditEvent(
    req.user!.userId,
    'LOGOUT',
    'User',
    req.user!.userId,
    {},
    req.ip,
    req.headers['user-agent']
  );

  res.json({ message: 'Logout realizado com sucesso' });
});

// GET /api/auth/users (apenas admin)
router.get(
  '/users',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const users = await authService.listUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// POST /api/auth/users (apenas admin)
router.post(
  '/users',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await authService.createUser(data);

      await logAuditEvent(
        req.user!.userId,
        'CREATE',
        'User',
        user.id,
        { email: data.email, role: data.role },
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// PUT /api/auth/users/:id (apenas admin)
router.put(
  '/users/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await authService.updateUser(req.params.id, req.body);

      await logAuditEvent(
        req.user!.userId,
        'UPDATE',
        'User',
        req.params.id,
        { fields: Object.keys(req.body) },
        req.ip,
        req.headers['user-agent']
      );

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

export default router;
