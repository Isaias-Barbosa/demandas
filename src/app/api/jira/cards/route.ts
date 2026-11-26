import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decrypt, fieldText, jira, JiraError } from '@/lib/jira/server';
import type { JiraCard, JiraConfig } from '@/lib/jira/model';

export const dynamic = 'force-dynamic';

// Cards destinam-se a issues que não são RDMs (chaves como RDM-123).
const excludedKeyPrefix = 'RDM';

export async function GET() {
  try {
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new JiraError('Entre novamente na sua conta.', 401);

    const { data, error } = await db.from('jira_integrations').select('*').eq('user_id', user.id).maybeSingle();
    if (error) throw new JiraError('Integração indisponível. Verifique a migração do banco.', 503);
    if (!data) return NextResponse.json({ connected: false, cards: [] });

    const config = data.config as JiraConfig;
    const token = decrypt(data.token_encrypted);
    const spaceField = config.spaceField || 'customfield_10072';
    const jql = 'reporter = currentUser() ORDER BY created DESC';
    const cards: JiraCard[] = [];
    let nextPageToken: string | undefined;
    const seen = new Set<string>();

    do {
      const result = await jira(config, token, 'search/jql', {
        jql,
        maxResults: 100,
        fields: ['summary', 'issuetype', 'status', 'project', 'reporter', 'created', 'description', spaceField],
        ...(nextPageToken ? { nextPageToken } : {}),
      });
      if (!Array.isArray(result.issues)) throw new JiraError('Resposta inesperada do Jira.', 502);
      for (const issue of result.issues) {
        const key = String(issue.key ?? '').trim();
        if (key.toUpperCase().startsWith(excludedKeyPrefix)) continue;
        const f = issue.fields;
        cards.push({
          key,
          summary: f.summary,
          type: f.issuetype?.name || '—',
          status: f.status?.name || '—',
          space: fieldText(f[spaceField]),
          project: f.project?.name || f.project?.key || '—',
          reporter: f.reporter?.displayName || '—',
          created: f.created,
          description: fieldText(f.description),
          url: `${config.site}/browse/${encodeURIComponent(key)}`,
        });
      }
      nextPageToken = result.isLast ? undefined : result.nextPageToken;
      if (nextPageToken && seen.has(nextPageToken)) throw new JiraError('Paginação inválida do Jira. Tente novamente.', 502);
      if (nextPageToken) seen.add(nextPageToken);
    } while (nextPageToken);

    return NextResponse.json(
      { connected: true, cards, updatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof JiraError ? e.message : 'Não foi possível consultar os cards.' },
      { status: e instanceof JiraError ? e.status : 500 }
    );
  }
}
