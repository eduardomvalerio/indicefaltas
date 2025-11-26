import { SummaryData } from './product.model';

// Corresponde à tabela 'clientes'
export interface Cliente {
  id: string;
  org_id: string;
  cnpj?: string;
  nome_fantasia: string;
  cidade?: string;
  uf?: string;
}

// Corresponde à tabela 'analise_runs'
export interface AnaliseRun {
  id: string;
  org_id: string;
  cliente_id: string;
  created_at: string;
  created_by: string;
  periodo_dias: number;
  algoritmo_versao: string;
  path_vendas?: string;
  path_inventario?: string;
  summary: SummaryData;
}

// Corresponde à tabela 'org_members'
export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'admin' | 'colaborador';
  created_at: string;
}
