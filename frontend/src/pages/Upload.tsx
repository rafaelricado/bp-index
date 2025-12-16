import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { documentsApi, patientsApi, recordsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Upload as UploadIcon,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  legacyRecordNum: string;
}

interface MedicalRecord {
  id: string;
  description: string | null;
  patient: Patient;
}

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRecordId = searchParams.get('recordId');
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MedicalRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
  const [uploadErrors, setUploadErrors] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({
    documentType: 'OUTROS',
    documentDate: '',
    description: '',
    digitizationResponsible: user?.name || '',
    originalDocIdentifier: '',
  });

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (preselectedRecordId) {
      loadRecord(preselectedRecordId);
    }
  }, [preselectedRecordId]);

  const loadRecord = async (recordId: string) => {
    try {
      const response = await recordsApi.get(recordId);
      setSelectedRecord(response.data);
    } catch (err) {
      console.error('Erro ao carregar prontuario:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await recordsApi.search(searchQuery);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);

    // Inicializar status
    newFiles.forEach((file) => {
      setUploadStatus((prev) => ({ ...prev, [file.name]: 'pending' }));
    });
  };

  const handleRemoveFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[fileName];
      return newStatus;
    });
    setUploadErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fileName];
      return newErrors;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);

    droppedFiles.forEach((file) => {
      setUploadStatus((prev) => ({ ...prev, [file.name]: 'pending' }));
    });
  };

  const handleUpload = async () => {
    if (!selectedRecord || files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      if (uploadStatus[file.name] === 'success') continue;

      setUploadStatus((prev) => ({ ...prev, [file.name]: 'uploading' }));

      try {
        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        formDataToSend.append('medicalRecordId', selectedRecord.id);
        formDataToSend.append('documentType', formData.documentType);
        if (formData.documentDate) {
          formDataToSend.append('documentDate', formData.documentDate);
        }
        if (formData.description) {
          formDataToSend.append('description', formData.description);
        }
        formDataToSend.append('digitizationResponsible', formData.digitizationResponsible);
        if (formData.originalDocIdentifier) {
          formDataToSend.append('originalDocIdentifier', formData.originalDocIdentifier);
        }

        await documentsApi.upload(formDataToSend);
        setUploadStatus((prev) => ({ ...prev, [file.name]: 'success' }));
      } catch (err: any) {
        setUploadStatus((prev) => ({ ...prev, [file.name]: 'error' }));
        setUploadErrors((prev) => ({
          ...prev,
          [file.name]: err.response?.data?.error || 'Erro no upload',
        }));
      }
    }

    setIsUploading(false);

    // Verificar se todos foram enviados com sucesso
    const allSuccess = files.every((f) => uploadStatus[f.name] === 'success' || uploadStatus[f.name] === 'pending');
    if (allSuccess) {
      setTimeout(() => {
        navigate(`/records/${selectedRecord.id}`);
      }, 1500);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Upload de Documentos</h1>
        <p className="text-gray-600 mt-1">
          Digitalizar documentos para o prontuario
        </p>
      </div>

      {/* Selecao de Prontuario */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          1. Selecionar Prontuario
        </h2>

        {selectedRecord ? (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">{selectedRecord.patient.name}</p>
              <p className="text-sm text-gray-600">
                Prontuario: {selectedRecord.patient.legacyRecordNum}
              </p>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por nome do paciente ou numero do prontuario..."
                  className="input pl-10"
                />
              </div>
              <button onClick={handleSearch} disabled={isSearching} className="btn-primary">
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((record) => (
                  <button
                    key={record.id}
                    onClick={() => handleSelectRecord(record)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <p className="font-medium text-gray-800">{record.patient.name}</p>
                    <p className="text-sm text-gray-500">
                      Prontuario: {record.patient.legacyRecordNum}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadados */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          2. Informacoes do Documento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de Documento</label>
            <select
              value={formData.documentType}
              onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
              className="input"
            >
              <option value="PRONTUARIO">Prontuario</option>
              <option value="EXAME">Exame</option>
              <option value="RECEITA">Receita</option>
              <option value="LAUDO">Laudo</option>
              <option value="TERMO">Termo de Consentimento</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          <div>
            <label className="label">Data do Documento Original</label>
            <input
              type="date"
              value={formData.documentDate}
              onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Responsavel pela Digitalizacao *</label>
            <input
              type="text"
              value={formData.digitizationResponsible}
              onChange={(e) => setFormData({ ...formData, digitizationResponsible: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Identificacao do Documento Original</label>
            <input
              type="text"
              value={formData.originalDocIdentifier}
              onChange={(e) => setFormData({ ...formData, originalDocIdentifier: e.target.value })}
              className="input"
              placeholder="Ex: Pagina 1-5, Pasta A"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Descricao</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Upload de Arquivos */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          3. Selecionar Arquivos
        </h2>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
        >
          <UploadIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-sm text-gray-400">
            Formatos aceitos: PDF, PNG, JPG, TIFF (max 50MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText size={20} className="text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {uploadStatus[file.name] === 'success' && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                  {uploadStatus[file.name] === 'error' && (
                    <div className="flex items-center text-red-500">
                      <AlertCircle size={20} className="mr-1" />
                      <span className="text-sm">{uploadErrors[file.name]}</span>
                    </div>
                  )}
                  {uploadStatus[file.name] === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  )}
                  {uploadStatus[file.name] === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.name);
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={20} />
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
        <p className="text-sm text-blue-700">
          <strong>Decreto 10.278/2020:</strong> Os documentos devem ter resolucao minima de
          300 dpi. O sistema gerara automaticamente o hash SHA-256 para garantia de
          integridade e processara OCR para indexacao do conteudo.
        </p>
      </div>

      {/* Botao de Upload */}
      <div className="flex justify-end space-x-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleUpload}
          disabled={!selectedRecord || files.length === 0 || isUploading}
          className="btn-primary"
        >
          {isUploading ? 'Enviando...' : `Enviar ${files.length} arquivo(s)`}
        </button>
      </div>
    </div>
  );
}
