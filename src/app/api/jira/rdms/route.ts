import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt, fieldText, jira, JiraError, quote } from '@/lib/jira/server';
import type { Rdm, JiraConfig } from '@/lib/jira/model';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new JiraError('Entre novamente na sua conta.', 401);
    const { data, error } = await db.from('jira_integrations').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw new JiraError('Integração indisponível. Verifique a migração do banco.', 503);
    if (!data) return NextResponse.json({ connected: false, rdms: [] });
    const config = data.config as JiraConfig, token = decrypt(data.token_encrypted);
    const types = config.issueTypes.split(',').map(s => s.trim()).filter(Boolean);
    const jql = `(assignee = currentUser() OR watcher = currentUser()) AND issuetype in (${types.map(quote).join(',')})${config.project ? ` AND project = ${quote(config.project)}` : ''} ORDER BY created DESC`;
    const rdms: Rdm[] = []; let nextPageToken: string | undefined;
    const seen = new Set<string>();
    do {
      const result = await jira(config, token, 'search/jql', { jql, maxResults: 100, fields: ['summary','issuetype','status','created','description', ...(config.classificationField ? [config.classificationField] : [])], ...(nextPageToken ? { nextPageToken } : {}) });
      if (!Array.isArray(result.issues)) throw new JiraError('Resposta inesperada do Jira.', 502);
      for (const issue of result.issues) {
        const f = issue.fields;
        rdms.push({ key: issue.key, summary: f.summary, type: f.issuetype?.name || '—', status: f.status?.name || '—', classification: fieldText(f[config.classificationField]), created: f.created, description: fieldText(f.description), url: `${config.site}/browse/${encodeURIComponent(issue.key)}` });
      }
      nextPageToken = result.isLast ? undefined : result.nextPageToken;
      if (nextPageToken && seen.has(nextPageToken)) throw new JiraError('Paginação inválida do Jira. Tente novamente.', 502);
      if (nextPageToken) seen.add(nextPageToken);
    } while (nextPageToken);
    return NextResponse.json({ connected: true, rdms, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return NextResponse.json({ error: e instanceof JiraError ? e.message : 'Não foi possível consultar as RDMs.' }, { status: e instanceof JiraError ? e.status : 500 }); }
}
