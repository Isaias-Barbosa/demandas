'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AlertCircle, Columns3, Download, Filter, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import type { Rdm } from '@/lib/jira/model';
import { RDM_EXPORT_FIELDS, type RdmExportField, rdmWorkbook } from '@/lib/jira/excel';

export function RdmExcelExport() {
  const [rdms, setRdms] = useState<Rdm[]>([]);
  const [selected, setSelected] = useState<RdmExportField[]>(RDM_EXPORT_FIELDS.map((f) => f.id));
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const query = useCallback(async () => {
    const response = await fetch('/api/jira/rdms', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao consultar RDMs.');
    setConnected(data.connected);
    setRdms(data.rdms);
    return data as { connected: boolean; rdms: Rdm[] };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await query();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao consultar RDMs.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function exportExcel() {
    setExporting(true);
    setError('');
    try {
      // Consulta novamente para incluir RDMs criadas/atualizadas após o carregamento.
      const data = await query();
      if (!data.connected) throw new Error('Conecte sua conta Jira no perfil.');
      const rows = data.rdms.filter((r) => !status || r.status === status);
      if (!rows.length) throw new Error('Nenhuma RDM encontrada para este filtro.');
      XLSX.writeFile(rdmWorkbook(rows, selected), `rdms_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} RDMs exportadas com sucesso.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao exportar RDMs.';
      setError(message);
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  const count = rdms.filter((r) => !status || r.status === status).length;
  const disabled = loading || exporting;
  const statuses = Array.from(new Set([...rdms.map((r) => r.status), ...(status ? [status] : [])])).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="alert-error">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      {!loading && !connected && !error && (
        <p className="alert-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
          Conecte o Jira em{' '}
          <Link className="font-semibold text-brand-600 underline underline-offset-2" href="/perfil">
            Meu perfil
          </Link>{' '}
          para exportar suas RDMs.
        </p>
      )}

      <Card>
        <CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-slate-100">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Columns3 className="h-[18px] w-[18px]" />
          </span>
          <div>
            <CardTitle>Colunas da planilha</CardTitle>
            <CardDescription>Marque apenas as informações que você quer levar para o Excel.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-4 text-sm font-medium text-brand-600">
            <button type="button" disabled={disabled} className="hover:underline disabled:opacity-50" onClick={() => setSelected(RDM_EXPORT_FIELDS.map((f) => f.id))}>
              Marcar todos
            </button>
            <button type="button" disabled={disabled} className="text-slate-500 hover:underline disabled:opacity-50" onClick={() => setSelected([])}>
              Desmarcar todos
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RDM_EXPORT_FIELDS.map((f) => (
              <label
                key={f.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50/60"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(f.id)}
                  disabled={disabled}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-300"
                />
                {f.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-slate-100">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Filter className="h-[18px] w-[18px]" />
          </span>
          <div>
            <CardTitle>Filtro e download</CardTitle>
            <CardDescription>Escolha o status e baixe a planilha.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="max-w-sm">
            <label htmlFor="rdm-export-status" className="field-label">Status</label>
            <select
              id="rdm-export-status"
              className="field-control"
              value={status}
              disabled={disabled}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="surface-soft flex flex-wrap items-center justify-between gap-3 p-4">
            <p role="status" className="text-sm text-slate-600">
              {loading
                ? 'Consultando Jira…'
                : error
                  ? 'Atualize a consulta para confirmar os dados.'
                  : `${count} ${count === 1 ? 'registro' : 'registros'} • ${selected.length} ${selected.length === 1 ? 'coluna' : 'colunas'} selecionadas`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={refresh} disabled={disabled}>
                <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                Atualizar RDMs
              </Button>
              <Button
                onClick={exportExcel}
                loading={exporting}
                disabled={disabled || !connected || !!error || !count || !selected.length}
              >
                <Download className="h-4 w-4" />
                Baixar em Excel
              </Button>
            </div>
          </div>

          <p className="hint">
            O download consulta o Jira novamente e mantém o filtro escolhido. O código da RDM e a
            coluna de link abrem o ticket no Jira.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
