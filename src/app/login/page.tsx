'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Mail,
  Lock,
  User,
  Loader2,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');

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
          setConfirmationEmail(email.trim());
        }
      }
    } catch (err: unknown) {
      const errorStatus =
        typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
      const isRateLimited =
        errorStatus === 429 ||
        (err instanceof Error && /rate limit|too many requests/i.test(err.message));
      const errorMessage = isRateLimited
        ? 'Muitas tentativas de cadastro ou envio de e-mail. Aguarde alguns minutos antes de tentar novamente. Se continuar, verifique os limites de e-mail em Authentication > Rate Limits no Supabase.'
        : err instanceof Error
          ? err.message
          : 'Ocorreu um erro inesperado. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Lado esquerdo - Apresentação */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-teal-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-teal-300/10" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <ClipboardList className="h-6 w-6" />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">RDMs</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-100">
              Painel de demandas
            </span>
          </span>
        </div>

        <div className="relative z-10 max-w-lg space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Suas mudanças, organizadas em um só painel.
          </h1>
          <p className="text-lg leading-relaxed text-brand-50/90">
            Conecte seu Jira, acompanhe indicadores e exporte relatórios sem perder nenhuma linha.
          </p>

          <div className="grid gap-3 pt-2">
            {[
              { icon: ClipboardList, text: 'RDMs atribuídas, acompanhadas e relatadas por você' },
              { icon: BarChart3, text: 'Indicadores claros para acompanhar cada etapa' },
              { icon: FileSpreadsheet, text: 'Exportação em Excel pronta para compartilhar' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4 text-teal-200" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-brand-100/70">
          © {new Date().getFullYear()} RDMs · Dashboard de demandas
        </p>
      </div>

      {/* Lado direito - Autenticação */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-card-hover sm:p-10">
          {confirmationEmail ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Conta cadastrada com sucesso!
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  Por favor, acesse seu e-mail cadastrado para confirmar o cadastro.
                </p>
                <p className="flex items-center justify-center gap-2 break-all pt-2 font-medium text-brand-600">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  {confirmationEmail}
                </p>
                <p className="text-xs text-slate-500">
                  Se a mensagem não aparecer, confira também a pasta de spam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmationEmail('');
                  setMode('login');
                }}
                className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col items-center text-center lg:hidden">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-card">
                  <LayoutDashboard className="h-6 w-6" />
                </span>
                <h1 className="text-2xl font-bold text-slate-900">RDMs</h1>
                <p className="mt-1 text-sm text-slate-500">Painel de demandas</p>
              </div>

              <div className="text-center lg:text-left">
                <p className="page-eyebrow">Bem-vindo</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {mode === 'login'
                    ? 'Preencha suas credenciais para acessar o painel'
                    : 'Cadastre-se para começar a acompanhar suas RDMs'}
                </p>
              </div>

              <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  aria-pressed={mode === 'login'}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    mode === 'login'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  aria-pressed={mode === 'signup'}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Criar conta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="name" className="field-label">Nome completo</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required={mode === 'signup'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="field-control pl-9"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="field-label">E-mail</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="field-control pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="field-label">Senha</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="field-control pl-9"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processando…</span>
                    </>
                  ) : mode === 'login' ? (
                    'Entrar no sistema'
                  ) : (
                    'Criar minha conta'
                  )}
                </button>
              </form>

              <p className="pt-6 text-center text-xs text-slate-500">
                {mode === 'login' ? (
                  <>
                    Ainda não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Cadastre-se aqui
                    </button>
                  </>
                ) : (
                  <>
                    Já possui uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-semibold text-brand-600 hover:underline"
                    >
                      Faça login
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
