import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { recordsApi, documentsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  Upload,
  Shield,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  documentType: string;
  fileSize: number;
  hashSha256: string;
  createdAt: string;
  uploadedBy: { name: string };
}

interface Record {
  id: string;
  description: string;
  startDate: string | null;
  lastActivityDate: string | null;
  retentionExpiryDate: string | null;
  hasHistoricalValue: boolean;
  status: string;
  patient: {
    id: string;
    name: string;
    legacyRecordNum: string;
    cpf: string | null;
  };
  documents: Document[];
  checklist: any;
}

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [record, setRecord] = useState<Record | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecord();
  }, [id]);

  const loadRecord = async () => {
    setIsLoading(true);
    try {
      const response = await recordsApi.get(id!);
      setRecord(response.data);
    } catch (err) {
      setError('Erro ao carregar prontuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const response = await documentsApi.download(docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao baixar documento');
    }
  };

  const handleVerifyIntegrity = async (docId: string) => {
    try {
      const response = await documentsApi.verify(docId);
      if (response.data.valid) {
        alert('Integridade verificada! O documento nao foi alterado.');
      } else {
        alert('ATENCAO: O documento pode ter sido alterado! Hash nao confere.');
      }
    } catch (err) {
      alert('Erro ao verificar integridade');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      await documentsApi.delete(docId);
      loadRecord();
    } catch (err) {
      alert('Erro ao excluir documento');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PRONTUARIO: 'Prontuario',
      EXAME: 'Exame',
      RECEITA: 'Receita',
      LAUDO: 'Laudo',
      TERMO: 'Termo',
      OUTROS: 'Outros',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Prontuario nao encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Prontuario {record.patient.legacyRecordNum}
            </h1>
            <p className="text-gray-600 mt-1">{record.patient.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {hasRole('ADMIN', 'DIGITALIZADOR') && (
            <Link
              to={`/upload?recordId=${record.id}`}
              className="btn-primary flex items-center space-x-2"
            >
              <Upload size={20} />
              <span>Adicionar Documento</span>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Status do Checklist</h3>
          {record.checklist?.completedAt ? (
            <div className="flex items-center text-green-600">
              <CheckCircle size={24} className="mr-2" />
              <span className="font-semibold">Completo</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <Clock size={24} className="mr-2" />
              <span className="font-semibold">Pendente</span>
            </div>
          )}
          <Link
            to={`/records/${record.id}/checklist`}
            className="text-primary-600 text-sm mt-2 inline-block hover:underline"
          >
            Ver checklist completo
          </Link>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Prazo de Guarda</h3>
          <p className="text-lg font-semibold text-gray-800">
            {formatDate(record.retentionExpiryDate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Lei 13.787/2018 - 20 anos apos ultimo registro
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Documentos</h3>
          <p className="text-lg font-semibold text-gray-800">
            {record.documents.length} arquivos
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Ultima atividade: {formatDate(record.lastActivityDate)}
          </p>
        </div>
      </div>

      {/* Valor Historico */}
      {record.hasHistoricalValue && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertTriangle size={24} className="text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Documento de Valor Historico</p>
            <p className="text-sm text-amber-700">
              Este prontuario foi marcado como tendo valor historico e deve ser preservado.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Documentos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Documentos Digitalizados</h2>

        {record.documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhum documento digitalizado ainda.</p>
            {hasRole('ADMIN', 'DIGITALIZADOR') && (
              <Link
                to={`/upload?recordId=${record.id}`}
                className="btn-primary inline-flex items-center space-x-2 mt-4"
              >
                <Upload size={20} />
                <span>Fazer Upload</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {record.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <FileText size={24} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{doc.originalName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span>{getDocumentTypeLabel(doc.documentType)}</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                      <span>por {doc.uploadedBy.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      SHA-256: {doc.hashSha256.substring(0, 16)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleVerifyIntegrity(doc.id)}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Verificar integridade"
                  >
                    <Shield size={20} />
                  </button>
                  <button
                    onClick={() => handleDownload(doc.id, doc.originalName)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  {hasRole('ADMIN') && (
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Conformidade */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
          <Shield size={20} className="mr-2" />
          Conformidade Legal
        </h3>
        <p className="text-sm text-blue-700">
          Todos os documentos possuem hash SHA-256 para garantia de integridade conforme
          Decreto 10.278/2020. O prazo de guarda de 20 anos e calculado automaticamente
          conforme Lei 13.787/2018.
        </p>
      </div>
    </div>
  );
}
