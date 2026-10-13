'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

export default function NovaDemandaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    status: 'Pendente' as DemandaStatus,
    responsavel: '',
    prioridade: 'Média' as DemandaPrioridade,
    data_criacao: today,
    data_conclusao: '',
    categoria: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'O título é obrigatório.';
    }
    if (!formData.data_criacao) {
      newErrors.data_criacao = 'A data de criação é obrigatória.';
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

      const { error } = await supabase.from('demandas').insert({
        user_id: user.id,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim() || null,
        status: formData.status,
        responsavel: formData.responsavel.trim() || null,
        prioridade: formData.prioridade,
        data_criacao: formData.data_criacao,
        data_conclusao: formData.data_conclusao || null,
        categoria: formData.categoria.trim() || null,
        observacoes: formData.observacoes.trim() || null,
      });

      if (error) {
        throw error;
      }

      toast.success('Demanda criada com sucesso!');
      router.push('/demandas');
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
          href="/demandas"
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
            Preencha os campos abaixo para cadastrar uma nova demanda no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Título */}
            <Input
              label="Título *"
              id="titulo"
              placeholder="Ex: Atualização do layout da tela inicial"
              value={formData.titulo}
              onChange={(e) =>
                setFormData({ ...formData, titulo: e.target.value })
              }
              error={errors.titulo}
              required
            />

            {/* Descrição */}
            <Textarea
              label="Descrição"
              id="descricao"
              rows={3}
              placeholder="Descreva com detalhes o objetivo e especificações desta demanda..."
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />

            {/* Status e Prioridade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Responsável e Categoria */}
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

              <Input
                label="Categoria"
                id="categoria"
                placeholder="Ex: Frontend, Design, Suporte"
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({ ...formData, categoria: e.target.value })
                }
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Data de Criação *"
                id="data_criacao"
                type="date"
                value={formData.data_criacao}
                onChange={(e) =>
                  setFormData({ ...formData, data_criacao: e.target.value })
                }
                error={errors.data_criacao}
                required
              />

              <Input
                label="Data de Conclusão"
                id="data_conclusao"
                type="date"
                value={formData.data_conclusao}
                onChange={(e) =>
                  setFormData({ ...formData, data_conclusao: e.target.value })
                }
              />
            </div>

            {/* Observações */}
            <Textarea
              label="Observações"
              id="observacoes"
              rows={2}
              placeholder="Anotações internas, links ou prazos extras..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData({ ...formData, observacoes: e.target.value })
              }
            />

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/demandas')}
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
