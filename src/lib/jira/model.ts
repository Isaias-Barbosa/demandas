export interface JiraConfig {
  site: string; email: string; project: string; issueTypes: string;
  classificationField: string; spaceField: string;
}
export interface Rdm {
  key: string; summary: string; type: string; status: string;
  assignee?: string; reporter?: string; classification: string; created: string; description: string; url: string;
}
export interface JiraCard {
  key: string; summary: string; type: string; status: string;
  space: string; project: string; reporter?: string; created: string; description: string; url: string;
}
export const defaultConfig: JiraConfig = {
  site: '', email: '', project: '', issueTypes: 'RDM', classificationField: '', spaceField: 'customfield_10072',
};
export function bucket(status: string) {
  const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (/cancel/.test(s)) return 'Cancelados';
  if (/aprov|approved|^executad[ao] com sucesso$|^executad[ao] parcialmente$/.test(s)) return 'Aprovadas';
  if (/execu|andamento|in progress/.test(s)) return 'Em Execução';
  if (/aguard|criada|created|abert|open|pend|fechar rpi|preencher\s+rpi/.test(s)) return 'Aguardando';
  return 'Outros';
}
