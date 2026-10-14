export type DemandaStatus = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Cancelada';
export type DemandaPrioridade = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Demanda {
  id: string;
  user_id: string;
  tipo: string; // 'corretivas' | 'evolutivas' | 'gdm-stis' | string
  titulo: string; // Demanda / Título principal
  descricao: string | null;
  gri: string | null;
  atividade: string | null;
  rdm_link: string | null;
  status: DemandaStatus;
  responsavel: string | null;
  prioridade: DemandaPrioridade;
  data_criacao: string; // Data
  data_conclusao: string | null;
  categoria: string | null;
  observacoes: string | null;
  dados: Record<string, any>; // Colunas e valores dinâmicos da planilha
  created_at: string;
  updated_at: string;
}

export interface DemandaInsert {
  tipo?: string;
  titulo: string;
  descricao?: string;
  gri?: string;
  atividade?: string;
  rdm_link?: string;
  status?: DemandaStatus;
  responsavel?: string;
  prioridade?: DemandaPrioridade;
  data_criacao?: string;
  data_conclusao?: string;
  categoria?: string;
  observacoes?: string;
  dados?: Record<string, any>;
}

export interface TipoDemanda {
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  colunas: string[];
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export const DEFAULT_TIPOS_DEMANDAS = [
  { slug: 'corretivas', nome: 'Corretivas' },
  { slug: 'evolutivas', nome: 'Evolutivas' },
  { slug: 'gdm-stis', nome: 'GDM STIs' },
];

export const STATUS_OPTIONS: DemandaStatus[] = ['Pendente', 'Em Andamento', 'Concluída', 'Cancelada'];
export const PRIORIDADE_OPTIONS: DemandaPrioridade[] = ['Baixa', 'Média', 'Alta', 'Urgente'];

export const STATUS_COLORS: Record<DemandaStatus, string> = {
  'Pendente': 'bg-yellow-100 text-yellow-800',
  'Em Andamento': 'bg-blue-100 text-blue-800',
  'Concluída': 'bg-green-100 text-green-800',
  'Cancelada': 'bg-red-100 text-red-800',
};

export const PRIORIDADE_COLORS: Record<DemandaPrioridade, string> = {
  'Baixa': 'bg-gray-100 text-gray-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-orange-100 text-orange-800',
  'Urgente': 'bg-red-100 text-red-800',
};
