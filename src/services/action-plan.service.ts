import { Injectable } from '@angular/core';
import { ConsolidatedProduct } from '../models/product.model';
import { ActionPlan, ActionPlanItem, ActionPlanSection } from '../models/action-plan.model';

type PlanItem = ActionPlanItem & {
  flag_falta: boolean;
  flag_parado: boolean;
  flag_excesso: boolean;
  capital_parado: number;
};

@Injectable({ providedIn: 'root' })
export class ActionPlanService {
  private readonly PERIOD_DAYS = 90;
  private readonly MAX_ITEMS = 10;

  buildPlan(products: ConsolidatedProduct[], leadTimeDays = 1): ActionPlan {
    const leadTime = Math.max(1, Math.round(leadTimeDays || 1));
    const items = products.map((p) => this.toPlanItem(p));

    const stockout = items.filter((p) => p.flag_falta);
    const risk = items.filter(
      (p) =>
        !p.flag_falta &&
        p.qtd_vendida_90d > 0 &&
        p.cobertura_dias !== null &&
        p.cobertura_dias <= leadTime
    );
    const excess = items.filter((p) => p.flag_excesso);
    const stagnant = items.filter((p) => p.flag_parado);

    const sections: ActionPlanSection[] = [];

    if (stockout.length > 0) {
      sections.push(
        this.buildSection({
          key: 'stockout',
          title: 'Ruptura atual (reposição imediata)',
          severity: 'high',
          items: stockout,
          valueLabel: 'em vendas em risco',
          valueField: 'venda_90d',
          sortField: 'venda_90d',
          actions: [
            'Repor imediatamente os SKUs em ruptura.',
            'Priorizar curvas A e B com maior impacto em vendas.',
          ],
        })
      );
    }

    if (risk.length > 0) {
      sections.push(
        this.buildSection({
          key: 'risk',
          title: `Ruptura iminente (≤ ${leadTime} dia${leadTime === 1 ? '' : 's'})`,
          severity: 'medium',
          items: risk,
          valueLabel: 'em vendas em risco no curto prazo',
          valueField: 'venda_90d',
          sortField: 'lucro_bruto_90d',
          actions: [
            'Programar reposição preventiva dentro do lead time.',
            'Ajustar pedidos para proteger itens com maior margem.',
          ],
        })
      );
    }

    if (excess.length > 0) {
      sections.push(
        this.buildSection({
          key: 'excess',
          title: 'Excesso de estoque (capital imobilizado)',
          severity: 'low',
          items: excess,
          valueLabel: 'em excesso de estoque',
          valueField: 'excesso_valor',
          sortField: 'excesso_valor',
          actions: [
            'Reduzir compras e acelerar o giro (promoção/transferência).',
            'Revisar o regulador para a curva e a demanda real.',
          ],
        })
      );
    }

    if (stagnant.length > 0) {
      sections.push(
        this.buildSection({
          key: 'stagnant',
          title: 'Itens parados (sem giro)',
          severity: 'low',
          items: stagnant,
          valueLabel: 'em capital parado',
          valueField: 'capital_parado',
          sortField: 'capital_parado',
          actions: [
            'Avaliar desova/transferência e revisão do mix.',
            'Suspender compras até recuperar o giro.',
          ],
        })
      );
    }

    return {
      generated_at: new Date().toISOString(),
      lead_time_days: leadTime,
      sections,
    };
  }

  private toPlanItem(product: ConsolidatedProduct): PlanItem {
    const estoqueAtual =
      product.estoqueAtualConsolidado ??
      product.estoqueAtualInventario ??
      product.estoqueAtualVendas ??
      0;
    const qtdVendida = product.quantidadeVendida90d ?? 0;
    const consumoDia = this.PERIOD_DAYS > 0 ? qtdVendida / this.PERIOD_DAYS : 0;
    const cobertura = consumoDia > 0 ? estoqueAtual / consumoDia : null;
    const custo = product.custoUnitario ?? 0;

    return {
      id: product.chave_merge || product.EAN_consolidado || product.codigoInterno || product.descricaoConsolidada,
      descricao: product.descricaoConsolidada,
      curva: product.Curva_ABC,
      estoque_atual: estoqueAtual,
      qtd_vendida_90d: qtdVendida,
      venda_90d: product.valorVendaLiquidaTotal ?? 0,
      lucro_bruto_90d: product.lucroBrutoPeriodo ?? 0,
      excesso_valor: product.excessoValor ?? 0,
      cobertura_dias: cobertura,
      flag_falta: !!product.flag_falta,
      flag_parado: !!product.flag_parado,
      flag_excesso: !!product.flag_excesso,
      capital_parado: estoqueAtual * custo,
    };
  }

  private buildSection(params: {
    key: string;
    title: string;
    severity: ActionPlanSection['severity'];
    items: PlanItem[];
    valueLabel: string;
    valueField: keyof PlanItem;
    sortField: keyof PlanItem;
    actions: string[];
  }): ActionPlanSection {
    const totalValue = params.items.reduce((acc, item) => acc + (item[params.valueField] as number), 0);
    const sortedItems = [...params.items]
      .sort((a, b) => (b[params.sortField] as number) - (a[params.sortField] as number))
      .slice(0, this.MAX_ITEMS)
      .map(({ flag_falta, flag_parado, flag_excesso, capital_parado, ...rest }) => rest);

    return {
      key: params.key,
      title: params.title,
      severity: params.severity,
      count: params.items.length,
      total_value: totalValue,
      value_label: params.valueLabel,
      actions: params.actions,
      items: sortedItems,
    };
  }
}
