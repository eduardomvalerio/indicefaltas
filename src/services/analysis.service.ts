// src/services/analysis.service.ts
import { Injectable } from '@angular/core';
import {
  SalesRecord,
  InventoryRecord,
  ConsolidatedProduct,
  AnalysisResult,
  SummaryData,
  CurvaResumo,
} from '../models/product.model';

type CurvaConfig = { A_min: number; B_min: number; C_min: number };
type CurvaKey = 'A' | 'B' | 'C' | 'SEM_GIRO';
type IntermediateProduct = Partial<ConsolidatedProduct> & {
  custoUnitarioVenda?: number;
  custoUnitarioInventario?: number;
};

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly PERIOD_DAYS = 90;

  private readonly ESTOQUE_MAX_DIAS: Record<CurvaKey, number> = {
    A: 15,
    B: 26,
    C: 46,
    SEM_GIRO: 0,
  };

  // Planilha: A (≥9) | B (3..8) | C (1..2) | 0 = SEM_GIRO
  private curvaConfig: CurvaConfig = { A_min: 9, B_min: 3, C_min: 1 };

  /** Classificação ABC idêntica à planilha */
  private classifyCurva(qtdVendida: number, cfg: CurvaConfig = this.curvaConfig): CurvaKey {
    if (qtdVendida <= 0) return 'SEM_GIRO';
    if (qtdVendida >= cfg.A_min) return 'A';   // ≥ 9
    if (qtdVendida >= cfg.B_min) return 'B';   // 3..8
    if (qtdVendida >= cfg.C_min) return 'C';   // 1..2
    return 'SEM_GIRO';
  }

  getCurvaConfig(): CurvaConfig { return { ...this.curvaConfig }; }

  setCurvaConfig(partial: Partial<CurvaConfig>): void {
    const next = { ...this.curvaConfig, ...partial };
    if (next.A_min <= 0 || next.B_min <= 0 || next.C_min < 0) {
      throw new Error('Limites da Curva ABC inválidos.');
    }
    if (!(next.A_min > next.B_min && next.B_min > next.C_min)) {
      throw new Error('Consistência dos limites violada: espere A_min > B_min > C_min.');
    }
    this.curvaConfig = next;
  }

  private readonly SALES_REQUIRED_COLS = [
    'EAN',
    'Descrição',
    'Quantidade Vendida',
    'Estoque atual',
    'Valor de venda líquida total',
    'Custo unitário',
  ];
  private readonly INVENTORY_REQUIRED_COLS = [
    'Código interno',
    'EAN',
    'Descrição',
    'Estoque atual',
    'Custo unitário',
  ];

  validateColumns(salesData: SalesRecord[], inventoryData: InventoryRecord[]): string | null {
    if (!salesData?.length) return 'A planilha de vendas está vazia ou não pôde ser lida.';
    if (!inventoryData?.length) return 'A planilha de inventário está vazia ou não pôde ser lida.';
    const salesHeader = Object.keys(salesData[0] ?? {});
    const inventoryHeader = Object.keys(inventoryData[0] ?? {});
    for (const col of this.SALES_REQUIRED_COLS)
      if (!salesHeader.includes(col)) return `Coluna obrigatória ausente na planilha de Vendas: '${col}'.`;
    for (const col of this.INVENTORY_REQUIRED_COLS)
      if (!inventoryHeader.includes(col)) return `Coluna obrigatória ausente na planilha de Inventário: '${col}'.`;
    return null;
  }

  private normalizeKey(value: string | number | undefined | null): string {
    return value !== undefined && value !== null ? String(value).trim() : '';
  }

  private createMergeKey(
    ean: string | number | undefined | null,
    internalCode: string | number | undefined | null
  ): string | null {
    const normEan = this.normalizeKey(ean);
    const normInternalCode = this.normalizeKey(internalCode);
    if (normEan) return `EAN:${normEan}`;
    if (normInternalCode) return `COD:${normInternalCode}`;
    return null;
  }

  private toNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(/\./g, '').replace(',', '.');
      const n = Number(cleaned);
      return isNaN(n) ? 0 : n;
    }
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  processData(salesData: SalesRecord[], inventoryData: InventoryRecord[]): AnalysisResult {
    const consolidatedMap = new Map<string, IntermediateProduct>();

    // Índice de faltas (R$) — base exclusivamente nas VENDAS
    let receitaEmRuptura_salesOnly = 0;
    let receitaTotal_salesOnly = 0;

    // --- VENDAS
    salesData.forEach((row) => {
      const key = this.createMergeKey(row.EAN, row['Código interno']);
      if (!key) return;

      const existente = consolidatedMap.get(key) || {};
      const qtdVendida = this.toNumber(row['Quantidade Vendida']);
      const vendaLiquida = this.toNumber(row['Valor de venda líquida total']);
      const estoqueAtualVendas = this.toNumber(row['Estoque atual']);
      const custoUnitarioVenda = this.toNumber(row['Custo unitário']);

      receitaTotal_salesOnly += vendaLiquida;
      if (qtdVendida > 0 && estoqueAtualVendas <= 0) receitaEmRuptura_salesOnly += vendaLiquida;

      consolidatedMap.set(key, {
        ...existente,
        chave_merge: key,
        EAN_consolidado: this.normalizeKey(row.EAN),
        codigoInterno: this.normalizeKey(row['Código interno']) || existente.codigoInterno,
        descricaoConsolidada: row.Descrição || existente.descricaoConsolidada || 'N/A',
        quantidadeVendida90d: (existente.quantidadeVendida90d ?? 0) + qtdVendida,
        valorVendaLiquidaTotal: (existente.valorVendaLiquidaTotal ?? 0) + vendaLiquida,
        custoUnitarioVenda,
        estoqueAtualVendas,
      });
    });

    // --- INVENTÁRIO
    inventoryData.forEach((row) => {
      const key = this.createMergeKey(row.EAN, row['Código interno']);
      if (!key) return;

      const existente = consolidatedMap.get(key) || {};
      const estoqueInventario = this.toNumber(row['Estoque atual']);
      const custoInventario = this.toNumber(row['Custo unitário']);

      consolidatedMap.set(key, {
        ...existente,
        chave_merge: key,
        EAN_consolidado: existente.EAN_consolidado || this.normalizeKey(row.EAN),
        codigoInterno: existente.codigoInterno || this.normalizeKey(row['Código interno']),
        descricaoConsolidada: existente.descricaoConsolidada || row.Descrição || 'N/A',
        estoqueAtualInventario: estoqueInventario,
        custoUnitarioInventario: custoInventario,
      });
    });

    const consolidatedList: ConsolidatedProduct[] =
      Array.from(consolidatedMap.values()).map((p) => this.calculateMetrics(p));

    const summary = this.calculateSummary(consolidatedList, {
      receitaEmRuptura_salesOnly,
      receitaTotal_salesOnly,
    });

    return {
      summary,
      consolidated: consolidatedList,
      faltas: consolidatedList.filter((p) => p.flag_falta),
      parados: consolidatedList.filter((p) => p.flag_parado),
    };
  }

  /** Custo preferido para regulador (prioriza custo da planilha de vendas). */
  private getCustoPreferidoParaRegulador(p: IntermediateProduct): number {
    const v = this.toNumber(p.custoUnitarioVenda);
    const i = this.toNumber(p.custoUnitarioInventario);
    const base = this.toNumber(p.custoUnitario);
    if (v > 0) return v;
    if (i > 0) return i;
    return base;
  }

  private calculateMetrics(product: IntermediateProduct): ConsolidatedProduct {
    const p: IntermediateProduct = { ...product };

    p.quantidadeVendida90d = this.toNumber(p.quantidadeVendida90d);
    p.valorVendaLiquidaTotal = this.toNumber(p.valorVendaLiquidaTotal);
    p.estoqueAtualInventario = this.toNumber(p.estoqueAtualInventario ?? 0);
    p.estoqueAtualVendas = this.toNumber(p.estoqueAtualVendas ?? 0);
    p.custoUnitarioVenda = this.toNumber(p.custoUnitarioVenda);
    p.custoUnitarioInventario = this.toNumber(p.custoUnitarioInventario);

    const custoPreferido = this.getCustoPreferidoParaRegulador(p);
    p.custoUnitario = custoPreferido;

    p.estoqueAtualConsolidado =
      p.estoqueAtualInventario && p.estoqueAtualInventario !== 0 ? p.estoqueAtualInventario : p.estoqueAtualVendas || 0;

    const qtdVendida = p.quantidadeVendida90d ?? 0;
    p.Curva_ABC = this.classifyCurva(qtdVendida);

    const estoqueAtual = p.estoqueAtualConsolidado ?? 0;
    p.flag_falta = qtdVendida > 0 && estoqueAtual <= 0;
    p.flag_parado = qtdVendida === 0 && estoqueAtual > 0;

    const custoUnitarioParaCMV = custoPreferido || 0;
    p.cmvPeriodo = custoUnitarioParaCMV * (qtdVendida ?? 0);
    p.lucroBrutoPeriodo = (p.valorVendaLiquidaTotal ?? 0) - (p.cmvPeriodo ?? 0);

    // Regulador: ARRED((qtd/90) * EstoqueMaxDias; 0)
    const consumoDia = this.PERIOD_DAYS > 0 ? qtdVendida / this.PERIOD_DAYS : 0;
    const estoqueMaxDias = this.ESTOQUE_MAX_DIAS[p.Curva_ABC as CurvaKey] ?? 0;
    const reguladorUn = consumoDia > 0 ? Math.round(consumoDia * estoqueMaxDias) : 0;
    p.estoqueReguladorUnidades = reguladorUn;

    const excessoUn = Math.max(0, estoqueAtual - reguladorUn);
    p.excessoUnidades = excessoUn;
    p.excessoValor = excessoUn * custoPreferido;
    p.flag_excesso = excessoUn > 0;

    return p as ConsolidatedProduct;
  }

  private calculateSummary(
    products: ConsolidatedProduct[],
    opts: { receitaEmRuptura_salesOnly: number; receitaTotal_salesOnly: number }
  ): SummaryData {
    const { receitaEmRuptura_salesOnly, receitaTotal_salesOnly } = opts;

    const totalSKUs = products.length;
    const skusComVenda = products.filter((p) => (p.quantidadeVendida90d ?? 0) > 0).length;
    const skusParados = products.filter((p) => p.flag_parado).length;

    // Índice de faltas (R$) geral – igual à planilha
    const indiceFaltas = receitaTotal_salesOnly > 0
      ? (receitaEmRuptura_salesOnly / receitaTotal_salesOnly) * 100
      : 0;

    const estoqueParado = products
      .filter((p) => p.flag_parado)
      .reduce((acc, p) => {
        const un = p.estoqueAtualConsolidado ?? 0;
        const custo = this.getCustoPreferidoParaRegulador(p) || 0;
        acc.unidades += un;
        acc.valor += un * custo;
        return acc;
      }, { unidades: 0, valor: 0 });

    let vendaTrimestre = 0;
    let cmvTrimestre = 0;
    let unidadesVendidasTrimestre = 0;

    let estoqueProdutosVendidosUnidades = 0;
    let estoqueProdutosVendidosValor = 0;

    let estoqueReguladorUnidadesTotal = 0;
    let estoqueReguladorValorTotal = 0;

    let somaEstoque_itensComVenda = 0;
    let somaVendasUn_itensComVenda = 0;

    // Curvas (com campo extra opcional faltaPercent)
    type LocalCurva = CurvaResumo & { faltaPercent?: number };
    const curvaBase = (): LocalCurva => ({
      curva: 'A',
      skus: 0,
      skusParados: 0,
      skusEmFalta: 0,
      venda90d: 0,
      cmv90d: 0,
      lucroBruto90d: 0,
      estoqueParadoUnidades: 0,
      estoqueParadoValor: 0,
      excessoUnidades: 0,
      excessoValor: 0,
      diasEstoqueMedio: 0,
      faltaPercent: 0,
    });

    const curvasMap: Record<CurvaKey, LocalCurva> = {
      A: { ...curvaBase(), curva: 'A' },
      B: { ...curvaBase(), curva: 'B' },
      C: { ...curvaBase(), curva: 'C' },
      SEM_GIRO: { ...curvaBase(), curva: 'SEM_GIRO' },
    };

    // Receita total e em ruptura por curva (base VENDAS)
    const receitaPorCurva: Record<CurvaKey, { total: number; ruptura: number }> = {
      A: { total: 0, ruptura: 0 },
      B: { total: 0, ruptura: 0 },
      C: { total: 0, ruptura: 0 },
      SEM_GIRO: { total: 0, ruptura: 0 },
    };

    const diasEstoqueSomasPorCurva: Record<CurvaKey, { estoque: number; vendas: number }> = {
      A: { estoque: 0, vendas: 0 },
      B: { estoque: 0, vendas: 0 },
      C: { estoque: 0, vendas: 0 },
      SEM_GIRO: { estoque: 0, vendas: 0 },
    };

    let skusEmFaltaCount = 0;

    for (const p of products) {
      const curva = p.Curva_ABC as CurvaKey;
      const c = curvasMap[curva];

      const venda = p.valorVendaLiquidaTotal ?? 0;
      const cmv = p.cmvPeriodo ?? 0;
      const qtd = p.quantidadeVendida90d ?? 0;
      const estoqueAtual = p.estoqueAtualConsolidado ?? 0;
      const estoqueVendas = p.estoqueAtualVendas ?? 0;

      vendaTrimestre += venda;
      cmvTrimestre += cmv;
      unidadesVendidasTrimestre += qtd;

      if (qtd > 0) {
        const custoReal = cmv > 0 ? cmv / qtd : this.getCustoPreferidoParaRegulador(p);
        estoqueProdutosVendidosUnidades += estoqueAtual;
        estoqueProdutosVendidosValor += estoqueAtual * custoReal;

        somaEstoque_itensComVenda += estoqueAtual;
        somaVendasUn_itensComVenda += qtd;

        const custoVendaPref = this.getCustoPreferidoParaRegulador(p);
        estoqueReguladorUnidadesTotal += p.estoqueReguladorUnidades ?? 0;
        estoqueReguladorValorTotal += (p.estoqueReguladorUnidades ?? 0) * custoVendaPref;

        // bases para % por curva
        receitaPorCurva[curva].total += venda;
        if (estoqueVendas <= 0) receitaPorCurva[curva].ruptura += venda;
      }

      c.skus++;
      c.venda90d += venda;
      c.cmv90d += cmv;
      c.lucroBruto90d += venda - cmv;

      if (p.flag_parado) {
        c.skusParados++;
        const custoParado = this.getCustoPreferidoParaRegulador(p);
        c.estoqueParadoUnidades += estoqueAtual;
        c.estoqueParadoValor += estoqueAtual * custoParado;
      }
      if (p.flag_falta) { c.skusEmFalta++; skusEmFaltaCount++; }

      c.excessoUnidades += p.excessoUnidades ?? 0;
      c.excessoValor += p.excessoValor ?? 0;

      if (qtd > 0) {
        diasEstoqueSomasPorCurva[curva].estoque += estoqueAtual;
        diasEstoqueSomasPorCurva[curva].vendas += qtd;
      }
    }

    const diasEstoqueMedioGeral =
      somaVendasUn_itensComVenda > 0 ? (somaEstoque_itensComVenda / somaVendasUn_itensComVenda) * this.PERIOD_DAYS : 0;

    (Object.keys(curvasMap) as CurvaKey[]).forEach((k) => {
      const { estoque, vendas } = diasEstoqueSomasPorCurva[k];
      curvasMap[k].diasEstoqueMedio = vendas > 0 ? (estoque / vendas) * this.PERIOD_DAYS : 0;
    });

    // Denominador GERAL do % por curva = faturamento total 90d (igual à planilha $L$18)
    const totReceitaGeral =
      (Object.values(receitaPorCurva) as Array<{ total: number; ruptura: number }>)
        .reduce((s, r) => s + r.total, 0);

    // % Faltas (R$) por curva sobre o TOTAL GERAL
    (Object.keys(curvasMap) as CurvaKey[]).forEach((k) => {
      const { ruptura } = receitaPorCurva[k];
      (curvasMap[k] as any).faltaPercent = totReceitaGeral > 0 ? (ruptura / totReceitaGeral) * 100 : 0;
    });

    const vendaMediaMes = vendaTrimestre / 3;
    const cmvMediaMes = cmvTrimestre / 3;
    const lucroBrutoTrimestre = vendaTrimestre - cmvTrimestre;
    const lucroBrutoMediaMes = lucroBrutoTrimestre / 3;
    const margemBrutaPercent = vendaTrimestre > 0 ? lucroBrutoTrimestre / vendaTrimestre : 0;
    const unidadesVendidasMediaMes = unidadesVendidasTrimestre / 3;

    // Exporta também um resumo opcional, usando o mesmo denominador geral
    const resumoFaltasPorCurva: Record<CurvaKey, number> = {
      A: totReceitaGeral > 0 ? (receitaPorCurva.A.ruptura / totReceitaGeral) * 100 : 0,
      B: totReceitaGeral > 0 ? (receitaPorCurva.B.ruptura / totReceitaGeral) * 100 : 0,
      C: totReceitaGeral > 0 ? (receitaPorCurva.C.ruptura / totReceitaGeral) * 100 : 0,
      SEM_GIRO: totReceitaGeral > 0 ? (receitaPorCurva.SEM_GIRO.ruptura / totReceitaGeral) * 100 : 0,
    };

    return {
      totalSKUs,
      skusComVenda,
      skusEmFalta: skusEmFaltaCount,
      skusParados,
      indiceFaltas,
      estoqueParadoUnidades: estoqueParado.unidades,
      estoqueParadoValor: estoqueParado.valor,
      vendaTrimestre,
      vendaMediaMes,
      cmvTrimestre,
      cmvMediaMes,
      lucroBrutoTrimestre,
      margemBrutaPercent,
      lucroBrutoMediaMes,
      unidadesVendidasTrimestre,
      unidadesVendidasMediaMes,
      estoqueProdutosVendidosValor,
      estoqueProdutosVendidosUnidades,
      estoqueReguladorValor: estoqueReguladorValorTotal,
      estoqueReguladorUnidades: estoqueReguladorUnidadesTotal,
      diasEstoqueMedioGeral,
      excessoUnidadesTotal: products.reduce((s, p) => s + (p.excessoUnidades ?? 0), 0),
      excessoValorTotal: products.reduce((s, p) => s + (p.excessoValor ?? 0), 0),
      curvas: Object.values(curvasMap) as CurvaResumo[],
      // @ts-ignore (campo opcional para debug/validação)
      resumoFaltasPorCurva,
    } as SummaryData;
  }
}
