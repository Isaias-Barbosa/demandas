'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Download,
  X,
  UserRound,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rdms', label: 'RDMs', icon: ClipboardList },
  { href: '/perfil', label: 'Meu perfil', icon: UserRound },
  { href: '/exportar', label: 'Exportar Excel', icon: Download },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('toggle-sidebar', handleToggle);
    window.addEventListener('close-sidebar', handleClose);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
      window.removeEventListener('close-sidebar', handleClose);
    };
  }, []);

  // Fechar sidebar ao navegar em telas mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 ease-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        <div className="flex h-[72px] flex-shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3"
            aria-label="Ir para o dashboard"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-card transition-transform group-hover:scale-105">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight text-brand-600">RDMs</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Painel de demandas
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-6">
          <nav aria-label="Navegação principal">
            <p className="section-label mb-3 px-3">Menu</p>
            <div className="space-y-1.5">
              {navigation.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('nav-item', active && 'nav-item-active')}
                  >
                    <span className="icon-tile">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-inset ring-brand-100">
              <p className="text-sm font-semibold text-brand-700">Tudo em um só lugar</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Acompanhe suas RDMs direto do Jira, com indicadores e exportação pronta.
              </p>
              <Link
                href="/perfil"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Configurar integração
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="px-2 text-[11px] text-slate-400">Demandas · Jira Cloud</p>
          </div>
        </div>
      </aside>
    </>
  );
}
