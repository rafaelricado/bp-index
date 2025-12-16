import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, User, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface Patient {
  id: string;
  legacyRecordNum: string;
  name: string;
  cpf: string | null;
  birthDate: string | null;
  phone: string | null;
  _count: {
    medicalRecords: number;
  };
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, [pagination.page]);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const response = await patientsApi.list({
        search: search || undefined,
        page: pagination.page,
        limit: 10,
      });
      setPatients(response.data.patients);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    loadPatients();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCpf = (cpf: string | null) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-gray-600 mt-1">Gerenciar cadastro de pacientes</p>
        </div>
        {hasRole('ADMIN', 'DIGITALIZADOR') && (
          <Link to="/patients/new" className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Novo Paciente</span>
          </Link>
        )}
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
              placeholder="Buscar por nome, CPF ou numero do prontuario..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">
            Buscar
          </button>
        </div>
      </form>

      {/* Lista */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhum paciente encontrado.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Prontuario
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Nome
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    CPF
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Data Nascimento
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                    Telefone
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                    Docs
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {patient.legacyRecordNum}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {patient.name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCpf(patient.cpf)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(patient.birthDate)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {patient.phone || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 text-sm text-gray-500">
                        <FileText size={14} />
                        <span>{patient._count.medicalRecords}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginacao */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Mostrando {patients.length} de {pagination.total} pacientes
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
          </>
        )}
      </div>
    </div>
  );
}
