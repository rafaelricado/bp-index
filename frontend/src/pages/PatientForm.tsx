import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { patientsApi } from '../api/client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface PatientFormData {
  legacyRecordNum: string;
  name: string;
  cpf: string;
  birthDate: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
}

const initialFormData: PatientFormData = {
  legacyRecordNum: '',
  name: '',
  cpf: '',
  birthDate: '',
  gender: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  notes: '',
};

export default function PatientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<PatientFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      loadPatient();
    }
  }, [id]);

  const loadPatient = async () => {
    setIsLoading(true);
    try {
      const response = await patientsApi.get(id!);
      const patient = response.data;
      setFormData({
        legacyRecordNum: patient.legacyRecordNum || '',
        name: patient.name || '',
        cpf: patient.cpf || '',
        birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
        gender: patient.gender || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        city: patient.city || '',
        state: patient.state || '',
        zipCode: patient.zipCode || '',
        notes: patient.notes || '',
      });
    } catch (error) {
      setError('Erro ao carregar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      if (isEditing) {
        await patientsApi.update(id!, formData);
      } else {
        await patientsApi.create(formData);
      }
      navigate('/patients');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar paciente');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditing ? 'Atualizar dados do paciente' : 'Cadastrar novo paciente no sistema'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Dados principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="legacyRecordNum" className="label">
              Numero do Prontuario (Legado) *
            </label>
            <input
              type="text"
              id="legacyRecordNum"
              name="legacyRecordNum"
              value={formData.legacyRecordNum}
              onChange={handleChange}
              className="input"
              required
              disabled={isEditing}
            />
          </div>

          <div>
            <label htmlFor="name" className="label">
              Nome Completo *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="cpf" className="label">
              CPF
            </label>
            <input
              type="text"
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              className="input"
              placeholder="000.000.000-00"
            />
          </div>

          <div>
            <label htmlFor="birthDate" className="label">
              Data de Nascimento
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="gender" className="label">
              Genero
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="input"
            >
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="label">
              Telefone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
            />
          </div>
        </div>

        {/* Endereco */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Endereco</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="address" className="label">
                Logradouro
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="city" className="label">
                Cidade
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="state" className="label">
                Estado
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input"
                maxLength={2}
              />
            </div>

            <div>
              <label htmlFor="zipCode" className="label">
                CEP
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                className="input"
                placeholder="00000-000"
              />
            </div>
          </div>
        </div>

        {/* Observacoes */}
        <div className="border-t border-gray-200 pt-6">
          <label htmlFor="notes" className="label">
            Observacoes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="input min-h-[100px]"
            rows={4}
          />
        </div>

        {/* Botoes */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2"
          >
            {isSaving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
