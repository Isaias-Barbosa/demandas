'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Upload,
  FileSpreadsheet,
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

function formatTipoName(slug: string): string {
  if (slug === 'corretivas') return 'Corretivas';
  if (slug === 'evolutivas') return 'Evolutivas';
  if (slug === 'gdm-stis') return 'GDM STIs';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function DemandaPorTipoPage() {
  const params = useParams();
  const tipo = (params?.tipo as string) || 'corretivas';
  const tipoNome = formatTipoName(tipo);

  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [colunasCustomizadas, setColunasCustomizadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Modais
  const [viewingDemanda, setViewingDemanda] = useState<Demanda | null>(null);
  const [editingDemanda, setEditingDemanda] = useState<Demanda | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchDemandas();
  }, [tipo]);

  async function fetchDemandas() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Buscar metadados de colunas salvas para este tipo
      const { data: tipoMeta } = await supabase
        .from('tipos_demandas')
        .select('colunas')
        .eq('user_id', user.id)
        .eq('slug', tipo)
        .maybeSingle();

      if (tipoMeta?.colunas && Array.isArray(tipoMeta.colunas)) {
        setColunasCustomizadas(tipoMeta.colunas);
      } else {
        setColunasCustomizadas([]);
      }

      // Buscar demandas
      let query = supabase
        .from('demandas')
        .select('*')
        .eq('user_id', user.id)
        .order('data_criacao', { ascending: false });

      // Se for corretivas, traz também as que não possuem tipo explícito
      if (tipo === 'corretivas') {
        query = query.or('tipo.eq.corretivas,tipo.is.null');
      } else {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;

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

  // Detectar colunas dinâmicas para tipos diferentes de corretivas (se não tiver salvas em tipos_demandas)
  const activeColumns = useMemo(() => {
    if (tipo === 'corretivas') {
      return ['Data', 'Demanda', 'GRI', 'Atividade', 'Responsável', 'Status', 'RDM Link'];
    }

    if (colunasCustomizadas.length > 0) {
      return colunasCustomizadas;
    }

    // Auto-extrair colunas dos primeiros dados disponíveis
    const setOfKeys = new Set<string>();
    demandas.slice(0, 20).forEach((d) => {
      if (d.dados && typeof d.dados === 'object') {
        Object.keys(d.dados).forEach((k) => setOfKeys.add(k));
      }
    });

    if (setOfKeys.size > 0) {
      return Array.from(setOfKeys);
    }

    // Fallback padrão
    return ['Data', 'Demanda', 'Responsável', 'Status'];
  }, [tipo, colunasCustomizadas, demandas]);

  // Filtragem dos dados
  const filteredDemandas = useMemo(() => {
    return demandas.filter((demanda) => {
      const q = search.toLowerCase();
      let matchesSearch = search === '';

      if (!matchesSearch) {
        matchesSearch = Boolean(
          (demanda.titulo && demanda.titulo.toLowerCase().includes(q)) ||
          (demanda.responsavel && demanda.responsavel.toLowerCase().includes(q)) ||
          (demanda.gri && demanda.gri.toLowerCase().includes(q)) ||
          (demanda.atividade && demanda.atividade.toLowerCase().includes(q))
        );

        // Busca nos dados dinâmicos também
        if (!matchesSearch && demanda.dados) {
          matchesSearch = Object.values(demanda.dados).some((v) =>
            String(v).toLowerCase().includes(q)
          );
        }
      }

      const matchesStatus =
        statusFilter === 'todos' || demanda.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [demandas, search, statusFilter]);

  // Resetar página quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredDemandas.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDemandas = filteredDemandas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Exclusão
  async function handleDelete(id: string, titulo: string) {
    if (!window.confirm(`Tem certeza que deseja excluir "${titulo || 'esta demanda'}"?`)) {
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

    if (!editingDemanda.titulo?.trim()) {
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
          dados: editingDemanda.dados || {},
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

  // Helper para renderizar célula dinâmica
  const renderCellContent = (demanda: Demanda, col: string) => {
    const colLower = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (colLower.includes('data')) {
      return formatDate(demanda.data_criacao || demanda.dados?.[col]);
    }
    if (colLower.includes('demanda') || colLower.includes('titulo')) {
      return (
        <span className="font-semibold text-gray-900 truncate block max-w-[240px]" title={demanda.titulo}>
          {demanda.titulo || demanda.dados?.[col] || '-'}
        </span>
      );
    }
    if (colLower === 'gri' || colLower.includes('gri')) {
      return (
        <span className="font-mono text-gray-700">
          {demanda.gri || demanda.dados?.[col] || '-'}
        </span>
      );
    }
    if (colLower.includes('atividade')) {
      return (
        <span className="text-gray-700 truncate block max-w-[200px]" title={demanda.atividade || demanda.dados?.[col] || ''}>
          {demanda.atividade || demanda.dados?.[col] || '-'}
        </span>
      );
    }
    if (colLower.includes('responsavel')) {
      return (
        <span className="font-medium text-gray-800">
          {demanda.responsavel || demanda.dados?.[col] || <span className="text-gray-400 italic">Não atribuído</span>}
        </span>
      );
    }
    if (colLower.includes('status')) {
      return (
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
            STATUS_COLORS[demanda.status] || 'bg-gray-100 text-gray-800'
          )}
        >
          {demanda.status}
        </span>
      );
    }
    if (colLower.includes('rdm') || colLower.includes('link')) {
      const val = demanda.rdm_link || demanda.dados?.[col];
      if (!val) return <span className="text-gray-300">-</span>;
      if (String(val).startsWith('http://') || String(val).startsWith('https://')) {
        return (
          <a
            href={String(val)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 hover:underline font-medium"
          >
            <span>Acessar</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return <span className="font-mono text-gray-700">{val}</span>;
    }

    // Campo dos dados JSONB
    const val = demanda.dados?.[col];
    return val !== undefined && val !== null && val !== '' ? String(val) : '-';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Demandas {tipoNome}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
              Aba: {tipoNome}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciamento e acompanhamento das demandas da categoria {tipoNome}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href={`/importar?aba=${tipo}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-1.5" />
              Importar Planilha
            </Button>
          </Link>
          <Link href={`/demandas/nova?tipo=${tipo}`}>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Demanda
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Campo de Busca */}
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar em ${tipoNome} (demanda, responsável, atividade, código)...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de Status */}
            <div className="md:col-span-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Demandas */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
            <p className="mt-3 text-sm">Carregando demandas de {tipoNome}...</p>
          </div>
        ) : filteredDemandas.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-base font-semibold text-gray-900">
              Nenhuma demanda em {tipoNome}
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              {demandas.length === 0
                ? `Você ainda não importou ou cadastrou nenhuma demanda para a aba "${tipoNome}".`
                : 'Nenhum resultado corresponde aos filtros aplicados.'}
            </p>
            {demandas.length === 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href={`/importar?aba=${tipo}`}>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Importar Excel de {tipoNome}
                  </Button>
                </Link>
                <Link href={`/demandas/nova?tipo=${tipo}`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Cadastrar Manualmente
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
                    {activeColumns.map((col) => (
                      <th key={col} scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                    {/* Coluna Status explícita caso não esteja em activeColumns */}
                    {!activeColumns.some((c) => c.toLowerCase().includes('status')) && (
                      <th scope="col" className="px-4 py-3.5 whitespace-nowrap">
                        Status
                      </th>
                    )}
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
                      {activeColumns.map((col) => (
                        <td key={col} className="px-4 py-3.5 whitespace-nowrap text-xs">
                          {renderCellContent(demanda, col)}
                        </td>
                      ))}

                      {/* Status se não estava em activeColumns */}
                      {!activeColumns.some((c) => c.toLowerCase().includes('status')) && (
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
                      )}

                      {/* Ações */}
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

      {/* Modal de Visualização de Detalhes (Olho 👁️) */}
      {viewingDemanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Detalhes da Demanda ({tipoNome})
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

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Título / Demanda */}
              <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-1">
                  Demanda / Identificador
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

              {/* Campos Padrão */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-gray-100 p-3 rounded-lg bg-white">
                  <span className="text-xs font-medium text-gray-500 block">Data</span>
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

                {viewingDemanda.gri && (
                  <div className="border border-gray-100 p-3 rounded-lg bg-white">
                    <span className="text-xs font-medium text-gray-500 block">GRI</span>
                    <span className="text-sm font-mono font-semibold text-gray-800 mt-0.5 block">
                      {viewingDemanda.gri}
                    </span>
                  </div>
                )}

                {viewingDemanda.atividade && (
                  <div className="border border-gray-100 p-3 rounded-lg bg-white">
                    <span className="text-xs font-medium text-gray-500 block">Atividade</span>
                    <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                      {viewingDemanda.atividade}
                    </span>
                  </div>
                )}
              </div>

              {/* RDM Link */}
              {viewingDemanda.rdm_link && (
                <div className="border border-gray-100 p-3.5 rounded-lg bg-white space-y-1">
                  <span className="text-xs font-medium text-gray-500 block">RDM Link</span>
                  {viewingDemanda.rdm_link.startsWith('http://') || viewingDemanda.rdm_link.startsWith('https://') ? (
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
                  )}
                </div>
              )}

              {/* Campos dinâmicos adicionais da planilha (dados JSONB) */}
              {viewingDemanda.dados && Object.keys(viewingDemanda.dados).length > 0 && (
                <div className="border border-gray-100 p-4 rounded-xl bg-gray-50/50 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                    Outras Colunas da Planilha
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {Object.entries(viewingDemanda.dados).map(([key, val]) => (
                      <div key={key} className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                        <span className="text-xs text-gray-400 block truncate" title={key}>
                          {key}
                        </span>
                        <span className="text-sm font-medium text-gray-800 block mt-0.5 break-words">
                          {val !== undefined && val !== null && val !== '' ? String(val) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
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
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 bg-gray-50/50">
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
      )}

      {/* Modal de Edição */}
      {editingDemanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar Demanda ({tipoNome})
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
                label="Demanda / Título *"
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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
