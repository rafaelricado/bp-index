import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';

// Rotas
import authRoutes from './routes/auth.routes';
import patientsRoutes from './routes/patients.routes';
import recordsRoutes from './routes/records.routes';
import documentsRoutes from './routes/documents.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estaticos (uploads)
app.use('/uploads', express.static(env.UPLOAD_DIR));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/documents', documentsRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Rota para informacoes de conformidade
app.get('/api/compliance', (req, res) => {
  res.json({
    decreto: {
      numero: '10.278/2020',
      descricao: 'Regulamenta a digitalizacao de documentos publicos e privados',
      requisitos: [
        'Resolucao minima 300 dpi',
        'Formato PDF/A ou PNG',
        'Hash SHA-256 para integridade',
        'Metadados obrigatorios conforme Anexo II',
      ],
    },
    lei: {
      numero: '13.787/2018',
      descricao: 'Digitalizacao de prontuarios medicos',
      requisitos: [
        'Certificado digital ICP-Brasil',
        'Prazo de guarda: 20 anos apos ultimo registro',
        'Comissao de revisao para eliminacao',
        'Garantia de acesso ao paciente',
      ],
    },
  });
});

// Handler de erro global
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro:', err);

  if (err.name === 'MulterError') {
    if (err.message === 'File too large') {
      res.status(413).json({ error: 'Arquivo muito grande. Tamanho maximo: 50MB' });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Erro interno do servidor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

// Iniciar servidor
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   GED Prontuarios Medicos - API                               ║
║   Decreto 10.278/2020 | Lei 13.787/2018                       ║
║                                                               ║
║   Servidor rodando em: http://localhost:${PORT}                 ║
║   Ambiente: ${env.NODE_ENV.padEnd(45)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
