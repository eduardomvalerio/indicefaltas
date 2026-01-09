export type ActionPlanSeverity = 'high' | 'medium' | 'low';

export interface ActionPlanItem {
  id: string;
  descricao: string;
  curva: string;
  estoque_atual: number;
  qtd_vendida_90d: number;
  venda_90d: number;
  lucro_bruto_90d: number;
  excesso_valor: number;
  cobertura_dias: number | null;
}

export interface ActionPlanSection {
  key: string;
  title: string;
  severity: ActionPlanSeverity;
  count: number;
  total_value: number;
  value_label: string;
  actions: string[];
  items: ActionPlanItem[];
}

export interface ActionPlan {
  generated_at: string;
  lead_time_days: number;
  sections: ActionPlanSection[];
}
