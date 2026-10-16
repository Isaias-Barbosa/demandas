'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { defaultConfig, JiraConfig } from '@/lib/jira/model';
export default function PerfilPage() {
  const router = useRouter();
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [config, setConfig] = useState<JiraConfig>(defaultConfig), [token, setToken] = useState('');
  const [connected, setConnected] = useState(false), [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { (async () => { try {
    const { data: { user } } = await createClient().auth.getUser();
    setName(user?.user_metadata?.name || ''); setEmail(user?.email || '');
    const response = await fetch('/api/jira/config', { cache: 'no-store' }), data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (data.config) setConfig(data.config);
    setConnected(data.connected); setDisplayName(data.displayName || '');
  } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar perfil.'); } finally { setLoading(false); } })(); }, []);
  async function saveProfile(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const { error } = await createClient().auth.updateUser({ data: { name: name.trim() } }); if (error) throw error; setMessage('Perfil atualizado.'); router.refresh(); } catch { setError('Não foi possível atualizar seu nome.'); } finally { setBusy(false); } }
  async function integration(method: 'PUT' | 'DELETE') {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/jira/config', { method, headers: { 'Content-Type': 'application/json' }, ...(method === 'PUT' ? { body: JSON.stringify({ config, token }) } : {}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setConnected(data.connected); setDisplayName(data.displayName || ''); setToken('');
      if (method === 'DELETE') setConfig(defaultConfig);
      setMessage(method === 'PUT' ? 'Jira conectado e credenciais validadas.' : 'Integração removida.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha na integração.'); } finally { setBusy(false); }
  }
  if (loading) return <p role="status">Carregando perfil…</p>;
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-bold">Meu perfil</h1>{error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-700">{message}</p>}
    <form onSubmit={saveProfile} className="space-y-4 rounded-xl border bg-white p-6"><h2 className="text-lg font-semibold">Dados do usuário</h2><Input id="name" label="Nome" value={name} maxLength={120} required onChange={e => setName(e.target.value)} /><Input id="account-email" label="E-mail da conta" value={email} disabled /><Button type="submit" disabled={busy}>Salvar perfil</Button></form>
    <form onSubmit={e => { e.preventDefault(); integration('PUT'); }} className="space-y-4 rounded-xl border bg-white p-6"><h2 className="text-lg font-semibold">Integração com Jira Cloud</h2><p className="text-sm text-gray-500">{connected ? `Conectado como ${displayName}.` : 'Conecte sua conta corporativa com e-mail e API token Atlassian.'} Sua senha corporativa não é solicitada.</p>
    {([['site','URL do Jira','https://suaempresa.atlassian.net'],['email','E-mail corporativo do Jira','voce@empresa.com'],['project','Chave do projeto (opcional)','Ex.: MUD'],['issueTypes','Tipos de issue que representam RDMs','RDM, Mudança emergencial, Mudança normal'],['classificationField','Campo de classificação (opcional)','Ex.: customfield_10042']] as const).map(([field,label,placeholder]) => <Input key={field} id={field} label={label} placeholder={placeholder} type={field === 'email' ? 'email' : field === 'site' ? 'url' : 'text'} required={['site','email','issueTypes'].includes(field)} value={config[field]} onChange={e => setConfig({ ...config, [field]: e.target.value })} />)}
    <p className="text-xs text-gray-500">Separe os tipos por vírgula, com os nomes exatos do Jira. Sem projeto, consulta todos os projetos permitidos. Peça ao administrador o ID do campo de classificação; sem ele, a coluna exibe “—”.</p>
    <Input id="jira-token" label={connected ? 'Novo API token (deixe vazio para manter o atual)' : 'API token'} type="password" autoComplete="new-password" value={token} required={!connected} onChange={e => setToken(e.target.value)} />
    <p className="text-sm text-gray-500"><a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">Criar API token na Atlassian</a>. Use um token sem escopos para este fluxo de Jira Cloud. O token é criptografado no servidor e nunca é devolvido ao navegador. Ao trocar URL ou e-mail, informe o token novamente.</p>
    <div className="flex flex-wrap gap-3"><Button type="submit" loading={busy}>Validar e salvar integração</Button>{connected && <Button type="button" variant="destructive" disabled={busy} onClick={() => integration('DELETE')}>Desconectar Jira</Button>}</div></form></div>;
}
