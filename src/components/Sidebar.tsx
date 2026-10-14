'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Upload,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_TIPOS_DEMANDAS, TipoDemanda } from '@/lib/types';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [demandasOpen, setDemandasOpen] = useState(true);
  const [tipos, setTipos] = useState<{ slug: string; nome: string }[]>(DEFAULT_TIPOS_DEMANDAS);

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

  // Buscar tipos adicionais criados no Supabase
  useEffect(() => {
    async function fetchCustomTipos() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('tipos_demandas').select('slug, nome');
        if (data && data.length > 0) {
          // Unir os padrão com os customizados sem duplicar slug
          const map = new Map<string, string>();
          DEFAULT_TIPOS_DEMANDAS.forEach((t) => map.set(t.slug, t.nome));
          data.forEach((t: { slug: string; nome: string }) => map.set(t.slug, t.nome));
          setTipos(Array.from(map.entries()).map(([slug, nome]) => ({ slug, nome })));
        }
      } catch {
        // Usa default
      }
    }
    fetchCustomTipos();
  }, [pathname]);

  // Fechar sidebar ao navegar em telas mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isDemandasActive = pathname.startsWith('/demandas') && pathname !== '/demandas/nova';

  return (
    <>
      {/* Overlay para dispositivos móveis */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Barra lateral */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Cabeçalho do Sidebar com Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-xl text-brand-500 tracking-tight"
          >
            <span className="text-2xl" role="img" aria-label="gráfico">
              📊
            </span>
            <span className="bg-gradient-to-r from-brand-500 to-teal-700 bg-clip-text text-transparent">
              Demandas
            </span>
          </Link>

          {/* Botão de fechar (apenas mobile) */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Itens de navegação */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-5">
          <nav className="space-y-1.5">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className={pathname === '/dashboard' ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              <span>Dashboard</span>
            </Link>

            {/* Menu Dropdown de Demandas */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setDemandasOpen((prev) => !prev)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isDemandasActive
                    ? 'text-brand-600 bg-brand-50/60 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 flex-shrink-0" />
                  <span>Demandas</span>
                </div>
                {demandasOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 transition-transform" />
                )}
              </button>

              {/* Sub-itens com as planilhas */}
              {demandasOpen && (
                <div className="pl-6 space-y-1 pt-0.5">
                  {tipos.map((tipo) => {
                    const href = `/demandas/${tipo.slug}`;
                    const isActive = pathname === href || (pathname.startsWith(href + '/') && pathname !== '/demandas/nova');

                    return (
                      <Link
                        key={tipo.slug}
                        href={href}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-brand-500 text-white font-semibold shadow-xs'
                            : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'
                        )}
                      >
                        <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{tipo.nome}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nova Demanda */}
            <Link
              href="/demandas/nova"
              className={pathname === '/demandas/nova' ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <PlusCircle className="h-5 w-5 flex-shrink-0" />
              <span>Nova Demanda</span>
            </Link>

            {/* Importar Excel */}
            <Link
              href="/importar"
              className={pathname === '/importar' ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Upload className="h-5 w-5 flex-shrink-0" />
              <span>Importar Excel</span>
            </Link>

            {/* Exportar Excel */}
            <Link
              href="/exportar"
              className={pathname === '/exportar' ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Download className="h-5 w-5 flex-shrink-0" />
              <span>Exportar Excel</span>
            </Link>
          </nav>

          {/* Rodapé do Sidebar */}
          <div className="border-t border-gray-100 pt-4 mt-6">
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-700">Sistema Multi-Planilhas</p>
              <p className="mt-0.5">Corretivas • Evolutivas • GDM STIs</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
