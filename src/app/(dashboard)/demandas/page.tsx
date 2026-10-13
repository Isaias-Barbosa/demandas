'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  Demanda,
  DemandaStatus,
  DemandaPrioridade,
  STATUS_OPTIONS,
  PRIORIDADE_OPTIONS,
  STATUS_COLORS,
  PRIORIDADE_COLORS,
} from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

export default function DemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todas');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de Edição
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchDemandas();
  }, []);

  async function fetchDemandas() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('demandas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDemandas((data as Demanda[]) || []);
    } catch (err: any) {
      toast.error('Erro ao carregar demandas: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }

  // Filtragem dos dados
  const filteredDemandas = useMemo(() => {
    return demandas.filter((demanda) => {
      // Busca por título ou responsável
      const matchesSearch =
        search === '' ||
        demanda.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (demanda.responsavel &&
          demanda.responsavel.toLowerCase().includes(search.toLowerCase()));

      // Filtro de Status
      const matchesStatus =
        statusFilter === 'todos' || demanda.status === statusFilter;

      // Filtro de Prioridade
      const matchesPrioridade =
        prioridadeFilter === 'todas' || demanda.prioridade === prioridadeFilter;

      return matchesSearch && matchesStatus && matchesPrioridade;
    });
  }, [demandas, search, statusFilter, prioridadeFilter]);

  // Resetar página quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, prioridadeFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredDemandas.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDemandas = filteredDemandas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Exclusão
  async function handleDelete(id: string, titulo: string) {
    if (!window.confirm(`Tem certeza que deseja excluir a demanda "${titulo}"?`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from('demandas').delete().eq('id', id);

      if (error) throw error;

      setDemandas((prev) => prev.filter((d) => d.id !== id));
      toast.success('Demanda excluída com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao excluir demanda: ' + (err.message || 'Erro desconhecido'));
    }
  }

  // Salvar no Modal de Edição
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDemanda) return;

    if (!editingDemanda.titulo.trim()) {
      toast.error('O título é obrigatório.');
      return;
    }

    try {
      setSavingEdit(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('demandas')
        .update({
          titulo: editingDemanda.titulo,
          descricao: editingDemanda.descricao || null,
          status: editingDemanda.status,
          responsavel: editingDemanda.responsavel || null,
          prioridade: editingDemanda.prioridade,
          data_conclusao: editingDemanda.data_conclusao || null,
          categoria: editingDemanda.categoria || null,
          observacoes: editingDemanda.observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDemanda.id);

      if (error) throw error;

      setDemandas((prev) =>
        prev.map((d) => (d.id === editingDemanda.id ? editingDemanda : d))
      );
      toast.success('Demanda atualizada com sucesso!');
      setEditingDemanda(null);
    } catch (err: any) {
      toast.error('Erro ao salvar demanda: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSavingEdit(false);
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Demandas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciamento e acompanhamento de todas as demandas cadastradas
          </p>
        </div>
        <Link href="/demandas/nova">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Demanda
          </Button>
        </Link>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Campo de Busca */}
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou responsável..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de Status */}
            <div className="md:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-700"
              >
                <option value="todos">Todos os Status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Prioridade */}
            <div className="md:col-span-3">
              <select
                value={prioridadeFilter}
                onChange={(e) => setPrioridadeFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-700"
              >
                <option value="todas">Todas as Prioridades</option>
                {PRIORIDADE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Demandas */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-sm">Carregando demandas...</p>
          </div>
        ) : filteredDemandas.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">
              Nenhuma demanda encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {demandas.length === 0
                ? 'Você ainda não cadastrou nenhuma demanda.'
                : 'Nenhum resultado corresponde aos filtros aplicados.'}
            </p>
            {demandas.length === 0 && (
              <div className="mt-6">
                <Link href="/demandas/nova">
                  <Button>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Criar Primeira Demanda
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Título
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Responsável
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Prioridade
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Data Criação
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedDemandas.map((demanda) => (
                    <tr
                      key={demanda.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Título */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {demanda.titulo}
                        </div>
                        {demanda.categoria && (
                          <span className="inline-block text-xs text-gray-400 mt-0.5">
                            {demanda.categoria}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            STATUS_COLORS[demanda.status] || 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {demanda.status}
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-800">
                          {demanda.responsavel || (
                            <span className="text-gray-400 italic">Não atribuído</span>
                          )}
                        </span>
                      </td>

                      {/* Prioridade */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            PRIORIDADE_COLORS[demanda.prioridade] ||
                              'bg-gray-100 text-gray-800'
                          )}
                        >
                          {demanda.prioridade}
                        </span>
                      </td>

                      {/* Data Criação */}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {formatDate(demanda.data_criacao)}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingDemanda({ ...demanda })}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar demanda"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(demanda.id, demanda.titulo)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir demanda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-white">
              <div className="text-sm text-gray-500">
                Página <span className="font-semibold text-gray-700">{currentPage}</span> de{' '}
                <span className="font-semibold text-gray-700">{totalPages}</span> (Total:{' '}
                <span className="font-semibold text-gray-700">
                  {filteredDemandas.length}
                </span>{' '}
                demandas)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal de Edição Rápida */}
      {editingDemanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Demanda
              </h3>
              <button
                type="button"
                onClick={() => setEditingDemanda(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <Input
                label="Título *"
                id="edit-titulo"
                value={editingDemanda.titulo}
                onChange={(e) =>
                  setEditingDemanda({ ...editingDemanda, titulo: e.target.value })
                }
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  id="edit-status"
                  value={editingDemanda.status}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      status: e.target.value as DemandaStatus,
                    })
                  }
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                />

                <Select
                  label="Prioridade"
                  id="edit-prioridade"
                  value={editingDemanda.prioridade}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      prioridade: e.target.value as DemandaPrioridade,
                    })
                  }
                  options={PRIORIDADE_OPTIONS.map((p) => ({ value: p, label: p }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Responsável"
                  id="edit-responsavel"
                  value={editingDemanda.responsavel || ''}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      responsavel: e.target.value,
                    })
                  }
                  placeholder="Nome do responsável"
                />

                <Input
                  label="Data de Conclusão"
                  id="edit-data-conclusao"
                  type="date"
                  value={editingDemanda.data_conclusao || ''}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      data_conclusao: e.target.value,
                    })
                  }
                />
              </div>

              <Input
                label="Categoria"
                id="edit-categoria"
                value={editingDemanda.categoria || ''}
                onChange={(e) =>
                  setEditingDemanda({
                    ...editingDemanda,
                    categoria: e.target.value,
                  })
                }
                placeholder="Ex: Marketing, Desenvolvimento, Suporte"
              />

              <Textarea
                label="Descrição"
                id="edit-descricao"
                value={editingDemanda.descricao || ''}
                onChange={(e) =>
                  setEditingDemanda({
                    ...editingDemanda,
                    descricao: e.target.value,
                  })
                }
                rows={3}
                placeholder="Detalhes sobre a demanda..."
              />

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                <Link
                  href={`/demandas/${editingDemanda.id}/editar`}
                  className="text-xs text-brand-500 hover:underline flex items-center gap-1"
                >
                  Abrir formulário completo
                  <ExternalLink className="h-3 w-3" />
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDemanda(null)}
                    disabled={savingEdit}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={savingEdit}>
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
