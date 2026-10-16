const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
function load(file, overrides = {}) {
  const source = fs.readFileSync(file, 'utf8').replace("import 'server-only';", '');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} }; new Function('require','module','exports',js)((name) => overrides[name] || require(name), mod, mod.exports); return mod.exports;
}
const server = load('src/lib/jira/server.ts'), model = load('src/lib/jira/model.ts');
const config = { ...model.defaultConfig, site: 'https://example.atlassian.net', email: 'user@example.com' };
test('validates Cloud tenant and blocks credential forwarding to other hosts', () => {
  assert.equal(server.validateConfig(config).site, config.site);
  for (const site of ['http://example.atlassian.net','https://localhost','https://example.atlassian.net.evil.com','https://user:pass@example.atlassian.net','https://example.atlassian.net/path','https://example.atlassian.net:444','https://127.0.0.1']) assert.throws(() => server.validateConfig({ ...config, site }));
});
test('encrypts with authenticated random IV and rejects tampering', () => {
  process.env.JIRA_ENCRYPTION_KEY = 'ab'.repeat(32);
  const value = server.encrypt('secret-token');
  assert.equal(server.decrypt(value), 'secret-token');
  assert.notEqual(value, server.encrypt('secret-token'));
  const parts = value.split('.'); parts[1] = Buffer.alloc(16).toString('base64');
  assert.throws(() => server.decrypt(parts.join('.')));
});
test('JQL escapes literals and classification supports select fields', () => {
  assert.equal(server.quote('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(server.fieldText([{ value: 'Crítica' }, { name: 'Normal' }]), 'Crítica, Normal');
  assert.equal(server.fieldText(null), '—');
});
test('buckets preserve workflow examples', () => {
  for (const status of ['Aguardando RPI', 'Criada', 'Fechar Rpi', 'Preencher RPI', 'PREENCHER RPI']) assert.equal(model.bucket(status), 'Aguardando');
  assert.equal(model.bucket('Em Execução'), 'Em Execução');
  assert.equal(model.bucket('Aprovada'), 'Aprovadas');
  assert.equal(model.bucket('Cancelado'), 'Cancelados');
  assert.equal(model.bucket('Concluída'), 'Outros');
});
test('Jira requests disable caching/redirects and translate auth errors', async () => {
  const original = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(url, config.site + '/rest/api/3/myself');
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    return new Response('{}', { status: 401 });
  };
  try { await assert.rejects(server.jira(config, 'token', 'myself'), /inválido/); } finally { global.fetch = original; }
});
function route(db, jira) {
  return load('src/app/api/jira/rdms/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/supabase/server': { createClient: () => db },
    '@/lib/jira/server': { ...server, decrypt: () => 'token', jira },
  });
}
test('RDM route enforces authenticated ownership, assignee/watcher scope and complete pagination', async () => {
  let calls = 0;
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: name => { assert.equal(name, 'jira_integrations'); return {
      select: () => ({ eq: (field, id) => {
        assert.equal(field, 'user_id'); assert.equal(id, 'user-1');
        return { maybeSingle: async () => ({ data: { config: { ...config, project: 'RDM' }, token_encrypted: 'encrypted' } }) };
      } }),
    }; },
  };
  const api = route(db, async (c, token, path, body) => {
    assert.equal(path, 'search/jql'); assert.equal(body.jql, '(assignee = currentUser() OR watcher = currentUser()) AND issuetype in ("RDM") AND project = "RDM" ORDER BY created DESC');
    assert.match(body.jql, /issuetype in \("RDM"\)/);
    calls++;
    if (calls === 2) assert.equal(body.nextPageToken, 'page2');
    return { issues: [{ key: `RDM-${calls}`, fields: { summary: 'Change', status: { name: 'Criada' }, issuetype: { name: 'RDM' }, created: '2026-10-16' } }], nextPageToken: calls === 1 ? 'page2' : undefined, isLast: calls === 2 };
  });
  const response = await api.GET(), data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.rdms.length, 2);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(JSON.stringify(data).includes('encrypted'), false);
});
test('unauthenticated route never calls Jira or reads integrations', async () => {
  const api = route({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => assert.fail('unexpected DB read') }, () => assert.fail('unexpected Jira request'));
  assert.equal((await api.GET()).status, 401);
});
