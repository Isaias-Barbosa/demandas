'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { bucket, Rdm } from '@/lib/jira/model';

export function JiraRdms({ summaryOnly = false }: { summaryOnly?: boolean }) {
  const [rdms, setRdms] = useState<Rdm[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Rdm | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/jira/rdms', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na consulta.');
      setRdms(data.rdms); setConnected(data.connected); setUpdated(data.updatedAt || '');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao consultar Jira.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); triggerRef.current?.focus(); };
  }, [selected]);
  const labels = ['Minhas RDMs', 'Aprovadas', 'Aguardando', 'Em Execução', 'Cancelados'];
  return <section className="space-y-4" aria-label="RDMs do Jira">
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error} <button className="underline" onClick={load} disabled={loading}>Tentar novamente</button></p>}
    {!loading && !connected && !error && <p className="rounded-lg border bg-white p-4 text-sm">Conecte sua conta Jira no <Link href="/perfil" className="text-brand-600 underline">perfil</Link> para consultar suas RDMs.</p>}
    {summaryOnly ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{labels.map((label, i) => <Link href="/rdms" key={label} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-bold text-brand-600">{loading || error || !connected ? '—' : i === 0 ? rdms.length : rdms.filter(r => bucket(r.status) === label).length}</p></Link>)}</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold">RDMs atribuídas a você ou acompanhadas</h2><p className="text-sm text-gray-500">{updated ? `Última consulta: ${new Date(updated).toLocaleString('pt-BR')}` : 'Consulte as mudanças atribuídas a você ou que você acompanha no Jira.'}</p></div><Button onClick={load} loading={loading}>Atualizar</Button></div>
      <label className="block text-sm font-medium">Filtrar por status<select value={status} onChange={e => setStatus(e.target.value)} className="ml-3 rounded-lg border p-2"><option value="">Todos</option>{Array.from(new Set(rdms.map(r => r.status))).sort().map(s => <option key={s}>{s}</option>)}</select></label>
      {loading && <p role="status">Consultando RDMs no Jira…</p>}
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{['RDM', 'Resumo', 'Tipo', 'Status', 'Classificação', 'Criada em', 'Ações'].map(h => <th scope="col" key={h} className="p-4 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rdms.filter(r => !status || r.status === status).map(r => <tr key={r.key} className="border-t"><td className="p-4"><a className="font-medium text-brand-600 underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.key}</a></td><td className="p-4 min-w-64">{r.summary}</td><td className="p-4">{r.type}</td><td className="p-4">{r.status}</td><td className="p-4">{r.classification}</td><td className="p-4 whitespace-nowrap">{new Date(r.created).toLocaleString('pt-BR')}</td><td className="p-4"><Button variant="outline" onClick={e => { triggerRef.current = e.currentTarget; setSelected(r); }}>Ver</Button></td></tr>)}{!loading && !error && rdms.filter(r => !status || r.status === status).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">{connected ? 'Nenhuma RDM encontrada para este filtro.' : 'Integre sua conta Jira no perfil.'}</td></tr>}</tbody></table></div>
      <p className="text-xs text-gray-500">Atualizar e F5 consultam o Jira novamente. Novas RDMs aparecem após a indexação no Jira. Em caso de erro, os últimos dados exibidos são mantidos.</p>
    </>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" aria-labelledby="rdm-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Tab') { const links = e.currentTarget.querySelectorAll<HTMLElement>('a,button'); const first = links[0], last = links[links.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }}><h2 id="rdm-title" className="text-xl font-bold">{selected.key} — {selected.summary}</h2><dl className="my-4 grid grid-cols-2 gap-3 text-sm">{[['Tipo',selected.type],['Status',selected.status],['Classificação',selected.classification],['Criada em',new Date(selected.created).toLocaleString('pt-BR')]].map(([k,v]) => <div key={k}><dt className="text-gray-500">{k}</dt><dd>{v}</dd></div>)}</dl><p className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4">{selected.description === '—' ? 'Sem descrição.' : selected.description}</p><div className="mt-6 flex gap-3"><a href={selected.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-500 px-4 py-2 text-white">Ver no Jira</a><Button ref={closeRef} variant="outline" onClick={() => setSelected(null)}>Fechar</Button></div></div></div>}
  </section>;
}
