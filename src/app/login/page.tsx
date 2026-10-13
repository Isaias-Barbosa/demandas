'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { LayoutDashboard, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      toast.error('Por favor, informe seu nome completo.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos.');
          }
          throw error;
        }

        toast.success('Login realizado com sucesso!');
        router.push('/dashboard');
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('Este e-mail já está cadastrado no sistema.');
          }
          throw error;
        }

        // Se houver sessão imediata, redireciona para o dashboard
        if (data.session) {
          toast.success('Conta criada com sucesso!');
          router.push('/dashboard');
          router.refresh();
        } else {
          toast.success('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
          setMode('login');
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ocorreu um erro inesperado. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      {/* Lado Esquerdo - Branding & Apresentação */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-500 via-brand-600 to-teal-700 p-12 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">Dashboard de Demandas</span>
              <p className="text-xs text-brand-100 font-medium">Gestão Estratégica & Operacional</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
            Controle total sobre todas as demandas da sua equipe.
          </h1>
          <p className="text-lg text-brand-100/90 leading-relaxed">
            Centralize solicitações, acompanhe prazos, gerencie prioridades e visualize indicadores em tempo real com exportação e importação integrada.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-4">
            <div className="flex items-center gap-3 text-sm text-brand-50">
              <CheckCircle2 className="h-5 w-5 text-teal-300 flex-shrink-0" />
              <span>Acompanhamento visual de status e métricas</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-50">
              <CheckCircle2 className="h-5 w-5 text-teal-300 flex-shrink-0" />
              <span>Importação e exportação ágil via planilhas Excel</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-50">
              <CheckCircle2 className="h-5 w-5 text-teal-300 flex-shrink-0" />
              <span>Histórico centralizado e seguro com Supabase</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-brand-200">
          &copy; {new Date().getFullYear()} Dashboard de Demandas. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado Direito - Formulário de Autenticação */}
      <div className="flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-gray-100">
          {/* Mobile Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white mb-3">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Demandas</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie suas demandas com eficiência</p>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'login'
                ? 'Preencha suas credenciais para acessar o painel'
                : 'Cadastre-se para começar a gerenciar suas demandas'}
            </p>
          </div>

          {/* Abas Alternadoras */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="name">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={mode === 'signup'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                E-mail
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : mode === 'login' ? (
                'Entrar no Sistema'
              ) : (
                'Criar Minha Conta'
              )}
            </button>
          </form>

          {/* Dica do Rodapé do Card */}
          <div className="text-center text-xs text-gray-500 pt-2">
            {mode === 'login' ? (
              <p>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-medium text-brand-500 hover:text-brand-600 underline"
                >
                  Cadastre-se aqui
                </button>
              </p>
            ) : (
              <p>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-medium text-brand-500 hover:text-brand-600 underline"
                >
                  Faça login
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
