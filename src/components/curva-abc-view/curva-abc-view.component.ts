

// src/components/curva-abc-view/curva-abc-view.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryData, CurvaResumo } from '../../models/product.model';

@Component({
  selector: 'app-curva-abc-view',
  standalone: true,
  imports: [CommonModule],
  template: `
<!-- src/components/curva-abc-view/curva-abc-view.component.html -->
<div class="space-y-6">
  <div class="p-4 border-l-4 border-sky-500 bg-sky-50 text-sky-800 rounded-r-lg">
    <p class="font-semibold">Indicadores por Curva ABC</p>
    <p class="text-sm mt-1">Quebra de resultados, faltas, estoque parado e excesso por curva.</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    @for (c of curves(); track c.curva) {
      <div class="rounded-xl border p-4" [class]="card(c.curva)">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-800">Curva</div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full" [class]="pill(c.curva)">
            {{ c.curva }}
          </span>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div class="text-slate-500 text-xs uppercase">SKUs</div>
            <div class="font-semibold">{{ int(c.skus) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Em Falta</div>
            <div class="font-semibold text-red-600">{{ int(c.skusEmFalta) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">% Faltas (R$)</div>
            <div class="font-semibold text-red-700">
              {{ c.faltaPercent | number:'1.1-2' }}%
            </div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Parados</div>
            <div class="font-semibold text-amber-600">{{ int(c.skusParados) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Dias de Estoque (médio)</div>
            <div class="font-semibold">{{ int(c.diasEstoqueMedio) }} d</div>
          </div>

          <div class="col-span-2 md:col-span-2">
            <div class="text-slate-500 text-xs uppercase">Venda 90d</div>
            <div class="font-semibold">{{ money(c.venda90d) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">CMV 90d</div>
            <div class="font-semibold">{{ money(c.cmv90d) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Lucro Bruto 90d</div>
            <div class="font-semibold">{{ money(c.lucroBruto90d) }}</div>
          </div>

          <div>
            <div class="text-slate-500 text-xs uppercase">Estoque Parado (Unid)</div>
            <div class="font-semibold">{{ int(c.estoqueParadoUnidades) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Estoque Parado (R$)</div>
            <div class="font-semibold">{{ money(c.estoqueParadoValor) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Excesso (Unid)</div>
            <div class="font-semibold">{{ int(c.excessoUnidades) }}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase">Excesso (R$)</div>
            <div class="font-semibold">{{ money(c.excessoValor) }}</div>
          </div>
        </div>
      </div>
    }
  </div>

  <!-- rodapé com totais gerais -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-slate-500 text-xs uppercase">Dias de Estoque Médio (geral)</div>
      <div class="text-lg font-semibold">
        {{ int(summaryData().diasEstoqueMedioGeral) }} d
      </div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-slate-500 text-xs uppercase">Excesso Total (Unid)</div>
      <div class="text-lg font-semibold">
        {{ int(summaryData().excessoUnidadesTotal) }}
      </div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="text-slate-500 text-xs uppercase">Excesso Total (R$)</div>
      <div class="text-lg font-semibold">
        {{ money(summaryData().excessoValorTotal) }}
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
export class CurvaAbcViewComponent {
  summaryData = input.required<SummaryData>();

  private curveOrder: Record<CurvaResumo['curva'], number> = { A: 1, B: 2, C: 3, SEM_GIRO: 4 };

  curves(): CurvaResumo[] {
    const s = this.summaryData();
    return (s.curvas || []).slice().sort((a, b) => this.curveOrder[a.curva] - this.curveOrder[b.curva]);
  }

  pill(curva: CurvaResumo['curva']) {
    switch (curva) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-emerald-100 text-emerald-800';
      case 'C': return 'bg-amber-100 text-amber-800';
      default:  return 'bg-slate-100 text-slate-800';
    }
  }
  card(curva: CurvaResumo['curva']) {
    switch (curva) {
      case 'A': return 'border-blue-200 bg-blue-50';
      case 'B': return 'border-emerald-200 bg-emerald-50';
      case 'C': return 'border-amber-200 bg-amber-50';
      default:  return 'border-slate-200 bg-slate-50';
    }
  }

  money(n?: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0);
  }
  int(n?: number) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n ?? 0);
  }
}
