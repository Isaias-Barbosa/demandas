'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
  RefreshCw,
  ClipboardList,
  CalendarDays,
  Layers3,
  Tags,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { bucket, type Rdm } from '@/lib/jira/model';

export interface JiraSnapshot {
  rdms: Rdm[];
  loading: boolean;
  connected: boolean;
  error: string;
}

const summaryCards = [
  { label: 'Minhas RDMs', icon: Layers3, tone: 'text-brand-600 bg-brand-50' },
  { label: 'Aprovadas', icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  { label: 'Aguardando', icon: Clock3, tone: 'text-amber-600 bg-amber-50' },
  { label: 'Em Execução', icon: RefreshCw, tone: 'text-blue-600 bg-blue-50' },
  { label: 'Cancelados', icon: XCircle, tone: 'text-red-600 bg-red-50' },
] as const;

function statusVariant(status: string): BadgeProps['variant'] {
  if (/falha/i.test(status)) return 'danger';
  const group = bucket(status);
  if (group === 'Aprovadas') return 'success';
  if (group === 'Aguardando') return 'warning';
  if (group === 'Em Execução') return 'info';
  if (group === 'Cancelados') return 'danger';
  return 'default';
}

export function JiraRdms({
  summaryOnly = false,
  onSnapshot,
}: {
  summaryOnly?: boolean;
  onSnapshot?: (snapshot: JiraSnapshot) => void;
}) {
  const [rdms, setRdms] = useState<Rdm[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Rdm | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jira/rdms', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na consulta.');
      setRdms(data.rdms);
      setConnected(data.connected);
      setUpdated(data.updatedAt || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar Jira.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onSnapshot?.({ rdms, loading, connected, error });
  }, [onSnapshot, rdms, loading, connected, error]);

  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      triggerRef.current?.focus();
    };
  }, [selected]);

  const statuses = useMemo(
    () => Array.from(new Set(rdms.map((r) => r.status))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [rdms]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return rdms.filter((r) => {
      if (status && r.status !== status) return false;
      if (!term) return true;
      return [r.key, r.summary, r.status, r.assignee, r.reporter, r.classification]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [rdms, status, search]);

  return (
    <section className="space-y-5" aria-label="RDMs do Jira">
      {error && (
        <div role="alert" className="alert-error">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {error}{' '}
            <button className="font-semibold underline underline-offset-2" onClick={load} disabled={loading}>
              Tentar novamente
            </button>
          </span>
        </div>
      )}

      {!loading && !connected && !error && (
        <div className="alert-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
          <span>
            Conecte sua conta Jira no{' '}
            <Link href="/perfil" className="font-semibold text-brand-600 underline underline-offset-2">
              perfil
            </Link>{' '}
            para consultar suas RDMs.
          </span>
        </div>
      )}

      {summaryOnly ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ label, icon: Icon, tone }, index) => (
            <Link key={label} href="/rdms" className="stat-card group">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                    {loading || error || !connected
                      ? '—'
                      : index === 0
                        ? rdms.length
                        : rdms.filter((r) => bucket(r.status) === label).length}
                  </p>
                </div>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-[11px] font-medium text-brand-500 group-hover:underline">
                Ver detalhes →
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">RDMs do Jira</h2>
                {connected && (
                  <Badge variant="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Conectado
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Mudanças atribuídas a você, acompanhadas ou relatadas por você.
              </p>
            </div>
            <Button onClick={load} loading={loading}>
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              Atualizar
            </Button>
          </div>

          <div className="toolbar">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="rdm-search" className="field-label">
                Buscar
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="rdm-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Código, resumo, relator…"
                  className="field-control pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="rdm-status" className="field-label">
                Status
              </label>
              <select
                id="rdm-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="field-control"
              >
                <option value="">Todos os status</option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <p role="status" className="pb-2 text-sm text-slate-500">
              {loading
                ? 'Consultando Jira…'
                : `${filtered.length} ${filtered.length === 1 ? 'RDM' : 'RDMs'}`}
            </p>
          </div>

          {loading && (
            <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
              Consultando RDMs no Jira…
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {['RDM', 'Resumo', 'Relator', 'Responsável', 'Tipo', 'Status', 'Classificação', 'Criada em', 'Ações'].map((h) => (
                      <th scope="col" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.key}>
                      <td>
                        <a className="key-pill" href={r.url} target="_blank" rel="noopener noreferrer">
                          {r.key}
                        </a>
                      </td>
                      <td className="min-w-[260px] max-w-[420px] font-medium text-slate-800">
                        <span className="line-clamp-2" title={r.summary}>{r.summary}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {r.reporter || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-slate-600">{r.assignee || '—'}</td>
                      <td className="whitespace-nowrap">{r.type}</td>
                      <td>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap">{r.classification}</td>
                      <td className="whitespace-nowrap">
                        {new Date(r.created).toLocaleString('pt-BR')}
                      </td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            triggerRef.current = e.currentTarget;
                            setSelected(r);
                          }}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loading && !error && filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-14 text-center">
                        <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-3 font-medium text-slate-700">Nenhuma RDM por aqui</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {connected
                            ? 'Ajuste os filtros ou atualize a consulta.'
                            : 'Integre sua conta Jira no perfil para começar.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="hint">
            Os botões Atualizar e F5 consultam o Jira novamente. Novas RDMs podem levar alguns
            minutos para aparecer devido à indexação do Jira.
          </p>
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rdm-title"
            className="surface max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                const links = e.currentTarget.querySelectorAll<HTMLElement>('a,button');
                const first = links[0];
                const last = links[links.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="key-pill">{selected.key}</span>
                  <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
                </div>
                <h2 id="rdm-title" className="text-xl font-bold tracking-tight text-slate-900">
                  {selected.summary}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar detalhes"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { icon: Layers3, label: 'Tipo', value: selected.type },
                { icon: UserRound, label: 'Relator', value: selected.reporter || '—' },
                { icon: UsersRound, label: 'Responsável', value: selected.assignee || '—' },
                { icon: Tags, label: 'Classificação', value: selected.classification },
                { icon: CalendarDays, label: 'Criada em', value: new Date(selected.created).toLocaleString('pt-BR') },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="surface-soft p-3">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <p className="field-label">Descrição</p>
              <p className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200">
                {selected.description === '—' ? 'Sem descrição.' : selected.description}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-600"
              >
                Ver no Jira
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button ref={closeRef} variant="outline" onClick={() => setSelected(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
