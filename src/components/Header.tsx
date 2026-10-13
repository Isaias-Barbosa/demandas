'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Menu, LogOut, Loader2 } from 'lucide-react';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/demandas/nova') return 'Nova Demanda';
    if (path.startsWith('/demandas')) return 'Demandas';
    if (path === '/importar') return 'Importar Excel';
    if (path === '/exportar') return 'Exportar Excel';
    return 'Dashboard de Demandas';
  };

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
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Lado Esquerdo: Menu mobile + Título da Página */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-6 w-6" />
        </button>

        <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Lado Direito: Informações do Usuário + Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Perfil do Usuário */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold text-sm ring-2 ring-brand-100 flex-shrink-0 shadow-sm">
            {userInitial}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-semibold text-gray-800 leading-tight">
              {userName}
            </span>
            <span className="text-xs text-gray-500 truncate max-w-[180px]">
              {user.email}
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Botão de Logout */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Sair do sistema"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
