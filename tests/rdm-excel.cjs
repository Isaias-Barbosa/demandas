const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const XLSX = require('xlsx');
function load(file, overrides = {}) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)((name) => overrides[name] || require(name), mod, mod.exports);
  return mod.exports;
}
const model = load('src/lib/jira/model.ts');
const { rdmWorkbook, RDM_EXPORT_FIELDS, filterRdms } = load('src/lib/jira/excel.ts', { './model': model });
const rdm = { key: 'RDM-42', summary: '=1+1', type: 'Mudança Normal', status: 'Criada', assignee: 'Ana', reporter: 'Você', classification: 'Evolutiva', created: '2026-10-16T12:00:00Z', url: 'https://example.atlassian.net/browse/RDM-42', description: 'Private description' };
test('XLSX roundtrip preserves headers, dates, links and literal summaries', () => {
  const book = rdmWorkbook([rdm], RDM_EXPORT_FIELDS.map(f => f.id));
  const data = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const sheet = XLSX.read(data, { type: 'buffer', cellDates: true }).Sheets.RDMs;
  assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0], ['RDM','Resumo','Responsável','Relator','Tipo','Status','Classificação','Criada em','Link no Jira']);
  assert.equal(sheet.A2.l.Target, rdm.url);
  assert.equal(sheet.I2.l.Target, rdm.url);
  assert.equal(sheet.C2.v, rdm.assignee);
  assert.equal(sheet.D2.v, rdm.reporter);
  assert.equal(sheet.H2.t, 'd');
  // O XLSX serializa datas com precisão de milissegundo; aceita diferença de 1 ms.
  assert.ok(Math.abs(sheet.H2.v.getTime() - Date.parse(rdm.created)) <= 1);
  assert.equal(sheet.B2.t, 's'); assert.equal(sheet.B2.v, '=1+1'); assert.equal(sheet.B2.f, undefined);
  assert.equal(sheet['!autofilter'].ref, 'A1:I2');
});
test('exports only selected columns in table order, excludes description', () => {
  const sheet = rdmWorkbook([rdm], ['url','key']).Sheets.RDMs;
  assert.deepEqual(XLSX.utils.sheet_to_json(sheet, { header: 1 }), [['RDM','Link no Jira'], ['RDM-42',rdm.url]]);
  assert.throws(() => rdmWorkbook([rdm], []), /coluna/);
});
test('filters RDMs by status groups and optional specific status', () => {
  const rows = [
    rdm,
    { ...rdm, key: 'RDM-43', status: 'Aprovada' },
    { ...rdm, key: 'RDM-44', status: 'Cancelado' },
    { ...rdm, key: 'RDM-45', status: 'Concluída' },
  ];
  const keys = (groups, status = '') => filterRdms(rows, groups, status).map((r) => r.key);
  assert.deepEqual(keys([]), ['RDM-42', 'RDM-43', 'RDM-44', 'RDM-45']);
  assert.deepEqual(keys(['Aguardando']), ['RDM-42']);
  assert.deepEqual(keys(['Aprovadas', 'Cancelados']), ['RDM-43', 'RDM-44']);
  assert.deepEqual(keys(['Aguardando'], 'Criada'), ['RDM-42']);
  assert.deepEqual(keys(['Aguardando'], 'Aprovada'), []);
  assert.deepEqual(keys([], 'Cancelado'), ['RDM-44']);
  assert.ok(model.STATUS_GROUPS.includes(model.bucket('Concluída')));
});
