'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Menu, LogOut, Loader2, ChevronRight } from 'lucide-react';

interface HeaderProps {
  user: User;
}

const pages: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão geral das suas RDMs' },
  '/rdms': { title: 'RDMs', subtitle: 'Todas as mudanças do seu Jira' },
  '/perfil': { title: 'Meu perfil', subtitle: 'Dados da conta e integração com Jira' },
  '/exportar': { title: 'Exportar Excel', subtitle: 'Gere uma planilha com as suas RDMs' },
};

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const page = pages[pathname] ?? { title: 'Dashboard de RDMs', subtitle: 'Gestão de demandas' };

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success('Você saiu da sua conta.');
      router.push('/login');
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao sair da conta. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userName =
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex h-[72px] flex-shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 lg:hidden"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex">
            <span>Demandas</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-brand-600">{page.title}</span>
          </div>
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {page.title}
          </h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{page.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <Link
          href="/perfil"
          aria-label="Meu perfil"
          className="group flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-slate-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-teal-600 text-sm font-bold text-white shadow-sm ring-2 ring-white">
            {userInitial}
          </span>
          <span className="hidden flex-col text-left sm:flex">
            <span className="text-sm font-semibold leading-tight text-slate-800">
              {userName}
            </span>
            <span className="max-w-[180px] truncate text-xs text-slate-500">
              {user.email}
            </span>
          </span>
        </Link>

        <div className="h-7 w-px bg-slate-200" aria-hidden="true" />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sair do sistema"
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
