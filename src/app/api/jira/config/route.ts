import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt, encrypt, jira, JiraError, validateConfig } from '@/lib/jira/server';
export const dynamic = 'force-dynamic';
export async function GET() { return handle('GET'); }
export async function PUT(request: NextRequest) { return handle('PUT', request); }
export async function DELETE(request: NextRequest) { return handle('DELETE', request); }
async function handle(method: string, request?: NextRequest) {
  try {
    if (request && request.headers.get('origin') !== request.nextUrl.origin) throw new JiraError('Origem inválida.', 403);
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new JiraError('Entre novamente na sua conta.', 401);
    if (method === 'DELETE') {
      const { error } = await db.from('jira_integrations').delete().eq('user_id', user.id);
      if (error) throw new JiraError('Não foi possível desconectar.', 500);
      return NextResponse.json({ connected: false });
    }
    const { data: saved, error } = await db.from('jira_integrations').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw new JiraError('Integração indisponível. Verifique a migração do banco.', 503);
    if (method === 'GET') return NextResponse.json({ config: saved?.config ?? null, connected: !!saved, displayName: saved?.display_name }, { headers: { 'Cache-Control': 'no-store' } });
    const input = await request!.json();
    const config = validateConfig(input.config);
    const token = input.token || (saved && saved.config.site === config.site && saved.config.email === config.email ? decrypt(saved.token_encrypted) : '');
    if (typeof token !== 'string' || !token.trim() || token.length > 4096) throw new JiraError('Informe o API token.');
    const me = await jira(config, token, 'myself');
    if (!me.accountId || me.active === false) throw new JiraError('Conta Jira inválida.');
    const { error: writeError } = await db.from('jira_integrations').upsert({ user_id: user.id, config, token_encrypted: encrypt(token), display_name: me.displayName, updated_at: new Date().toISOString() });
    if (writeError) throw new JiraError('Não foi possível salvar a integração.', 500);
    return NextResponse.json({ connected: true, displayName: me.displayName });
  } catch (e) { return NextResponse.json({ error: e instanceof JiraError ? e.message : 'Não foi possível configurar o Jira.' }, { status: e instanceof JiraError ? e.status : 500 }); }
}
