'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Search,
  Eye,
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

  // Modal de Visualização
  const [viewingDemanda, setViewingDemanda] = useState<Demanda | null>(null);

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
        .order('data_criacao', { ascending: false });

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
      const q = search.toLowerCase();
      const matchesSearch =
        search === '' ||
        demanda.titulo.toLowerCase().includes(q) ||
        (demanda.responsavel && demanda.responsavel.toLowerCase().includes(q)) ||
        (demanda.gri && demanda.gri.toLowerCase().includes(q)) ||
        (demanda.atividade && demanda.atividade.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'todos' || demanda.status === statusFilter;

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
      toast.error('O título/demanda é obrigatório.');
      return;
    }

    try {
      setSavingEdit(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('demandas')
        .update({
          titulo: editingDemanda.titulo,
          gri: editingDemanda.gri || null,
          atividade: editingDemanda.atividade || null,
          responsavel: editingDemanda.responsavel || null,
          status: editingDemanda.status,
          rdm_link: editingDemanda.rdm_link || null,
          prioridade: editingDemanda.prioridade,
          data_criacao: editingDemanda.data_criacao,
          data_conclusao: editingDemanda.data_conclusao || null,
          descricao: editingDemanda.descricao || null,
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
                placeholder="Buscar por Demanda, Responsável, GRI, Atividade..."
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
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      Data
                    </th>
                    <th scope="col" className="px-5 py-3.5 whitespace-nowrap">
                      Demanda
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      GRI
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      Atividade
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      Responsável
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                      RDM Link
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-center whitespace-nowrap">
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
                      {/* 1. Data */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-700 font-medium text-xs">
                        {formatDate(demanda.data_criacao)}
                      </td>

                      {/* 2. Demanda */}
                      <td className="px-5 py-3.5 max-w-[260px]">
                        <div className="font-semibold text-gray-900 truncate" title={demanda.titulo}>
                          {demanda.titulo}
                        </div>
                        {demanda.descricao && (
                          <div className="text-xs text-gray-500 truncate mt-0.5" title={demanda.descricao}>
                            {demanda.descricao}
                          </div>
                        )}
                      </td>

                      {/* 3. GRI */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-700 font-mono">
                        {demanda.gri || <span className="text-gray-300">-</span>}
                      </td>

                      {/* 4. Atividade */}
                      <td className="px-4 py-3.5 max-w-[200px] text-xs text-gray-700">
                        <div className="truncate" title={demanda.atividade || ''}>
                          {demanda.atividade || <span className="text-gray-300">-</span>}
                        </div>
                      </td>

                      {/* 5. Responsável */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        <span className="text-gray-800 font-medium">
                          {demanda.responsavel || (
                            <span className="text-gray-400 italic">Não atribuído</span>
                          )}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            STATUS_COLORS[demanda.status] || 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {demanda.status}
                        </span>
                      </td>

                      {/* 7. RDM Link */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        {demanda.rdm_link ? (
                          demanda.rdm_link.startsWith('http://') || demanda.rdm_link.startsWith('https://') ? (
                            <a
                              href={demanda.rdm_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline font-medium"
                              title={demanda.rdm_link}
                            >
                              <span>Acessar</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-gray-700 font-mono text-xs" title={demanda.rdm_link}>
                              {demanda.rdm_link}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* 8. Ações */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingDemanda(demanda)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDemanda({ ...demanda })}
                            className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
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
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
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

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Data *"
                  id="edit-data"
                  type="date"
                  value={editingDemanda.data_criacao || ''}
                  onChange={(e) =>
                    setEditingDemanda({ ...editingDemanda, data_criacao: e.target.value })
                  }
                  required
                />

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
              </div>

              <Input
                label="Demanda *"
                id="edit-titulo"
                value={editingDemanda.titulo}
                onChange={(e) =>
                  setEditingDemanda({ ...editingDemanda, titulo: e.target.value })
                }
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="GRI"
                  id="edit-gri"
                  value={editingDemanda.gri || ''}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      gri: e.target.value,
                    })
                  }
                  placeholder="Código GRI"
                />

                <Input
                  label="Atividade"
                  id="edit-atividade"
                  value={editingDemanda.atividade || ''}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      atividade: e.target.value,
                    })
                  }
                  placeholder="Nome da atividade"
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
                  label="RDM Link"
                  id="edit-rdm-link"
                  value={editingDemanda.rdm_link || ''}
                  onChange={(e) =>
                    setEditingDemanda({
                      ...editingDemanda,
                      rdm_link: e.target.value,
                    })
                  }
                  placeholder="https://... ou código RDM"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <Textarea
                label="Descrição / Observações"
                id="edit-descricao"
                value={editingDemanda.descricao || ''}
                onChange={(e) =>
                  setEditingDemanda({
                    ...editingDemanda,
                    descricao: e.target.value,
                  })
                }
                rows={2}
                placeholder="Detalhes ou anotações..."
              />

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                <Link
                  href={`/demandas/${editingDemanda.id}/editar`}
                  className="text-xs text-brand-500 hover:underline flex items-center gap-1"
                >
                  Abrir página de edição completa
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
      {/* Modal de Visualização de Detalhes */}
      {viewingDemanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Detalhes da Demanda
                  </h3>
                  <p className="text-xs text-gray-500">
                    Informações completas do registro
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDemanda(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo dos Detalhes */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Título / Demanda */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Demanda
                </span>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">
                  {viewingDemanda.titulo}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                      STATUS_COLORS[viewingDemanda.status] || 'bg-gray-100 text-gray-800'
                    )}
                  >
                    Status: {viewingDemanda.status}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      PRIORIDADE_COLORS[viewingDemanda.prioridade] || 'bg-gray-100 text-gray-800'
                    )}
                  >
                    Prioridade: {viewingDemanda.prioridade}
                  </span>
                </div>
              </div>

              {/* Grid com Campos Estruturados */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">Data de Criação</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                    {formatDate(viewingDemanda.data_criacao)}
                  </span>
                </div>

                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">Responsável</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                    {viewingDemanda.responsavel || <span className="text-gray-400 italic font-normal">Não atribuído</span>}
                  </span>
                </div>

                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">GRI</span>
                  <span className="text-sm font-mono font-semibold text-gray-800 mt-0.5 block">
                    {viewingDemanda.gri || <span className="text-gray-400 font-normal">-</span>}
                  </span>
                </div>

                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">Atividade</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block truncate" title={viewingDemanda.atividade || ''}>
                    {viewingDemanda.atividade || <span className="text-gray-400 font-normal">-</span>}
                  </span>
                </div>
              </div>

              {/* RDM Link */}
              <div className="border border-gray-100 p-3.5 rounded-lg bg-white space-y-1">
                <span className="text-xs font-medium text-gray-500 block">RDM Link</span>
                {viewingDemanda.rdm_link ? (
                  viewingDemanda.rdm_link.startsWith('http://') || viewingDemanda.rdm_link.startsWith('https://') ? (
                    <a
                      href={viewingDemanda.rdm_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline break-all"
                    >
                      <span>{viewingDemanda.rdm_link}</span>
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-sm font-mono text-gray-800 block">
                      {viewingDemanda.rdm_link}
                    </span>
                  )
                ) : (
                  <span className="text-sm text-gray-400 italic">Nenhum link ou código RDM informado</span>
                )}
              </div>

              {/* Data de Conclusão se houver */}
              {viewingDemanda.data_conclusao && (
                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">Data de Conclusão</span>
                  <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                    {formatDate(viewingDemanda.data_conclusao)}
                  </span>
                </div>
              )}

              {/* Descrição */}
              {viewingDemanda.descricao && (
                <div className="border border-gray-100 p-3.5 rounded-lg bg-white space-y-1">
                  <span className="text-xs font-medium text-gray-500 block">Descrição</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {viewingDemanda.descricao}
                  </p>
                </div>
              )}

              {/* Observações */}
              {viewingDemanda.observacoes && (
                <div className="border border-gray-100 p-3.5 rounded-lg bg-white space-y-1">
                  <span className="text-xs font-medium text-gray-500 block">Observações</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {viewingDemanda.observacoes}
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé com Ações */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
              <Link
                href={`/demandas/${viewingDemanda.id}/editar`}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1 font-medium"
              >
                Abrir página completa
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingDemanda(null)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const d = viewingDemanda;
                    setViewingDemanda(null);
                    setEditingDemanda({ ...d });
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar Demanda
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
