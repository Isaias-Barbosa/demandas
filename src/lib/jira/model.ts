export interface JiraConfig {
  site: string; email: string; project: string; issueTypes: string;
  classificationField: string;
}
export interface Rdm {
  key: string; summary: string; type: string; status: string;
  classification: string; created: string; description: string; url: string;
}
export const defaultConfig: JiraConfig = { site: '', email: '', project: '', issueTypes: 'RDM', classificationField: '' };
export function bucket(status: string) {
  const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/cancel/.test(s)) return 'Cancelados';
  if (/aprov|approved/.test(s)) return 'Aprovadas';
  if (/execu|andamento|in progress/.test(s)) return 'Em Execução';
  if (/aguard|criada|created|abert|open|pend|fechar rpi|preencher\s+rpi/.test(s)) return 'Aguardando';
  return 'Outros';
}
