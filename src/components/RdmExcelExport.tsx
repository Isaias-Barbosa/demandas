'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { Rdm } from '@/lib/jira/model';
import { RDM_EXPORT_FIELDS, RdmExportField, rdmWorkbook } from '@/lib/jira/excel';
export function RdmExcelExport() {
  const [rdms, setRdms] = useState<Rdm[]>([]);
  const [selected, setSelected] = useState<RdmExportField[]>(RDM_EXPORT_FIELDS.map(f => f.id));
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true), [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const query = useCallback(async () => {
    const response = await fetch('/api/jira/rdms', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao consultar RDMs.');
    setConnected(data.connected); setRdms(data.rdms);
    return data as { connected: boolean; rdms: Rdm[] };
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { await query(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao consultar RDMs.'); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { refresh(); }, [refresh]);
  async function exportExcel() {
    setExporting(true); setError('');
    try {
      // Consult again so new/updated RDMs are included in the downloaded file.
      const data = await query();
      if (!data.connected) throw new Error('Conecte sua conta Jira no perfil.');
      const rows = data.rdms.filter(r => !status || r.status === status);
      if (!rows.length) throw new Error('Nenhuma RDM encontrada para este filtro.');
      XLSX.writeFile(rdmWorkbook(rows, selected), `rdms_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`${rows.length} RDMs exportadas com sucesso.`);
    } catch (e) { const message = e instanceof Error ? e.message : 'Erro ao exportar RDMs.'; setError(message); toast.error(message); }
    finally { setExporting(false); }
  }
  const count = rdms.filter(r => !status || r.status === status).length;
  const disabled = loading || exporting;
  return <div className="space-y-6">
    <p className="text-sm text-gray-500">Exporte as RDMs atribuídas a você ou acompanhadas no Jira. Os filtros de projeto e tipo do seu perfil são respeitados.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {!loading && !connected && !error && <p className="rounded-lg border bg-white p-4">Conecte o Jira em <Link className="text-brand-600 underline" href="/perfil">Meu perfil</Link> para exportar suas RDMs.</p>}
    <Card><CardHeader><CardTitle>Campos das RDMs</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-4 text-sm"><button type="button" disabled={disabled} className="text-brand-600 underline" onClick={() => setSelected(RDM_EXPORT_FIELDS.map(f => f.id))}>Marcar todos</button><button type="button" disabled={disabled} className="underline" onClick={() => setSelected([])}>Desmarcar todos</button></div><div className="grid gap-3 sm:grid-cols-2">{RDM_EXPORT_FIELDS.map(f => <label key={f.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={selected.includes(f.id)} disabled={disabled} onChange={() => setSelected(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])} />{f.label}</label>)}</div></CardContent></Card>
    <Card><CardHeader><CardTitle>Filtro e download</CardTitle></CardHeader><CardContent className="space-y-4"><label className="block text-sm font-medium" htmlFor="rdm-export-status">Status</label><select id="rdm-export-status" className="w-full rounded-lg border p-3 text-sm" value={status} disabled={disabled} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option>{Array.from(new Set([...rdms.map(r => r.status), ...(status ? [status] : [])])).sort().map(s => <option key={s}>{s}</option>)}</select><p role="status" className="text-sm text-gray-500">{loading ? 'Consultando Jira…' : error ? 'Atualize a consulta para confirmar os dados.' : `${count} registros • ${selected.length} colunas selecionadas`}</p><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={refresh} disabled={disabled}>Atualizar RDMs</Button><Button onClick={exportExcel} loading={exporting} disabled={disabled || !connected || !!error || !count || !selected.length}>Baixar RDMs em Excel</Button></div><p className="text-xs text-gray-500">O download consulta o Jira novamente e mantém o filtro escolhido. O código da RDM e a coluna de link abrem o ticket no Jira.</p></CardContent></Card>
  </div>;
}
