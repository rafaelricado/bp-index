import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recordsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface Record {
  id: string;
  description: string | null;
  status: string;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    legacyRecordNum: string;
    cpf: string | null;
  };
  _count: {
    documents: number;
  };
  checklist: {
    completedAt: string | null;
  } | null;
}

export default function Records() {
  const [records, setRecords] = useState<Record[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecords();
  }, [pagination.page]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const response = await recordsApi.list({
        page: pagination.page,
        limit: 10,
      });
      setRecords(response.data.records);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Erro ao carregar prontuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      loadRecords();
      return;
    }

    setIsLoading(true);
    try {
      const response = await recordsApi.search(search);
      setRecords(response.data);
      setPagination({ page: 1, totalPages: 1, total: response.data.length });
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Prontuarios</h1>
          <p className="text-gray-600 mt-1">Gerenciar prontuarios digitalizados</p>
        </div>
      </div>

      {/* Busca */}
      <form onSubmit={handleSearch} className="card">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do paciente, numero do prontuario ou CPF..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Buscar
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPagination({ ...pagination, page: 1 });
                loadRecords();
              }}
              className="btn-secondary"
            >
              Limpar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhum prontuario encontrado.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  onClick={() => navigate(`/records/${record.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <FileText size={24} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{record.patient.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                          {record.patient.legacyRecordNum}
                        </span>
                        {record.patient.cpf && (
                          <span>CPF: {record.patient.cpf}</span>
                        )}
                        <span>{record._count.documents} documentos</span>
                        <span>Criado em {formatDate(record.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {record.checklist?.completedAt ? (
                      <span className="flex items-center text-green-600 text-sm bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle size={16} className="mr-1" />
                        Checklist OK
                      </span>
                    ) : (
                      <span className="flex items-center text-yellow-600 text-sm bg-yellow-50 px-3 py-1 rounded-full">
                        <Clock size={16} className="mr-1" />
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginacao */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Mostrando {records.length} de {pagination.total} prontuarios
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-600">
                    Pagina {pagination.page} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
