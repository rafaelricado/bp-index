import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as documentService from '../services/document.service';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { env } from '../config/env';

const router = Router();

// Configuracao do Multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(env.UPLOAD_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (env.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de arquivo nao permitido: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

// POST /api/documents/upload
router.post(
  '/upload',
  authMiddleware,
  requireRole('ADMIN', 'DIGITALIZADOR'),
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Arquivo nao enviado' });
        return;
      }

      const { medicalRecordId, documentType, documentDate, description, digitizationResponsible, originalDocIdentifier, resolution } = req.body;

      if (!medicalRecordId) {
        // Remover arquivo temporario
        fs.unlinkSync(req.file.path);
        res.status(400).json({ error: 'ID do prontuario obrigatorio' });
        return;
      }

      const document = await documentService.uploadDocument({
        medicalRecordId,
        uploadedById: req.user!.userId,
        file: req.file,
        documentType,
        documentDate: documentDate ? new Date(documentDate) : undefined,
        description,
        digitizationResponsible,
        originalDocIdentifier,
        resolution: resolution ? parseInt(resolution) : undefined,
      });

      await logAuditEvent(
        req.user!.userId,
        'UPLOAD',
        'Document',
        document.id,
        {
          fileName: document.fileName,
          medicalRecordId,
          fileSize: document.fileSize,
        },
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json(document);
    } catch (error) {
      // Remover arquivo temporario em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Erro interno' });
    }
  }
);

// GET /api/documents
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { medicalRecordId, documentType, page, limit } = req.query;
    const result = await documentService.listDocuments({
      medicalRecordId: medicalRecordId as string,
      documentType: documentType as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/documents/search
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Parametro de busca obrigatorio' });
      return;
    }
    const documents = await documentService.searchDocumentsByOcr(q);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/documents/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Documento nao encontrado' });
      return;
    }

    await logAuditEvent(
      req.user!.userId,
      'READ',
      'Document',
      req.params.id,
      {},
      req.ip,
      req.headers['user-agent']
    );

    res.json(document);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const document = await documentService.getDocumentById(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Documento nao encontrado' });
      return;
    }

    if (!fs.existsSync(document.filePath)) {
      res.status(404).json({ error: 'Arquivo nao encontrado no servidor' });
      return;
    }

    await logAuditEvent(
      req.user!.userId,
      'DOWNLOAD',
      'Document',
      req.params.id,
      { fileName: document.fileName },
      req.ip,
      req.headers['user-agent']
    );

    res.download(document.filePath, document.originalName);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/documents/:id/verify
router.get('/:id/verify', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await documentService.verifyDocumentIntegrity(req.params.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/documents/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const document = await documentService.getDocumentById(req.params.id);

      await documentService.deleteDocument(req.params.id);

      await logAuditEvent(
        req.user!.userId,
        'DELETE',
        'Document',
        req.params.id,
        { fileName: document?.fileName },
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
