const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const XLSX = require('xlsx');
const js = ts.transpileModule(fs.readFileSync('src/lib/jira/excel.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(require, mod, mod.exports);
const { rdmWorkbook, RDM_EXPORT_FIELDS } = mod.exports;
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
