import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recordsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Save,
  AlertTriangle,
  Shield,
  FileText,
  Clock,
} from 'lucide-react';

interface ChecklistItem {
  field: string;
  label: string;
  required: boolean;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface Requirements {
  tecnicos: ChecklistSection;
  seguranca: ChecklistSection;
  metadados: ChecklistSection;
  lei13787: ChecklistSection;
}

export default function Checklist() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [checklist, setChecklist] = useState<any>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [formData, setFormData] = useState<{ [key: string]: boolean }>({});
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadChecklist();
  }, [id]);

  const loadChecklist = async () => {
    setIsLoading(true);
    try {
      const response = await recordsApi.getChecklist(id!);
      setChecklist(response.data.checklist);
      setRequirements(response.data.requirements);

      // Inicializar formData com valores existentes ou false
      const initialData: { [key: string]: boolean } = {};
      if (response.data.checklist) {
        Object.keys(response.data.checklist).forEach((key) => {
          if (typeof response.data.checklist[key] === 'boolean') {
            initialData[key] = response.data.checklist[key];
          }
        });
        setNotes(response.data.checklist.notes || '');
      }
      setFormData(initialData);
    } catch (err) {
      setError('Erro ao carregar checklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (field: string) => {
    if (!hasRole('ADMIN', 'DIGITALIZADOR')) return;
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await recordsApi.updateChecklist(id!, { ...formData, notes });
      alert('Checklist salvo com sucesso!');
      loadChecklist();
    } catch (err) {
      alert('Erro ao salvar checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    if (!requirements) return { completed: 0, total: 0, percentage: 0 };

    let total = 0;
    let completed = 0;

    Object.values(requirements).forEach((section) => {
      section.items.forEach((item) => {
        total++;
        if (formData[item.field]) completed++;
      });
    });

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const progress = calculateProgress();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
              Checklist de Conformidade
            </h1>
            <p className="text-gray-600 mt-1">
              Decreto 10.278/2020 | Lei 13.787/2018
            </p>
          </div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Progresso</h2>
          <span className="text-2xl font-bold text-primary-600">
            {progress.percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              progress.percentage === 100 ? 'bg-green-500' : 'bg-primary-600'
            }`}
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {progress.completed} de {progress.total} itens verificados
        </p>

        {checklist?.completedAt && (
          <div className="mt-4 flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle size={20} className="mr-2" />
            <span>
              Checklist concluido em{' '}
              {new Date(checklist.completedAt).toLocaleDateString('pt-BR')} por{' '}
              {checklist.completedBy?.name}
            </span>
          </div>
        )}
      </div>

      {/* Checklist Sections */}
      {requirements && (
        <>
          {Object.entries(requirements).map(([key, section]) => (
            <div key={key} className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                {key === 'tecnicos' && <FileText size={20} className="mr-2 text-blue-600" />}
                {key === 'seguranca' && <Shield size={20} className="mr-2 text-green-600" />}
                {key === 'metadados' && <FileText size={20} className="mr-2 text-purple-600" />}
                {key === 'lei13787' && <Clock size={20} className="mr-2 text-orange-600" />}
                {section.title}
              </h2>

              <div className="space-y-3">
                {section.items.map((item) => (
                  <div
                    key={item.field}
                    onClick={() => handleToggle(item.field)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      formData[item.field]
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    } ${hasRole('ADMIN', 'DIGITALIZADOR') ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      {formData[item.field] ? (
                        <CheckCircle size={24} className="text-green-600" />
                      ) : (
                        <Circle size={24} className="text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{item.label}</p>
                        {item.required && (
                          <span className="text-xs text-red-500">* Obrigatorio</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Observacoes */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Observacoes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          rows={4}
          placeholder="Adicione observacoes sobre o processo de digitalizacao..."
          disabled={!hasRole('ADMIN', 'DIGITALIZADOR')}
        />
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
        <AlertTriangle size={24} className="text-amber-600 flex-shrink-0 mt-1" />
        <div>
          <p className="font-semibold text-amber-800">Importante</p>
          <p className="text-sm text-amber-700 mt-1">
            Este checklist deve ser preenchido para cada prontuario digitalizado,
            garantindo a conformidade com a legislacao vigente. Os itens marcados
            como obrigatorios devem ser verificados antes da eliminacao dos
            documentos fisicos originais.
          </p>
        </div>
      </div>

      {/* Botoes */}
      {hasRole('ADMIN', 'DIGITALIZADOR') && (
        <div className="flex justify-end space-x-4">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            <span>{isSaving ? 'Salvando...' : 'Salvar Checklist'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
