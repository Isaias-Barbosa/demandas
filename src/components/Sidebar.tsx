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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Demandas', href: '/demandas', icon: ClipboardList },
  { name: 'Nova Demanda', href: '/demandas/nova', icon: PlusCircle },
  { name: 'Importar Excel', href: '/importar', icon: Upload },
  { name: 'Exportar Excel', href: '/exportar', icon: Download },
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

  const checkIsActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    if (href === '/demandas') {
      return pathname === '/demandas' || (pathname.startsWith('/demandas/') && pathname !== '/demandas/nova');
    }
    return pathname === href;
  };

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
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = checkIsActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'sidebar-link-active' : 'sidebar-link'}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Rodapé do Sidebar */}
          <div className="border-t border-gray-100 pt-4 mt-6">
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-700">Sistema de Gestão</p>
              <p className="mt-0.5">Versão 1.0.0 • Supabase</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
