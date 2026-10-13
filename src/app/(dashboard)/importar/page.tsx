'use client';

import { useState, useRef, DragEvent } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { DemandaStatus, DemandaPrioridade } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const FIELD_OPTIONS = [
  { value: '', label: 'Ignorar coluna' },
  { value: 'titulo', label: 'Título (Obrigatório)' },
  { value: 'descricao', label: 'Descrição' },
  { value: 'status', label: 'Status' },
  { value: 'responsavel', label: 'Responsável' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'data_criacao', label: 'Data de Criação' },
  { value: 'data_conclusao', label: 'Data de Conclusão' },
  { value: 'categoria', label: 'Categoria' },
  { value: 'observacoes', label: 'Observações' },
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function autoDetectField(header: string): string {
  const norm = normalizeHeader(header);

  if (norm.includes('titulo') || norm.includes('title') || norm.includes('tarefa') || norm.includes('nome') || norm.includes('assunto') || norm.includes('demanda')) {
    return 'titulo';
  }
  if (norm.includes('desc') || norm.includes('detalhe')) {
    return 'descricao';
  }
  if (norm.includes('status') || norm.includes('situacao') || norm.includes('estado')) {
    return 'status';
  }
  if (norm.includes('responsavel') || norm.includes('assignee') || norm.includes('dono') || norm.includes('atribuido')) {
    return 'responsavel';
  }
  if (norm.includes('prioridade') || norm.includes('priority') || norm.includes('urgencia')) {
    return 'prioridade';
  }
  if (
    norm.includes('datacriacao') ||
    norm.includes('criadoem') ||
    norm.includes('criacao') ||
    norm.includes('dataabertura') ||
    norm.includes('createdat') ||
    (norm.includes('data') && !norm.includes('conclu') && !norm.includes('final'))
  ) {
    return 'data_criacao';
  }
  if (
    norm.includes('dataconclusao') ||
    norm.includes('concluidoem') ||
    norm.includes('conclusao') ||
    norm.includes('dataentrega') ||
    norm.includes('finalizacao')
  ) {
    return 'data_conclusao';
  }
  if (norm.includes('categoria') || norm.includes('setor') || norm.includes('departamento') || norm.includes('tipo')) {
    return 'categoria';
  }
  if (norm.includes('observacao') || norm.includes('obs') || norm.includes('nota') || norm.includes('comentario')) {
    return 'observacoes';
  }

  return '';
}

function normalizeStatus(val: any): DemandaStatus {
  if (!val) return 'Pendente';
  const str = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (str.includes('andamento') || str.includes('progresso')) return 'Em Andamento';
  if (str.includes('conclu') || str.includes('feito') || str.includes('finaliz')) return 'Concluída';
  if (str.includes('cancel')) return 'Cancelada';
  return 'Pendente';
}

function normalizePrioridade(val: any): DemandaPrioridade {
  if (!val) return 'Média';
  const str = String(val).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (str.includes('urgente') || str.includes('critica')) return 'Urgente';
  if (str.includes('alta')) return 'Alta';
  if (str.includes('baixa')) return 'Baixa';
  return 'Média';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Dados do Excel
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Estado de Importação
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errorCount: number;
  } | null>(null);

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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const json: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });

        if (json.length < 2) {
          toast.error('A planilha deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
          return;
        }

        const detectedHeaders: string[] = json[0].map((h: any) => String(h || '').trim()).filter(Boolean);
        const dataRows: any[] = json.slice(1).filter((row) =>
          row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
        );

        setHeaders(detectedHeaders);
        setRawRows(dataRows);

        // Auto-detect mapeamento de colunas
        const initialMapping: Record<string, string> = {};
        detectedHeaders.forEach((header) => {
          initialMapping[header] = autoDetectField(header);
        });
        setColumnMapping(initialMapping);

        toast.success(`Arquivo carregado com sucesso: ${dataRows.length} linhas detectadas.`);
      } catch (err: any) {
        toast.error('Erro ao ler a planilha: ' + (err.message || 'Arquivo corrompido'));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (header: string, field: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [header]: field,
    }));
  };

  const resetFile = () => {
    setFileName(null);
    setHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setImportResult(null);
    setProgress(0);
    setProcessedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    // Validar se o campo título foi mapeado
    const hasTitulo = Object.values(columnMapping).includes('titulo');
    if (!hasTitulo) {
      toast.error('Você deve mapear pelo menos uma coluna para o campo "Título (Obrigatório)".');
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
      let successCount = 0;
      let errorCount = 0;

      // Montar objetos de demanda
      const payload: any[] = [];

      rawRows.forEach((row) => {
        const item: Record<string, any> = {
          user_id: user.id,
          status: 'Pendente',
          prioridade: 'Média',
          data_criacao: today,
        };

        headers.forEach((header, index) => {
          const targetField = columnMapping[header];
          if (!targetField) return;

          const cellValue = row[index];
          if (cellValue === undefined || cellValue === null || cellValue === '') return;

          if (targetField === 'status') {
            item.status = normalizeStatus(cellValue);
          } else if (targetField === 'prioridade') {
            item.prioridade = normalizePrioridade(cellValue);
          } else if (targetField === 'data_criacao') {
            const parsed = parseExcelDate(cellValue);
            if (parsed) item.data_criacao = parsed;
          } else if (targetField === 'data_conclusao') {
            const parsed = parseExcelDate(cellValue);
            if (parsed) item.data_conclusao = parsed;
          } else {
            item[targetField] = String(cellValue).trim();
          }
        });

        // Somente adicionar se houver título
        if (item.titulo && String(item.titulo).trim().length > 0) {
          payload.push(item);
        } else {
          errorCount++;
        }
      });

      if (payload.length === 0) {
        toast.error('Nenhuma linha válida com título encontrado para importar.');
        setImporting(false);
        return;
      }

      // Inserir em lotes de 20
      const batchSize = 20;
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

      setImportResult({ successCount, errorCount });

      if (successCount > 0) {
        toast.success(`${successCount} demandas importadas com sucesso!`);
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
          Importar Demandas via Excel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Envie sua planilha (.xlsx ou .xls) para cadastrar múltiplas demandas de uma só vez.
        </p>
      </div>

      {/* Caixa de Instruções */}
      <Card className="bg-brand-50/50 border-brand-100">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-brand-900 space-y-1">
            <p className="font-semibold text-brand-900">
              Instruções para importação correta:
            </p>
            <p className="text-brand-800 text-xs sm:text-sm">
              • A primeira linha deve conter os cabeçalhos das colunas.
              <br />
              • A coluna <strong>Título</strong> é obrigatória.
              <br />
              • O sistema detecta automaticamente colunas como Status, Responsável, Prioridade, Datas e Categoria.
              <br />
              • Status suportados: <em>Pendente, Em Andamento, Concluída, Cancelada</em> (valores não identificados viram Pendente).
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
                    Importação Concluída!
                  </h3>
                  <p className="text-sm text-green-700 mt-0.5">
                    <strong>{importResult.successCount}</strong> demandas adicionadas com sucesso.
                    {importResult.errorCount > 0 && (
                      <span className="text-red-600 ml-2">
                        ({importResult.errorCount} linhas ignoradas por ausência de título ou erro).
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFile}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Importar Outro
                </Button>
                <Link href="/demandas">
                  <Button size="sm">
                    Ver Demandas
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zona de Drag & Drop */}
      {!fileName && (
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
                Clique para selecionar ou arraste sua planilha aqui
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Suporta arquivos Excel (.xlsx e .xls)
              </p>
              <div className="mt-6">
                <Button type="button" variant="outline" size="sm">
                  Escolher Arquivo do Computador
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Arquivo Selecionado e Mapeamento */}
      {fileName && (
        <div className="space-y-6">
          {/* Card com arquivo ativo */}
          <Card>
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base">
                    {fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {rawRows.length} linhas de dados encontradas
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
            </CardContent>
          </Card>

          {/* Mapeamento de Colunas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
              <CardDescription>
                Confirme para qual campo de Demanda cada coluna da sua planilha deve ser mapeada.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {headers.map((header) => {
                  const currentValue = columnMapping[header] || '';
                  const sampleValue = rawRows[0] ? String(rawRows[0][headers.indexOf(header)] || '-') : '-';

                  return (
                    <div
                      key={header}
                      className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2"
                    >
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Coluna no Excel:
                        </span>
                        <p className="text-sm font-semibold text-gray-900 truncate" title={header}>
                          {header}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5" title={sampleValue}>
                          Exemplo: {sampleValue}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Mapear para:
                        </label>
                        <select
                          value={currentValue}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                          disabled={importing}
                          className={`w-full h-9 px-2.5 rounded-md border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                            currentValue === 'titulo'
                              ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                              : currentValue !== ''
                              ? 'border-gray-300 bg-white text-gray-900'
                              : 'border-gray-200 bg-gray-100 text-gray-400'
                          }`}
                        >
                          {FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!Object.values(columnMapping).includes('titulo') && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Atenção: Você precisa associar uma coluna ao campo <strong>Título</strong> para prosseguir com a importação.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pré-visualização das 10 primeiras linhas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Pré-visualização dos Dados (Primeiras 10 linhas)
              </CardTitle>
              <CardDescription>
                Confira como os registros estão estruturados na planilha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-100/70 border-b border-gray-200 font-semibold text-gray-700">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">#</th>
                      {headers.map((header) => (
                        <th key={header} className="px-4 py-2.5 whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {rawRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-center text-gray-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        {headers.map((header, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-4 py-2 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {row[colIdx] !== undefined && row[colIdx] !== null && row[colIdx] !== ''
                              ? String(row[colIdx])
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

          {/* Barra de Progresso durante a importação */}
          {importing && (
            <Card className="border-brand-200 bg-brand-50/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-brand-900">
                    Importando registros... ({processedCount} de {rawRows.length})
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

          {/* Botão de Iniciar Importação */}
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
              disabled={!Object.values(columnMapping).includes('titulo') || importing}
            >
              <UploadCloud className="h-4 w-4 mr-1.5" />
              Importar {rawRows.length} Demandas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
