import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { JiraConfig } from './model';
export class JiraError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function key() {
  const value = process.env.JIRA_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(value)) throw new JiraError('Configure JIRA_ENCRYPTION_KEY no servidor (64 caracteres hexadecimais).', 503);
  return Buffer.from(value, 'hex');
}
export function encrypt(token: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(b => b.toString('base64')).join('.');
}
export function decrypt(value: string) {
  const [iv, tag, body] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(body), cipher.final()]).toString('utf8');
}
export function validateConfig(input: JiraConfig): JiraConfig {
  if (!input || Object.values(input).some(v => typeof v !== 'string' || v.length > 2000)) throw new JiraError('Configuração inválida.');
  let url: URL;
  try { url = new URL(input.site); } catch { throw new JiraError('Informe uma URL válida do Jira Cloud.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.atlassian\.net$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new JiraError('Use https://suaempresa.atlassian.net, sem caminhos adicionais.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new JiraError('Informe o e-mail corporativo.');
  if (input.project && !/^[A-Z][A-Z0-9_]*$/i.test(input.project)) throw new JiraError('Chave de projeto inválida.');
  if (!input.issueTypes.trim()) throw new JiraError('Informe os tipos de issue que representam RDMs.');
  if (input.classificationField && !/^customfield_\d+$/.test(input.classificationField)) throw new JiraError('Classificação deve usar customfield_ seguido do número.');
  return { ...input, site: url.origin };
}
export async function jira(config: JiraConfig, token: string, path: string, body?: unknown) {
  // Revalidate persisted hosts before forwarding credentials.
  validateConfig({ ...config, site: config.site + '/' });
  let response: Response;
  try {
    response = await fetch(`${config.site}/rest/api/3/${path}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Basic ${Buffer.from(`${config.email}:${token}`).toString('base64')}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch { throw new JiraError('Não foi possível acessar o Jira. Tente novamente.', 502); }
  if (!response.ok) throw new JiraError(response.status === 401 ? 'E-mail ou API token inválido/expirado.' : response.status === 403 ? 'Sua conta não tem permissão para consultar o Jira.' : response.status === 429 ? 'Limite do Jira atingido. Aguarde e atualize novamente.' : 'Falha na consulta. Verifique projeto, tipos e campo de classificação.', response.status === 429 ? 429 : 502);
  return response.json();
}
export function quote(value: string) { return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
export function fieldText(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(fieldText).join(', ');
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (v.text) return String(v.text);
    if (v.value || v.name) return String(v.value || v.name);
    if (v.content) return fieldText(v.content);
  }
  return '—';
}
