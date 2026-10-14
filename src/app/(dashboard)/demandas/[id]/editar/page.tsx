'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  Demanda,
  DemandaStatus,
  DemandaPrioridade,
  STATUS_OPTIONS,
  PRIORIDADE_OPTIONS,
} from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export default function EditarDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    data_criacao: '',
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
    if (!id) return;
    fetchDemanda();
  }, [id]);

  async function fetchDemanda() {
    try {
      setInitialLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('demandas')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      const demanda = data as Demanda;
      setFormData({
        data_criacao: demanda.data_criacao || '',
        titulo: demanda.titulo || '',
        gri: demanda.gri || '',
        atividade: demanda.atividade || '',
        responsavel: demanda.responsavel || '',
        status: demanda.status || 'Pendente',
        rdm_link: demanda.rdm_link || '',
        prioridade: demanda.prioridade || 'Média',
        data_conclusao: demanda.data_conclusao || '',
        descricao: demanda.descricao || '',
        observacoes: demanda.observacoes || '',
      });
    } catch (err) {
      setNotFound(true);
    } finally {
      setInitialLoading(false);
    }
  }

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
      setSubmitting(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('demandas')
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Demanda atualizada com sucesso!');
      router.push('/demandas');
    } catch (err: any) {
      toast.error(
        'Erro ao atualizar demanda: ' + (err.message || 'Erro desconhecido')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-6 w-36 bg-gray-200 rounded animate-pulse" />
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-20 bg-gray-100 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
            <div className="h-10 bg-gray-100 rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Demanda não encontrada
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            A demanda que você tentou acessar não existe, foi excluída ou você não possui permissão para editá-la.
          </p>
          <div className="mt-6">
            <Link href="/demandas">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Voltar para Demandas
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Voltar */}
      <div className="flex items-center gap-2">
        <Link
          href="/demandas"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar para Demandas
        </Link>
      </div>

      {/* Cartão com Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Editar Demanda</CardTitle>
          <CardDescription>
            Atualize as informações da demanda abaixo e salve as alterações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="Nome da atividade"
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
                placeholder="https://... ou código RDM"
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

            {/* Descrição */}
            <Textarea
              label="Descrição / Detalhes"
              id="descricao"
              rows={3}
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/demandas')}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={submitting}>
                <Save className="h-4 w-4 mr-1.5" />
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
