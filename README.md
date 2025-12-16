# GED Prontuarios Medicos

Sistema de Gestao Eletronica de Documentos para digitalizacao de prontuarios medicos legados, em conformidade com o **Decreto 10.278/2020** e **Lei 13.787/2018**.

## Funcionalidades

- Cadastro de pacientes com numero de prontuario legado
- Upload de documentos digitalizados (PDF, PNG, JPG, TIFF)
- Geracao automatica de hash SHA-256 para garantia de integridade
- OCR automatico para extracao de texto (Tesseract.js)
- Checklist de conformidade legal interativo
- Busca por nome, CPF ou numero do prontuario
- Controle de acesso por perfis (Admin, Digitalizador, Consulta)
- Log de auditoria completo
- Calculo automatico do prazo de guarda (20 anos)

## Requisitos Legais Atendidos

### Decreto 10.278/2020
- Resolucao minima 300 dpi
- Formato PDF/A ou PNG
- Hash SHA-256 para integridade
- Metadados obrigatorios (Anexo II)
- Rastreabilidade e auditoria

### Lei 13.787/2018
- Prazo de guarda de 20 anos apos ultimo registro
- Identificacao de documentos de valor historico
- Garantia de acesso ao paciente
- Comissao de revisao para eliminacao

## Stack Tecnologica

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TailwindCSS
- **Database**: PostgreSQL + Prisma ORM
- **OCR**: Tesseract.js
- **Autenticacao**: JWT

## Instalacao

### 1. Instalar PostgreSQL

```bash
# macOS com Homebrew
brew install postgresql@15
brew services start postgresql@15

# Criar banco de dados
createdb ged_prontuarios
```

### 2. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas configuracoes (DATABASE_URL, JWT_SECRET)

# Gerar cliente Prisma
npm run db:generate

# Executar migracoes
npm run db:migrate

# Popular banco com usuarios iniciais
npm run db:seed
```

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install
```

### 4. Executar

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: http://localhost:5173

## Usuarios de Teste

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@hospital.com | admin123 | Administrador |
| digitalizador@hospital.com | digit123 | Digitalizador |
| consulta@hospital.com | consulta123 | Consulta |

## Estrutura do Projeto

```
bp-index/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuracoes
│   │   ├── middleware/     # Auth, Audit
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Logica de negocio
│   │   ├── utils/          # Hash, OCR
│   │   └── app.ts          # Entry point
│   └── prisma/
│       └── schema.prisma   # Modelo de dados
├── frontend/
│   └── src/
│       ├── api/            # Cliente HTTP
│       ├── components/     # Componentes React
│       ├── context/        # Contextos (Auth)
│       └── pages/          # Paginas
└── uploads/                # Arquivos digitalizados
```

## API Endpoints

### Autenticacao
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario atual

### Pacientes
- `GET /api/patients` - Listar pacientes
- `GET /api/patients/:id` - Detalhe do paciente
- `POST /api/patients` - Criar paciente
- `PUT /api/patients/:id` - Atualizar paciente
- `DELETE /api/patients/:id` - Excluir paciente

### Prontuarios
- `GET /api/records` - Listar prontuarios
- `GET /api/records/:id` - Detalhe do prontuario
- `POST /api/records` - Criar prontuario
- `GET /api/records/:id/checklist` - Obter checklist
- `PUT /api/records/:id/checklist` - Atualizar checklist

### Documentos
- `POST /api/documents/upload` - Upload de documento
- `GET /api/documents/:id` - Detalhe do documento
- `GET /api/documents/:id/download` - Download
- `GET /api/documents/:id/verify` - Verificar integridade
- `DELETE /api/documents/:id` - Excluir documento

## Checklist de Conformidade

O sistema inclui um checklist interativo que verifica:

### Requisitos Tecnicos
- [ ] Resolucao minima 300 dpi
- [ ] Formato PDF/A ou PNG
- [ ] Reproducao fiel do documento original
- [ ] Legibilidade do documento

### Requisitos de Seguranca
- [ ] Hash SHA-256 para integridade
- [ ] Controle de acesso por perfil
- [ ] Backup dos documentos
- [ ] Log de auditoria completo

### Metadados Obrigatorios
- [ ] Nome do responsavel pela digitalizacao
- [ ] Data da digitalizacao
- [ ] Identificacao do documento original
- [ ] Hash do arquivo digitalizado

### Lei 13.787/2018
- [ ] Prazo de guarda de 20 anos
- [ ] Avaliacao de valor historico
- [ ] Garantia de acesso ao paciente

## Licenca

MIT
