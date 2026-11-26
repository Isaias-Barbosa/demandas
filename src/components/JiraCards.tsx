'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bug,
  CalendarDays,
  ExternalLink,
  FolderKanban,
  Inbox,
  LayoutGrid,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { JiraCard } from '@/lib/jira/model';

interface CardsSnapshot {
  cards: JiraCard[];
  loading: boolean;
  connected: boolean;
  error: string;
}

function statusVariant(status: string): BadgeProps['variant'] {
  const s = status.toLocaleLowerCase('pt-BR');
  if (/homolog/.test(s)) return 'warning';
  if (/revis/.test(s)) return 'info';
  if (/aprov|conclu/.test(s)) return 'success';
  if (/cancel/.test(s)) return 'danger';
  return 'default';
}

export function JiraCards() {
  const [cards, setCards] = useState<JiraCard[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [space, setSpace] = useState('');
  const [selected, setSelected] = useState<JiraCard | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jira/cards', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha na consulta.');
      setCards(data.cards);
      setConnected(data.connected);
      setUpdated(data.updatedAt || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao consultar cards.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const options = useMemo(() => {
    const values = (key: 'status' | 'type' | 'space') =>
      Array.from(new Set(cards.map((c) => c[key]).filter((v) => v && v !== '—'))).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      );
    return { statuses: values('status'), types: values('type'), spaces: values('space') };
  }, [cards]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return cards.filter((c) => {
      if (status && c.status !== status) return false;
      if (type && c.type !== type) return false;
      if (space && c.space !== space) return false;
      if (!term) return true;
      return [c.key, c.summary, c.status, c.type, c.space, c.project]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [cards, status, type, space, search]);

  const count = (predicate: (c: JiraCard) => boolean) => cards.filter(predicate).length;
  const hasData = connected && !loading && !error;

  return (
    <section className="space-y-5" aria-label="Cards do Jira">
      {error && (
        <p role="alert" className="alert-error">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {error}{' '}
            <button className="font-semibold underline underline-offset-2" onClick={load} disabled={loading}>
              Tentar novamente
            </button>
          </span>
        </p>
      )}
      {!loading && !connected && !error && (
        <p className="alert-info">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
          Conecte sua conta Jira no{' '}
          <Link href="/perfil" className="font-semibold text-brand-600 underline underline-offset-2">
            perfil
          </Link>{' '}
          para consultar seus cards.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Cards que você relatou', value: cards.length, icon: LayoutGrid, tone: 'bg-brand-50 text-brand-600' },
          { label: 'Em Homologação', value: count((c) => /homolog/i.test(c.status)), icon: RefreshCw, tone: 'bg-amber-50 text-amber-600' },
          { label: 'Em Revisão', value: count((c) => /revis/i.test(c.status)), icon: Search, tone: 'bg-blue-50 text-blue-600' },
          { label: 'Bugs', value: count((c) => /bug/i.test(c.type)), icon: Bug, tone: 'bg-red-50 text-red-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {hasData ? value : '—'}
                </p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Cards por você</h2>
            {connected && (
              <Badge variant="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Conectado
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Todas as issues que você relatou no Jira, em qualquer projeto.
          </p>
        </div>
        <Button onClick={load} loading={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Atualizar
        </Button>
      </div>

      <div className="toolbar">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="card-search" className="field-label">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="card-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código, resumo, espaço…"
              className="field-control pl-9"
            />
          </div>
        </div>
        {([
          ['card-status', 'Status', status, setStatus, options.statuses, 'Todos os status'],
          ['card-type', 'Tipo', type, setType, options.types, 'Todos os tipos'],
          ['card-space', 'Espaço', space, setSpace, options.spaces, 'Todos os espaços'],
        ] as const).map(([id, label, value, onChange, opts, all]) => (
          <div key={id} className="w-full sm:w-48">
            <label htmlFor={id} className="field-label">{label}</label>
            <select
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="field-control"
            >
              <option value="">{all}</option>
              {opts.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        ))}
        <p role="status" className="pb-2 text-sm text-slate-500">
          {loading ? 'Consultando Jira…' : `${filtered.length} ${filtered.length === 1 ? 'card' : 'cards'}`}
        </p>
      </div>

      {loading && (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-brand-500" />
          Consultando cards no Jira…
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Card', 'Resumo', 'Tipo', 'Status', 'Espaço', 'Projeto', 'Relator', 'Criado em', 'Ações'].map((h) => (
                  <th scope="col" key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.key}>
                  <td>
                    <a className="key-pill" href={c.url} target="_blank" rel="noopener noreferrer">{c.key}</a>
                  </td>
                  <td className="min-w-[260px] max-w-[420px] font-medium text-slate-800">
                    <span className="line-clamp-2" title={c.summary}>{c.summary}</span>
                  </td>
                  <td>
                    <Badge variant={/bug/i.test(c.type) ? 'danger' : 'default'}>
                      {/bug/i.test(c.type) && <Bug className="h-3 w-3" />}
                      {c.type}
                    </Badge>
                  </td>
                  <td><Badge variant={statusVariant(c.status)}>{c.status}</Badge></td>
                  <td className="whitespace-nowrap font-medium text-brand-700">{c.space}</td>
                  <td className="whitespace-nowrap">{c.project}</td>
                  <td className="whitespace-nowrap">{c.reporter || '—'}</td>
                  <td className="whitespace-nowrap">{new Date(c.created).toLocaleString('pt-BR')}</td>
                  <td>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        triggerRef.current = e.currentTarget;
                        setSelected(c);
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
                    <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 font-medium text-slate-700">Nenhum card encontrado</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {connected ? 'Ajuste os filtros ou atualize a consulta.' : 'Integre sua conta Jira no perfil para começar.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="hint">
        {updated ? `Última consulta: ${new Date(updated).toLocaleString('pt-BR')}. ` : ''}
        O espaço vem do campo configurado no perfil. Atualizar consulta o Jira novamente; novos cards
        podem levar alguns minutos para aparecer por causa da indexação do Jira.
      </p>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-title"
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
                  <Badge variant={/bug/i.test(selected.type) ? 'danger' : 'default'}>{selected.type}</Badge>
                </div>
                <h2 id="card-title" className="text-xl font-bold tracking-tight text-slate-900">
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
                { icon: Tags, label: 'Espaço', value: selected.space },
                { icon: FolderKanban, label: 'Projeto', value: selected.project },
                { icon: UserRound, label: 'Relator', value: selected.reporter || '—' },
                { icon: CalendarDays, label: 'Criado em', value: new Date(selected.created).toLocaleString('pt-BR') },
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
