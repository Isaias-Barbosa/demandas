'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { defaultConfig, type JiraConfig } from '@/lib/jira/model';
import { AlertCircle, CheckCircle2, ExternalLink, PlugZap, UserRound } from 'lucide-react';

export default function PerfilPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [config, setConfig] = useState<JiraConfig>(defaultConfig);
  const [token, setToken] = useState('');
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await createClient().auth.getUser();
        setName(user?.user_metadata?.name || '');
        setEmail(user?.email || '');
        const response = await fetch('/api/jira/config', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (data.config) setConfig(data.config);
        setConnected(data.connected);
        setDisplayName(data.displayName || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao carregar perfil.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { error } = await createClient().auth.updateUser({ data: { name: name.trim() } });
      if (error) throw error;
      setMessage('Perfil atualizado.');
      router.refresh();
    } catch {
      setError('Não foi possível atualizar seu nome.');
    } finally {
      setBusy(false);
    }
  }

  async function integration(method: 'PUT' | 'DELETE') {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/jira/config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(method === 'PUT' ? { body: JSON.stringify({ config, token }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConnected(data.connected);
      setDisplayName(data.displayName || '');
      setToken('');
      if (method === 'DELETE') setConfig(defaultConfig);
      setMessage(method === 'PUT' ? 'Jira conectado e credenciais validadas.' : 'Integração removida.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na integração.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
        Carregando perfil…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="page-eyebrow">Conta</p>
        <h1 className="page-title">Meu perfil</h1>
        <p className="page-subtitle">Seus dados e a conexão com o Jira Cloud.</p>
      </div>

      {error && (
        <p role="alert" className="alert-error">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {message}
        </p>
      )}

      <Card>
        <CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-slate-100">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <UserRound className="h-[18px] w-[18px]" />
          </span>
          <div>
            <CardTitle>Dados do usuário</CardTitle>
            <CardDescription>Como seu nome aparece no painel.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={saveProfile} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="name" label="Nome" value={name} maxLength={120} required onChange={(e) => setName(e.target.value)} />
              <Input id="account-email" label="E-mail da conta" value={email} disabled />
            </div>
            <Button type="submit" disabled={busy}>Salvar perfil</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <PlugZap className="h-[18px] w-[18px]" />
            </span>
            <div>
              <CardTitle>Integração com Jira Cloud</CardTitle>
              <CardDescription>
                Conecte sua conta corporativa com e-mail e API token Atlassian. Sua senha corporativa não é solicitada.
              </CardDescription>
            </div>
          </div>
          {connected && (
            <Badge variant="success">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Conectado
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={(e) => { e.preventDefault(); integration('PUT'); }} className="space-y-5">
            {connected && (
              <p className="surface-soft p-3 text-sm text-slate-600">
                Conectado como <strong className="text-slate-800">{displayName}</strong>.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['site', 'URL do Jira', 'https://suaempresa.atlassian.net'],
                ['email', 'E-mail corporativo do Jira', 'voce@empresa.com'],
                ['project', 'Chave do projeto (opcional)', 'Ex.: MUD'],
                ['issueTypes', 'Tipos de issue que representam RDMs', 'RDM, Mudança emergencial, Mudança normal'],
                ['classificationField', 'Campo de classificação (opcional)', 'Ex.: customfield_10042'],
              ] as const).map(([field, label, placeholder]) => (
                <Input
                  key={field}
                  id={field}
                  label={label}
                  placeholder={placeholder}
                  type={field === 'email' ? 'email' : field === 'site' ? 'url' : 'text'}
                  required={['site', 'email', 'issueTypes'].includes(field)}
                  value={config[field]}
                  onChange={(e) => setConfig({ ...config, [field]: e.target.value })}
                />
              ))}
            </div>

            <p className="hint">
              Separe os tipos por vírgula, com os nomes exatos do Jira. Sem projeto, a consulta
              busca em todos os projetos permitidos. Peça ao administrador o ID do campo de
              classificação; sem ele, a coluna exibe “—”.
            </p>

            <div className="max-w-md">
              <Input
                id="jira-token"
                label={connected ? 'Novo API token (deixe vazio para manter o atual)' : 'API token'}
                type="password"
                autoComplete="new-password"
                value={token}
                required={!connected}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <p className="hint">
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
              >
                Criar API token na Atlassian
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              . Use um token sem escopos para este fluxo de Jira Cloud. O token é criptografado no
              servidor e nunca é devolvido ao navegador. Ao trocar URL ou e-mail, informe o token
              novamente.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" loading={busy}>Validar e salvar integração</Button>
              {connected && (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => integration('DELETE')}>
                  Desconectar Jira
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
