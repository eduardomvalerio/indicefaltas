// src/models/product.model.ts

/** ------------------------------
 *  Planilha de VENDAS / ÍNDICE DE FALTAS (90 dias)
 *  (nomes de campos exatamente como vêm do Excel)
 *  ------------------------------ */
export interface SalesRecord {
  EAN?: string | number;
  Descrição?: string;
  'Quantidade Vendida'?: number;
  'Estoque atual'?: number;
  'Valor de venda líquida total'?: number;
  'Custo unitário'?: number;
  'Código interno'?: string | number;
}

/** ------------------------------
 *  Planilha de INVENTÁRIO (posição atual do estoque)
 *  ------------------------------ */
export interface InventoryRecord {
  'Código interno'?: string | number;
  EAN?: string | number;
  Descrição?: string;
  'Estoque atual'?: number;
  'Custo unitário'?: number; // opcional, usado para valorar estoque parado / excesso
}

/** ------------------------------
 *  Produto consolidado após o merge das duas planilhas
 *  ------------------------------ */
export interface ConsolidatedProduct {
  // chaves de identificação
  chave_merge: string;           // "EAN:<ean>" ou "COD:<codigoInterno>"
  EAN_consolidado: string;
  codigoInterno: string;
  descricaoConsolidada: string;

  // Vendas / receita (90 dias)
  quantidadeVendida90d: number;
  valorVendaLiquidaTotal: number;
  cmvPeriodo: number;            // custo unitário * quantidadeVendida90d
  lucroBrutoPeriodo: number;     // venda líquida - cmvPeriodo

  // Custos / estoque
  custoUnitario: number;         // origem: vendas (preferência) ou inventário
  estoqueAtualInventario: number | null;
  estoqueAtualVendas: number | null;
  estoqueAtualConsolidado: number; // preferir inventário quando houver; senão vendas

  // Curva e flags
  Curva_ABC: 'A' | 'B' | 'C' | 'SEM_GIRO';
  flag_falta: boolean;   // venda > 0 e estoque <= 0
  flag_parado: boolean;  // venda = 0 e estoque > 0

  // Cobertura de estoque e excesso
  diasEstoque?: number | null;       // cobertura em dias (por SKU)
  estoqueReguladorUnidades?: number; // alvo em unidades (ex.: demanda/dia * 45)
  excessoUnidades?: number;          // max(0, estoqueAtualConsolidado - regulador)
  excessoValor?: number;             // excessoUnidades * custo unitário real
  flag_excesso?: boolean;            // true quando excessoUnidades > 0
}

/** ------------------------------
 *  Resumo por curva (A, B, C, SEM_GIRO)
 *  ------------------------------ */
export interface CurvaResumo {
  curva: 'A' | 'B' | 'C' | 'SEM_GIRO';

  // Contagem de itens
  skus: number;
  skusParados: number;
  skusEmFalta: number;

  // Resultado 90 dias
  venda90d: number;
  cmv90d: number;
  lucroBruto90d: number;

  // Estoque parado (sem giro)
  estoqueParadoUnidades: number;
  estoqueParadoValor: number;

  // Excesso (sobre o regulador)
  excessoUnidades: number;
  excessoValor: number;

  // Cobertura média (itens com venda)
  diasEstoqueMedio: number;

  // % de falta por curva (receita em ruptura / receita total da curva * 100)
  faltaPercent: number;
}

/** ------------------------------
 *  Dados de resumo geral exibidos no dashboard
 *  ------------------------------ */
export interface SummaryData {
  // Bloco principal
  totalSKUs: number;
  skusComVenda: number;
  skusEmFalta: number;
  skusParados: number;
  indiceFaltas: number; // % do faturamento em itens com estoque <= 0

  // Estoque parado (sem giro)
  estoqueParadoUnidades: number;
  estoqueParadoValor: number;

  // Resultado financeiro 90 dias
  vendaTrimestre: number;
  vendaMediaMes: number;
  cmvTrimestre: number;
  cmvMediaMes: number;
  lucroBrutoTrimestre: number;
  margemBrutaPercent: number; // lucroBrutoTrimestre / vendaTrimestre
  lucroBrutoMediaMes: number;

  // Unidades
  unidadesVendidasTrimestre: number;
  unidadesVendidasMediaMes: number;

  // Estoque dos produtos com venda (valorado ao custo médio real)
  estoqueProdutosVendidosValor: number;
  estoqueProdutosVendidosUnidades: number;

  // Estoque regulador projetado (somatório dos reguladores por SKU com venda)
  estoqueReguladorValor: number;
  estoqueReguladorUnidades: number;

  // Indicadores gerais de estoque
  diasEstoqueMedioGeral: number;   // (Σ estoque / Σ vendas) * 90
  excessoUnidadesTotal: number;
  excessoValorTotal: number;

  // Quebra por curva
  curvas: CurvaResumo[];
}

/** ------------------------------
 *  Resultado completo da análise (para o dashboard)
 *  ------------------------------ */
export interface AnalysisResult {
  summary: SummaryData;
  consolidated: ConsolidatedProduct[];
  faltas: ConsolidatedProduct[];
  parados: ConsolidatedProduct[];
}