import * as XLSX from 'xlsx';
import type { Rdm } from './model';
export const RDM_EXPORT_FIELDS = [
  { id: 'key', label: 'RDM', width: 18 },
  { id: 'summary', label: 'Resumo', width: 60 },
  { id: 'type', label: 'Tipo', width: 28 },
  { id: 'status', label: 'Status', width: 24 },
  { id: 'classification', label: 'Classificação', width: 24 },
  { id: 'created', label: 'Criada em', width: 22 },
  { id: 'url', label: 'Link no Jira', width: 60 },
] as const;
export type RdmExportField = typeof RDM_EXPORT_FIELDS[number]['id'];
export function rdmWorkbook(rdms: Rdm[], selected: RdmExportField[]) {
  const fields = RDM_EXPORT_FIELDS.filter(f => selected.includes(f.id));
  if (!fields.length) throw new Error('Selecione pelo menos uma coluna.');
  const sheet = XLSX.utils.aoa_to_sheet([
    fields.map(f => f.label),
    ...rdms.map(r => fields.map(f => {
      if (f.id !== 'created') return r[f.id];
      const date = new Date(r.created);
      return Number.isNaN(date.getTime()) ? r.created : date;
    })),
  ], { dateNF: 'dd/mm/yyyy hh:mm', cellDates: true });
  sheet['!cols'] = fields.map(f => ({ wch: f.width }));
  sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rdms.length, c: fields.length - 1 }) };
  rdms.forEach((rdm, index) => {
    fields.forEach((field, column) => {
      if (field.id === 'key' || field.id === 'url') sheet[XLSX.utils.encode_cell({ r: index + 1, c: column })].l = { Target: rdm.url, Tooltip: 'Ver no Jira' };
    });
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'RDMs');
  return workbook;
}
