'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  DemandaStatus,
  DemandaPrioridade,
  STATUS_OPTIONS,
  PRIORIDADE_OPTIONS,
  DEFAULT_TIPOS_DEMANDAS,
  TipoDemanda,
} from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export default function NovaDemandaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTipo = searchParams.get('tipo');

  const [loading, setLoading] = useState(false);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<
    Pick<TipoDemanda, 'slug' | 'nome' | 'colunas'>[]
  >(DEFAULT_TIPOS_DEMANDAS.map((tipo) => ({ ...tipo, colunas: [] })));
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const today = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    tipo: requestedTipo || 'corretivas',
    data_criacao: today,
    titulo: '',
    gri: '',
    atividade: '',
    responsavel: '',
    status: 'Pendente' as DemandaStatus,
    rdm_link: '',
    prioridade: 'Média' as DemandaPrioridade,
    data_conclusao: '',
    descricao: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTipos() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { data, error } = await supabase
          .from('tipos_demandas')
          .select('slug, nome, colunas')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const importedTypes = (data || []).map((tipo) => ({
          ...tipo,
          colunas: Array.isArray(tipo.colunas) ? tipo.colunas : [],
        }));
        const requestedTypeExists = importedTypes.some(
          (tipo) => tipo.slug === requestedTipo
        );
        const availableTypes =
          importedTypes.length > 0
            ? importedTypes
            : DEFAULT_TIPOS_DEMANDAS.map((tipo) => ({
                ...tipo,
                colunas: [],
              }));

        if (requestedTipo && !requestedTypeExists) {
          const requestedType = DEFAULT_TIPOS_DEMANDAS.find(
            (tipo) => tipo.slug === requestedTipo
          );
          if (!requestedType) {
            availableTypes.unshift({
              slug: requestedTipo,
              nome: requestedTipo
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              colunas: [],
            });
          }
        }

        setTiposDisponiveis(availableTypes);
        setFormData((current) => ({
          ...current,
          tipo:
            (requestedTipo &&
            availableTypes.some((tipo) => tipo.slug === requestedTipo)
              ? requestedTipo
              : availableTypes[0]?.slug) || current.tipo,
        }));
      } catch (err: any) {
        toast.error(
          'Erro ao carregar as abas importadas: ' +
            (err.message || 'Erro desconhecido')
        );
      }
    }

    loadTipos();
  }, [requestedTipo]);

  const importedColumns =
    tiposDisponiveis.find((tipo) => tipo.slug === formData.tipo)?.colunas || [];

  const normalizeHeader = (header: string) =>
    header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const hasImportedTitleColumn = importedColumns.some((column) => {
    const normalized = normalizeHeader(column);
    return ['demanda', 'titulo', 'tarefa', 'nome', 'assunto'].some((key) =>
      normalized.includes(key)
    );
  });

  const getStandardField = (column: string) => {
    const normalized = normalizeHeader(column);
    if (
      normalized.includes('demanda') ||
      normalized.includes('titulo') ||
      normalized.includes('tarefa') ||
      normalized.includes('nome') ||
      normalized.includes('assunto')
    ) return 'titulo';
    if (normalized.includes('data') || normalized.includes('criacao')) return 'data_criacao';
    if (normalized.includes('responsavel') || normalized.includes('assignee') || normalized.includes('dono')) return 'responsavel';
    if (normalized.includes('gri')) return 'gri';
    if (normalized.includes('atividade') || normalized.includes('activity')) return 'atividade';
    if (normalized.includes('rdm') || normalized.includes('link')) return 'rdm_link';
    if (normalized.includes('status') || normalized.includes('situacao') || normalized.includes('estado')) return 'status';
    if (normalized.includes('prioridade') || normalized.includes('priority')) return 'prioridade';
    if (normalized.includes('descricao')) return 'descricao';
    if (!hasImportedTitleColumn && column === importedColumns[0]) return 'titulo';
    return null;
  };

  const standardFields = new Set([
    'titulo',
    'data_criacao',
    'responsavel',
    'gri',
    'atividade',
    'rdm_link',
    'status',
    'prioridade',
    'descricao',
  ]);
  const additionalColumns = importedColumns.filter(
    (column) => !standardFields.has(getStandardField(column) || '')
  );

  const getImportedValue = (column: string) => {
    const field = getStandardField(column);
    if (field) {
      return formData[field as keyof typeof formData] || '';
    }
    return customFields[column] || '';
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'O nome da demanda é obrigatório.';
    }
    if (!formData.data_criacao) {
      newErrors.data_criacao = 'A data é obrigatória.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Preencha os campos obrigatórios corretamente.');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        router.push('/login');
        return;
      }

      const dados = Object.fromEntries(
        importedColumns
          .map((column) => [column, getImportedValue(column)])
          .filter(([, value]) => value !== '')
      );

      const { error } = await supabase.from('demandas').insert({
        user_id: user.id,
        tipo: formData.tipo,
        titulo: formData.titulo.trim(),
        gri: formData.gri.trim() || null,
        atividade: formData.atividade.trim() || null,
        responsavel: formData.responsavel.trim() || null,
        status: formData.status,
        rdm_link: formData.rdm_link.trim() || null,
        prioridade: formData.prioridade,
        data_criacao: formData.data_criacao,
        data_conclusao: formData.data_conclusao || null,
        descricao: formData.descricao.trim() || null,
        observacoes: formData.observacoes.trim() || null,
        dados,
      });

      if (error) {
        throw error;
      }

      toast.success('Demanda criada com sucesso!');
      router.push(`/demandas/${formData.tipo}`);
    } catch (err: any) {
      toast.error('Erro ao criar demanda: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Voltar */}
      <div className="flex items-center gap-2">
        <Link
          href={`/demandas/${formData.tipo}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Demandas
        </Link>
      </div>

      {/* Cartão com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nova Demanda</CardTitle>
          <CardDescription>
            Cadastre uma nova demanda informando a aba de destino, data, atividade e responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Seletor de Tipo / Aba */}
            <div>
              <Select
                label="Aba de Destino *"
                id="tipo"
                value={formData.tipo}
                onChange={(e) => {
                  setFormData({ ...formData, tipo: e.target.value });
                  setCustomFields({});
                }}
                options={tiposDisponiveis.map((t) => ({
                  value: t.slug,
                  label: t.nome,
                }))}
              />
            </div>

            {/* Linha 1: Data e Demanda */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Data *"
                  id="data_criacao"
                  type="date"
                  value={formData.data_criacao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_criacao: e.target.value })
                  }
                  error={errors.data_criacao}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Demanda *"
                  id="titulo"
                  placeholder="Ex: Atualização do layout ou tarefa"
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  error={errors.titulo}
                  required
                />
              </div>
            </div>

            {/* Linha 2: GRI e Atividade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="GRI"
                id="gri"
                placeholder="Ex: GRI-12345"
                value={formData.gri}
                onChange={(e) =>
                  setFormData({ ...formData, gri: e.target.value })
                }
              />

              <Input
                label="Atividade"
                id="atividade"
                placeholder="Ex: Ajuste de banco / Deploy"
                value={formData.atividade}
                onChange={(e) =>
                  setFormData({ ...formData, atividade: e.target.value })
                }
              />
            </div>

            {/* Linha 3: Responsável e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Responsável"
                id="responsavel"
                placeholder="Ex: Carlos Silva"
                value={formData.responsavel}
                onChange={(e) =>
                  setFormData({ ...formData, responsavel: e.target.value })
                }
              />

              <Select
                label="Status"
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as DemandaStatus,
                  })
                }
                options={STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: status,
                }))}
              />
            </div>

            {/* Linha 4: RDM Link e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="RDM Link"
                id="rdm_link"
                placeholder="https://... ou identificador RDM"
                value={formData.rdm_link}
                onChange={(e) =>
                  setFormData({ ...formData, rdm_link: e.target.value })
                }
              />

              <Select
                label="Prioridade"
                id="prioridade"
                value={formData.prioridade}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    prioridade: e.target.value as DemandaPrioridade,
                  })
                }
                options={PRIORIDADE_OPTIONS.map((prioridade) => ({
                  value: prioridade,
                  label: prioridade,
                }))}
              />
            </div>

            {/* Descrição / Detalhes */}
            <Textarea
              label="Descrição / Detalhes"
              id="descricao"
              rows={3}
              placeholder="Descreva detalhes específicos desta demanda..."
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />

            {additionalColumns.length > 0 && (
              <div className="space-y-4 border-t border-gray-100 pt-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Campos da planilha
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Preencha os campos personalizados importados para esta aba.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {additionalColumns.map((column, index) => (
                    <Input
                      key={`${column}-${index}`}
                      label={column}
                      id={`custom-field-${index}`}
                      value={customFields[column] || ''}
                      onChange={(e) =>
                        setCustomFields((current) => ({
                          ...current,
                          [column]: e.target.value,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/demandas/${formData.tipo}`)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-1.5" />
                Criar Demanda
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
