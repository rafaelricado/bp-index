import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientsApi, recordsApi } from '../api/client';
import { Users, FileText, Upload, Search, Clock, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    recentRecords: [] as any[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [patientsRes, recordsRes] = await Promise.all([
        patientsApi.list({ limit: 1 }),
        recordsApi.list({ limit: 5 }),
      ]);
      setStats({
        totalPatients: patientsRes.data.pagination.total,
        totalRecords: recordsRes.data.pagination.total,
        recentRecords: recordsRes.data.records,
      });
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await recordsApi.search(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Sistema de Gestao Eletronica de Documentos - Prontuarios Medicos
        </p>
      </div>

      {/* Cards de estatisticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Users size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total de Pacientes</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalPatients}</p>
          </div>
        </div>

        <div className="card flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <FileText size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Prontuarios Digitalizados</p>
            <p className="text-2xl font-bold text-gray-800">{stats.totalRecords}</p>
          </div>
        </div>

        <Link to="/upload" className="card flex items-center space-x-4 hover:shadow-lg transition-shadow">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Upload size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Acao Rapida</p>
            <p className="text-lg font-semibold text-gray-800">Novo Upload</p>
          </div>
        </Link>
      </div>

      {/* Busca */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Buscar Prontuario</h2>
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome do paciente, numero do prontuario ou CPF..."
              className="input pl-10"
            />
          </div>
          <button type="submit" disabled={isSearching} className="btn-primary">
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Resultados ({searchResults.length})</h3>
            <div className="space-y-2">
              {searchResults.map((record: any) => (
                <Link
                  key={record.id}
                  to={`/records/${record.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{record.patient.name}</p>
                      <p className="text-sm text-gray-500">
                        Prontuario: {record.patient.legacyRecordNum}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {record._count?.documents || 0} documentos
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prontuarios recentes */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Prontuarios Recentes</h2>
        {stats.recentRecords.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum prontuario cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {stats.recentRecords.map((record: any) => (
              <Link
                key={record.id}
                to={`/records/${record.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <FileText size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{record.patient.name}</p>
                    <p className="text-sm text-gray-500">
                      {record.patient.legacyRecordNum} - {record._count?.documents || 0} documentos
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {record.checklist?.completedAt ? (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle size={16} className="mr-1" />
                      Checklist completo
                    </span>
                  ) : (
                    <span className="flex items-center text-yellow-600 text-sm">
                      <Clock size={16} className="mr-1" />
                      Pendente
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Info sobre conformidade */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-2">Conformidade Legal</h3>
        <p className="text-blue-700 text-sm">
          Este sistema atende aos requisitos do <strong>Decreto 10.278/2020</strong> e da{' '}
          <strong>Lei 13.787/2018</strong> para digitalizacao de prontuarios medicos, garantindo:
        </p>
        <ul className="mt-2 text-sm text-blue-600 space-y-1">
          <li>- Integridade dos documentos (hash SHA-256)</li>
          <li>- Rastreabilidade e auditoria completa</li>
          <li>- Prazo de guarda de 20 anos</li>
          <li>- Checklist de conformidade</li>
        </ul>
      </div>
    </div>
  );
}
