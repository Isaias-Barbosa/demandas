'use client';

import { useState, useRef, useEffect, DragEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  X,
  Layers,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getUniqueColumnKeys } from '@/lib/utils';
import { DemandaStatus, DemandaPrioridade } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

export default function ImportarExcelPage() {
  const searchParams = useSearchParams();
  const initialAbaParam = searchParams.get('aba');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Workbook completo guardado na memória
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Configuração da linha de cabeçalho (1 ou 2)
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0); // 0 = Linha 1, 1 = Linha 2

  // Dados extraídos da aba atual
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Nome e slug da categoria/página destino
  const [targetName, setTargetName] = useState<string>('');
  const [targetSlug, setTargetSlug] = useState<string>('');

  // Estado de Importação
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errorCount: number;
    targetSlug: string;
    targetName: string;
  } | null>(null);

  // Quando o arquivo é selecionado
  const processFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Formato de arquivo inválido. Por favor envie um arquivo .xlsx ou .xls.');
      return;
    }

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Escolhe a primeira aba ou a aba correspondente ao parâmetro na URL
        let defaultSheet = wb.SheetNames[0];
        if (initialAbaParam) {
          const matched = wb.SheetNames.find(
            (s) => slugify(s) === initialAbaParam.toLowerCase() || s.toLowerCase() === initialAbaParam.toLowerCase()
          );
          if (matched) defaultSheet = matched;
        }

        setSelectedSheet(defaultSheet);
        parseSheet(wb, defaultSheet, undefined);
        toast.success(`Planilha carregada! ${wb.SheetNames.length} aba(s) encontrada(s).`);
      } catch (err: any) {
        toast.error('Erro ao ler a planilha: ' + (err.message || 'Arquivo corrompido'));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Processa a aba e detecta cabeçalho
  const parseSheet = (wb: XLSX.WorkBook, sheetName: string, forcedHeaderRow?: number) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    if (matrix.length === 0) {
      toast.error(`A aba "${sheetName}" está vazia.`);
      setHeaders([]);
      setRawRows([]);
      return;
    }

    // Auto-detectar linha de cabeçalho se não forçada
    let detectedHeaderRow = forcedHeaderRow;
    if (detectedHeaderRow === undefined) {
      const row0Filled = (matrix[0] || []).filter((c) => String(c).trim() !== '').length;
      const row1Filled = (matrix[1] || []).filter((c) => String(c).trim() !== '').length;

      // Se a linha 2 tiver significativamente mais colunas com nomes (caso comum de Evolutivas), usa linha 2
      if (row1Filled > row0Filled && row0Filled <= 3 && matrix.length > 2) {
        detectedHeaderRow = 1; // Linha 2 do Excel (índice 1)
      } else {
        detectedHeaderRow = 0; // Linha 1 do Excel (índice 0)
      }
    }

    setHeaderRowIndex(detectedHeaderRow);

    const detectedHeaders = (matrix[detectedHeaderRow] || [])
      .map((h: any, idx: number) => {
        const val = String(h || '').trim();
        return val || `Coluna ${idx + 1}`;
      })
      .filter((h: string, idx: number, arr: string[]) => {
        // Ignora colunas vazias no final
        return arr.slice(idx).some((c) => !c.startsWith('Coluna '));
      });

    const dataRows = matrix.slice(detectedHeaderRow + 1).filter((row) =>
      row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
    );

    setHeaders(detectedHeaders);
    setRawRows(dataRows);

    // Ajusta o destino com base no nome da aba
    const cleanName = sheetName.trim();
    setTargetName(cleanName);
    const slug = slugify(cleanName);
    setTargetSlug(slug);
  };

  // Trocar de aba
  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      parseSheet(workbook, newSheet, undefined);
    }
  };

  // Trocar linha de cabeçalho manualmente (Linha 1 vs Linha 2)
  const handleHeaderRowToggle = (newRowIndex: number) => {
    setHeaderRowIndex(newRowIndex);
    if (workbook && selectedSheet) {
      parseSheet(workbook, selectedSheet, newRowIndex);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const resetFile = () => {
    setFileName(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setHeaders([]);
    setRawRows([]);
    setImportResult(null);
    setProgress(0);
    setProcessedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Executar a Importação Dinâmica
  const handleImport = async () => {
    if (headers.length === 0 || rawRows.length === 0) {
      toast.error('Nenhum dado encontrado para importar.');
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setProcessedCount(0);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const finalSlug = targetSlug || slugify(targetName) || 'corretivas';
      const finalName = targetName || selectedSheet || 'Demandas';

      // 1. Salvar ou atualizar metadados da aba em tipos_demandas
      const { error: tipoError } = await supabase
        .from('tipos_demandas')
        .upsert(
          {
            user_id: user.id,
            slug: finalSlug,
            nome: finalName,
            colunas: headers,
          },
          { onConflict: 'user_id,slug' }
        );

      if (tipoError) {
        throw new Error(
          `Não foi possível salvar a aba da planilha no banco. Execute a migração supabase/migrations/20261013215429_fix_import_schema.sql no Supabase. Detalhe: ${tipoError.message}`
        );
      }

      // 2. Mapeamento inteligente para colunas padrão
      let tituloColIndex = -1;
      let dataColIndex = -1;
      let respColIndex = -1;
      let griColIndex = -1;
      let ativColIndex = -1;
      let rdmColIndex = -1;
      let statusColIndex = -1;

      headers.forEach((h, idx) => {
        const norm = normalizeHeader(h);
        if (tituloColIndex === -1 && (norm.includes('demanda') || norm.includes('titulo') || norm.includes('tarefa') || norm.includes('nome') || norm.includes('assunto'))) {
          tituloColIndex = idx;
        }
        if (dataColIndex === -1 && (norm.includes('data') || norm.includes('criacao'))) {
          dataColIndex = idx;
        }
        if (respColIndex === -1 && (norm.includes('responsavel') || norm.includes('assignee') || norm.includes('dono'))) {
          respColIndex = idx;
        }
        if (griColIndex === -1 && (norm === 'gri' || norm.includes('gri'))) {
          griColIndex = idx;
        }
        if (ativColIndex === -1 && (norm.includes('atividade') || norm.includes('activity'))) {
          ativColIndex = idx;
        }
        if (rdmColIndex === -1 && (norm.includes('rdm') || norm.includes('link'))) {
          rdmColIndex = idx;
        }
        if (statusColIndex === -1 && (norm.includes('status') || norm.includes('situacao') || norm.includes('estado'))) {
          statusColIndex = idx;
        }
      });

      // Se não encontrou coluna de título específica, usa a primeira coluna com texto
      if (tituloColIndex === -1) {
        tituloColIndex = 0;
      }

      // 3. Montar linhas com dados padrão + JSONB completo
      let successCount = 0;
      let errorCount = 0;
      const payload: any[] = [];
      const columnKeys = getUniqueColumnKeys(headers);

      rawRows.forEach((row, rowIdx) => {
        // Monta o objeto dinâmico com todas as colunas da planilha
        const rowJson: Record<string, any> = {};
        headers.forEach((_, cIdx) => {
          const val = row[cIdx];
          if (val !== undefined && val !== null && val !== '') {
            rowJson[columnKeys[cIdx]] = String(val).trim();
          }
        });

        // Título/Demanda
        let rowTitulo = row[tituloColIndex] ? String(row[tituloColIndex]).trim() : '';
        if (!rowTitulo) {
          // Busca primeira célula com texto
          const firstFilled = row.find((c: any) => c !== undefined && c !== null && String(c).trim().length > 0);
          rowTitulo = firstFilled ? String(firstFilled).trim() : `Item #${rowIdx + 1}`;
        }

        // Data
        let rowData = today;
        if (dataColIndex !== -1 && row[dataColIndex]) {
          const parsed = parseExcelDate(row[dataColIndex]);
          if (parsed) rowData = parsed;
        }

        // Status
        let rowStatus: DemandaStatus = 'Pendente';
        if (statusColIndex !== -1 && row[statusColIndex]) {
          const str = String(row[statusColIndex]).toLowerCase();
          if (str.includes('andamento') || str.includes('progresso')) rowStatus = 'Em Andamento';
          else if (str.includes('conclu') || str.includes('feito') || str.includes('finaliz')) rowStatus = 'Concluída';
          else if (str.includes('cancel')) rowStatus = 'Cancelada';
        }

        const item: any = {
          user_id: user.id,
          tipo: finalSlug,
          titulo: rowTitulo,
          status: rowStatus,
          data_criacao: rowData,
          responsavel: respColIndex !== -1 && row[respColIndex] ? String(row[respColIndex]).trim() : null,
          gri: griColIndex !== -1 && row[griColIndex] ? String(row[griColIndex]).trim() : null,
          atividade: ativColIndex !== -1 && row[ativColIndex] ? String(row[ativColIndex]).trim() : null,
          rdm_link: rdmColIndex !== -1 && row[rdmColIndex] ? String(row[rdmColIndex]).trim() : null,
          prioridade: 'Média',
          dados: rowJson,
        };

        payload.push(item);
      });

      if (payload.length === 0) {
        toast.error('Nenhuma linha válida encontrada para importar.');
        setImporting(false);
        return;
      }

      // 4. Inserir no Supabase em lotes
      const batchSize = 25;
      const totalToProcess = payload.length;

      for (let i = 0; i < totalToProcess; i += batchSize) {
        const batch = payload.slice(i, i + batchSize);
        const { error } = await supabase.from('demandas').insert(batch);

        if (error) {
          console.error('Erro no lote:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }

        const currentProcessed = Math.min(i + batchSize, totalToProcess);
        setProcessedCount(currentProcessed);
        setProgress(Math.round((currentProcessed / totalToProcess) * 100));
      }

      setImportResult({
        successCount,
        errorCount,
        targetSlug: finalSlug,
        targetName: finalName,
      });

      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} demandas importadas para a aba "${finalName}"!`);
      } else if (successCount > 0) {
        toast.error(
          `Importação parcial: ${successCount} demandas importadas e ${errorCount} com erro.`
        );
      } else {
        toast.error('Nenhuma demanda foi importada com sucesso.');
      }
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err.message || 'Erro inesperado'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Gerador & Importador Dinâmico de Excel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Envie sua planilha com abas (Corretivas, Evolutivas, GDM STIs) e o sistema gera a página e colunas automaticamente.
        </p>
      </div>

      {/* Caixa de Instruções */}
      <Card className="bg-brand-50/50 border-brand-100">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-brand-900 space-y-1">
            <p className="font-semibold text-brand-900">
              Detector Inteligente de Abas e Linha de Cabeçalho:
            </p>
            <p className="text-brand-800 text-xs sm:text-sm">
              • O sistema reconhece <strong>todas as abas</strong> do seu Excel (Corretivas, Evolutivas, GDM STIs).
              <br />
              • Permite escolher se os nomes das colunas estão na <strong>Linha 1</strong> (comum em Corretivas) ou na <strong>Linha 2</strong> (comum em Evolutivas).
              <br />
              • Todas as colunas são salvas e exibidas dinamicamente na página correspondente!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resultado da Importação */}
      {importResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    Importação Concluída com Sucesso!
                  </h3>
                  <p className="text-sm text-green-700 mt-0.5">
                    <strong>{importResult.successCount}</strong> demandas adicionadas na aba{' '}
                    <strong>"{importResult.targetName}"</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFile}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Importar Outra Aba
                </Button>
                <Link href={`/demandas/${importResult.targetSlug}`}>
                  <Button size="sm">
                    Ver {importResult.targetName}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zona de Upload */}
      {!workbook && (
        <Card>
          <CardContent className="p-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/50'
                  : 'border-gray-300 hover:border-brand-500 hover:bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileInput}
                className="hidden"
              />
              <UploadCloud className="mx-auto h-12 w-12 text-brand-500" />
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Selecione ou arraste sua planilha Excel (.xlsx)
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Reconhecemos automaticamente as abas Corretivas, Evolutivas, GDM STIs e suas colunas.
              </p>
              <div className="mt-6">
                <Button type="button" variant="outline" size="sm">
                  Escolher Planilha do Computador
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Painel de Controle da Planilha Carregada */}
      {workbook && (
        <div className="space-y-6">
          {/* Card com arquivo e Seletor de Aba */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sheetNames.length} aba(s) disponível(is)
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFile}
                  disabled={importing}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Trocar Arquivo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Seletor de Abas da Planilha */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2">
                  Selecione a Aba (Sheet) para Importar:
                </label>
                <div className="flex flex-wrap gap-2">
                  {sheetNames.map((sName) => (
                    <button
                      key={sName}
                      type="button"
                      onClick={() => handleSheetChange(sName)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                        selectedSheet === sName
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{sName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Linha do Cabeçalho (Linha 1 vs Linha 2) */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-brand-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Onde estão os nomes das colunas nesta aba?
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                    <input
                      type="radio"
                      name="headerRow"
                      checked={headerRowIndex === 0}
                      onChange={() => handleHeaderRowToggle(0)}
                      className="text-brand-500 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Linha 1 (Ex: Corretivas)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                    <input
                      type="radio"
                      name="headerRow"
                      checked={headerRowIndex === 1}
                      onChange={() => handleHeaderRowToggle(1)}
                      className="text-brand-500 focus:ring-brand-500 h-4 w-4"
                    />
                    <span>Linha 2 (Ex: Evolutivas / Título na linha 1)</span>
                  </label>
                </div>

                <p className="text-xs text-gray-500">
                  {headerRowIndex === 0
                    ? 'O sistema usará a primeira linha como nomes de colunas e começará a ler os dados a partir da linha 2.'
                    : 'O sistema usará a segunda linha como nomes de colunas e começará a ler os dados a partir da linha 3.'}
                </p>
              </div>

              {/* Destino no Menu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nome da Página / Categoria:
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => {
                      setTargetName(e.target.value);
                      setTargetSlug(slugify(e.target.value));
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Identificador (URL da Página):
                  </label>
                  <div className="flex items-center text-xs text-gray-500 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 font-mono">
                    /demandas/{targetSlug}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colunas Detectadas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">
                    Colunas Detectadas ({headers.length})
                  </CardTitle>
                  <CardDescription>
                    Essas colunas serão criadas automaticamente para a página "{targetName}".
                  </CardDescription>
                </div>
                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                  {rawRows.length} linhas para importar
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {headers.map((h, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pré-visualização dos Dados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Pré-visualização da Aba "{selectedSheet}" (Primeiras 10 linhas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-100/70 border-b border-gray-200 font-semibold text-gray-700">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">#</th>
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-3.5 py-2.5 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rawRows.slice(0, 10).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-center text-gray-400 font-mono text-xs">
                          {rIdx + 1}
                        </td>
                        {headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3.5 py-2 whitespace-nowrap max-w-[220px] truncate"
                          >
                            {row[cIdx] !== undefined && row[cIdx] !== null && row[cIdx] !== ''
                              ? String(row[cIdx])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Progresso de Importação */}
          {importing && (
            <Card className="border-brand-200 bg-brand-50/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-brand-900">
                    Importando registros de "{targetName}"... ({processedCount} de {rawRows.length})
                  </span>
                  <span className="font-bold text-brand-600">{progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetFile}
              disabled={importing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              loading={importing}
              disabled={headers.length === 0 || rawRows.length === 0 || importing}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" />
              Importar {rawRows.length} Demandas para "{targetName}"
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
