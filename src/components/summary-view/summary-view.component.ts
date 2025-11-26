


import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryData, CurvaResumo } from '../../models/product.model';

@Component({
  selector: 'app-summary-view',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="space-y-8">
  <!-- BLOCO 0 – Cabeçalho -->
  <div>
    <h2 class="text-lg font-semibold text-slate-800">Resumo dos Indicadores</h2>
    <p class="text-sm text-slate-500">
      Visão geral da saúde do seu estoque e do resultado de vendas no período analisado (90 dias).
    </p>
  </div>

  <!-- BLOCO 1 – Indicadores principais -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="bg-white p-4 rounded-lg shadow-sm">
      <p class="text-xs font-medium text-slate-500 uppercase">TOTAL DE SKUS</p>
      <p class="mt-2 text-2xl font-bold text-slate-900">{{ summaryData()?.totalSKUs | number:'1.0-0' }}</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
      <p class="text-xs font-medium text-emerald-700 uppercase">SKUS COM VENDA (90D)</p>
      <p class="mt-2 text-2xl font-bold text-emerald-700">{{ summaryData()?.skusComVenda | number:'1.0-0' }}</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm border border-red-100">
      <p class="text-xs font-medium text-red-700 uppercase">SKUS EM FALTA</p>
      <p class="mt-2 text-2xl font-bold text-red-700">{{ summaryData()?.skusEmFalta | number:'1.0-0' }}</p>
      <p class="mt-1 text-[11px] text-red-600">Ruptura considerando estoque &le; 0 e houve venda no período.</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm border border-red-100">
      <p class="text-xs font-medium text-red-700 uppercase">ÍNDICE DE FALTAS (R$)</p>
      <p class="mt-2 text-2xl font-bold text-red-700">
        {{ (summaryData()?.indiceFaltas ?? 0) / 100 | percent:'1.2-2' }}
      </p>
      <p class="mt-1 text-[11px] text-slate-500">% do faturamento dos últimos 90 dias em itens com estoque &le; 0.</p>
    </div>
  </div>

  <!-- BLOCO 2 – Itens parados -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
      <p class="text-xs font-medium text-amber-700 uppercase">SKUS PARADOS (SEM GIRO 90D)</p>
      <p class="mt-2 text-2xl font-bold text-amber-800">{{ summaryData()?.skusParados | number:'1.0-0' }}</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
      <p class="text-xs font-medium text-amber-700 uppercase">ESTOQUE PARADO (UNIDADES)</p>
      <p class="mt-2 text-2xl font-bold text-amber-800">{{ summaryData()?.estoqueParadoUnidades | number:'1.0-0' }}</p>
    </div>

    <div class="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
      <p class="text-xs font-medium text-amber-700 uppercase">VALOR DO ESTOQUE PARADO (CUSTO)</p>
      <p class="mt-2 text-2xl font-bold text-amber-800">
        {{ summaryData() ? formatCurrency(summaryData()!.estoqueParadoValor) : formatCurrency(0) }}
      </p>
      <p class="mt-1 text-[11px] text-slate-500">Dinheiro imobilizado em produtos sem venda nos últimos 90 dias.</p>
    </div>
  </div>

  <!-- BLOCO 3 – Resultado 90 dias -->
  <div class="bg-white p-5 rounded-lg shadow-sm border border-slate-100">
    <h3 class="text-sm font-semibold text-slate-800 mb-3">Resultado dos últimos 90 dias</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
      <div>
        <p class="font-medium">VENDA TRIMESTRE</p>
        <p>{{ summaryData() ? formatCurrency(summaryData()!.vendaTrimestre) : formatCurrency(0) }}</p>
        <p class="mt-1 text-xs text-slate-500">Venda Média/Mês:
          {{ summaryData() ? formatCurrency(summaryData()!.vendaMediaMes) : formatCurrency(0) }}
        </p>
      </div>

      <div>
        <p class="font-medium">CMV TRIMESTRE</p>
        <p>
          {{ summaryData() ? formatCurrency(summaryData()!.cmvTrimestre) : formatCurrency(0) }}
          <span class="text-xs text-slate-500">
            ({{ (summaryData()?.cmvTrimestre ?? 0) / (summaryData()?.vendaTrimestre || 1) | percent:'1.1-1' }})
          </span>
        </p>
        <p class="mt-1 text-xs text-slate-500">CMV Médio/Mês:
          {{ summaryData() ? formatCurrency(summaryData()!.cmvMediaMes) : formatCurrency(0) }}
        </p>
      </div>

      <div>
        <p class="font-medium">LUCRO BRUTO TRIMESTRE</p>
        <p>
          {{ summaryData() ? formatCurrency(summaryData()!.lucroBrutoTrimestre) : formatCurrency(0) }}
          <span class="text-xs text-emerald-700">
            {{ (summaryData()?.margemBrutaPercent ?? 0) | percent:'1.1-1' }}
          </span>
        </p>
        <p class="mt-1 text-xs text-slate-500">Lucro Bruto Médio/Mês:
          {{ summaryData() ? formatCurrency(summaryData()!.lucroBrutoMediaMes) : formatCurrency(0) }}
        </p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
      <div>
        <p class="font-medium">UNIDADES VENDIDAS (90D)</p>
        <p>{{ summaryData()?.unidadesVendidasTrimestre | number:'1.0-0' }}</p>
        <p class="mt-1 text-xs text-slate-500">Média/Mês:
          {{ summaryData()?.unidadesVendidasMediaMes | number:'1.0-0' }}
        </p>
      </div>

      <div>
        <p class="font-medium">ESTOQUE PRODUTOS VENDIDOS</p>
        <p>{{ summaryData() ? formatCurrency(summaryData()!.estoqueProdutosVendidosValor) : formatCurrency(0) }}</p>
        <p class="mt-1 text-xs text-slate-500">Unidades:
          {{ summaryData()?.estoqueProdutosVendidosUnidades | number:'1.0-0' }}
        </p>
      </div>

      <div>
        <p class="font-medium">ESTOQUE REGULADOR PROJETADO</p>
        <p>{{ summaryData() ? formatCurrency(summaryData()!.estoqueReguladorValor) : formatCurrency(0) }}</p>
        <p class="mt-1 text-xs text-slate-500">Unidades:
          {{ summaryData()?.estoqueReguladorUnidades | number:'1.0-0' }}
        </p>
      </div>
    </div>
  </div>

  <p class="text-[11px] text-slate-400">
    Valores calculados a partir das planilhas enviadas. Período padrão: últimos 90 dias (≈ 3 meses).
  </p>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryViewComponent {
  summaryData = input.required<SummaryData>();

  // Utilidades de formatação
  formatCurrency(value?: number | null): string {
    const n = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  }
  formatNumber(value?: number | null): string {
    const n = typeof value === 'number' ? value : 0;
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);
  }
  formatPercent(value?: number | null, base100 = false): string {
    const v = typeof value === 'number' ? value : 0;
    const p = base100 ? v : v * 100;
    return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(p / 100);
  }

  // Ordena curvas A, B, C, SEM_GIRO para exibir sempre na mesma ordem
  orderedCurves(): CurvaResumo[] {
    const sd = this.summaryData();
    if (!sd?.curvas?.length) return [];
    const order = { A: 1, B: 2, C: 3, SEM_GIRO: 4 } as Record<CurvaResumo['curva'], number>;
    return [...sd.curvas].sort((a, b) => order[a.curva] - order[b.curva]);
  }

  // Classes visuais por curva
  curvaColor(curva: CurvaResumo['curva']): string {
    switch (curva) {
      case 'A': return 'border-blue-200 bg-blue-50';
      case 'B': return 'border-emerald-200 bg-emerald-50';
      case 'C': return 'border-amber-200 bg-amber-50';
      default:  return 'border-slate-200 bg-slate-50';
    }
  }
  curvaPill(curva: CurvaResumo['curva']): string {
    switch (curva) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-emerald-100 text-emerald-800';
      case 'C': return 'bg-amber-100 text-amber-800';
      default:  return 'bg-slate-100 text-slate-800';
    }
  }
}
