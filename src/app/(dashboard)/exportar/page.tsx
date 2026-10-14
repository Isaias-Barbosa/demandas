'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Filter,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { STATUS_OPTIONS } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ExportField {
  id: string;
  label: string;
}

const EXPORT_FIELDS: ExportField[] = [
  { id: 'data_criacao', label: 'Data' },
  { id: 'titulo', label: 'Demanda' },
  { id: 'gri', label: 'GRI' },
  { id: 'atividade', label: 'Atividade' },
  { id: 'responsavel', label: 'Responsável' },
  { id: 'status', label: 'Status' },
  { id: 'rdm_link', label: 'RDM Link' },
  { id: 'prioridade', label: 'Prioridade' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'observacoes', label: 'Observações' },
];

export default function ExportarExcelPage() {
  const [selectedFields, setSelectedFields] = useState<string[]>(
    EXPORT_FIELDS.map((f) => f.id)
  );
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [rowCount, setRowCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchCount();
  }, [statusFilter]);

  async function fetchCount() {
    try {
      setLoadingCount(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      let query = supabase
        .from('demandas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { count, error } = await query;
      if (error) throw error;

      setRowCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao buscar contagem de exportação:', err);
    } finally {
      setLoadingCount(false);
    }
  }

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((id) => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(EXPORT_FIELDS.map((f) => f.id));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar.');
      return;
    }

    if (rowCount === 0) {
      toast.error('Nenhuma demanda encontrada com os filtros selecionados.');
      return;
    }

    try {
      setExporting(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      let query = supabase
        .from('demandas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todas') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('Nenhum dado encontrado para exportação.');
        return;
      }

      // Preparar os dados selecionados com nomes amigáveis em português
      const rows = data.map((item: any) => {
        const row: Record<string, any> = {};
        EXPORT_FIELDS.forEach((field) => {
          if (selectedFields.includes(field.id)) {
            row[field.label] = item[field.id] ?? '';
          }
        });
        return row;
      });

      // Gerar o arquivo Excel
      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-dimensionar colunas para melhor visualização
      const columnWidths = EXPORT_FIELDS.filter((f) =>
        selectedFields.includes(f.id)
      ).map((f) => ({
        wch: Math.max(f.label.length, 18),
      }));
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandas');

      const fileName = `demandas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Arquivo "${fileName}" exportado com sucesso!`);
    } catch (err: any) {
      toast.error(
        'Erro ao exportar dados: ' + (err.message || 'Erro inesperado')
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Exportar Demandas para Excel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure os campos e filtros para gerar seu arquivo de planilha personalizado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Seleção de Campos e Filtros */}
        <div className="md:col-span-2 space-y-6">
          {/* Seleção de Campos */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Campos para Exportação
                  </CardTitle>
                  <CardDescription>
                    Marque os dados que devem constar no arquivo gerado.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="text-brand-500 hover:underline font-medium"
                  >
                    Marcar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllFields}
                    className="text-gray-500 hover:underline"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXPORT_FIELDS.map((field) => {
                  const isChecked = selectedFields.includes(field.id);
                  return (
                    <label
                      key={field.id}
                      onClick={() => toggleField(field.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-brand-500 bg-brand-50/30 text-gray-900'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'bg-brand-500 border-brand-500 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium">{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filtro por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-500" />
                Filtro de Exportação
              </CardTitle>
              <CardDescription>
                Escolha se deseja exportar todas as demandas ou apenas um status específico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-600 block">
                  Status das Demandas
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-800"
                >
                  <option value="todas">Todas as Demandas (sem filtro)</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      Apenas "{status}"
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Resumo e Download */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-white to-gray-50/80 border-gray-200">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 mb-2">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Resumo da Exportação
              </CardTitle>
              <CardDescription>
                Verifique os detalhes antes de baixar a planilha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-gray-100 text-sm">
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Linhas a exportar:</span>
                  <span className="font-bold text-gray-900">
                    {loadingCount ? 'Calculando...' : `${rowCount} registros`}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Colunas selecionadas:</span>
                  <span className="font-bold text-gray-900">
                    {selectedFields.length} de {EXPORT_FIELDS.length}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Filtro aplicado:</span>
                  <span className="font-bold text-gray-900">
                    {statusFilter === 'todas' ? 'Todos' : statusFilter}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-gray-500">Formato do arquivo:</span>
                  <span className="font-semibold text-gray-700">.xlsx (Excel)</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleExport}
                  loading={exporting}
                  disabled={selectedFields.length === 0 || rowCount === 0 || loadingCount}
                  className="w-full h-11"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo Excel
                </Button>
                {rowCount === 0 && !loadingCount && (
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Nenhum registro para exportar com estes filtros.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
