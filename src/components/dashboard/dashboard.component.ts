// src/components/dashboard/dashboard.component.ts
import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResult } from '../../models/product.model';
import { SummaryViewComponent } from '../summary-view/summary-view.component';
import { TableViewComponent } from '../table-view/table-view.component';
import { CurvaAbcViewComponent } from '../curva-abc-view/curva-abc-view.component'; // ⬅ novo

type Tab = 'summary' | 'all' | 'stockout' | 'stagnant' | 'abc'; // ⬅ novo

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
<!-- src/components/dashboard/dashboard.component.html -->
<div class="w-full">
  <div class="mb-6 border-b border-slate-200">
    <nav class="-mb-px flex space-x-6" aria-label="Tabs">
      <button (click)="setActiveTab('summary')"
              [class]="activeTab() === 'summary' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        Resumo
      </button>

      <button (click)="setActiveTab('all')"
              [class]="activeTab() === 'all' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        Base Consolidada
      </button>

      <button (click)="setActiveTab('stockout')"
              [class]="activeTab() === 'stockout' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center">
        Produtos em Falta
        <span class="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-medium">
          {{ analysisResult().faltas.length }}
        </span>
      </button>

      <button (click)="setActiveTab('stagnant')"
              [class]="activeTab() === 'stagnant' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center">
        Itens Parados
        <span class="ml-2 bg-amber-100 text-amber-600 py-0.5 px-2 rounded-full text-xs font-medium">
          {{ analysisResult().parados.length }}
        </span>
      </button>

      <!-- NOVA ABA -->
      <button (click)="setActiveTab('abc')"
              [class]="activeTab() === 'abc' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors">
        Curva ABC
      </button>
    </nav>
  </div>

  <div class="transition-opacity duration-300">
    @switch (activeTab()) {
      @case ('summary') {
        <app-summary-view [summaryData]="analysisResult().summary"></app-summary-view>
      }
      @case ('all') {
        <app-table-view
          [data]="analysisResult().consolidated"
          [viewType]="'all'"
          title="Base Consolidada de Produtos"
          fileName="base_consolidada"
          infoText="Aqui estão todos os produtos de ambas as planilhas, com os cálculos aplicados.">
        </app-table-view>
      }
      @case ('stockout') {
        <app-table-view
          [data]="analysisResult().faltas"
          [viewType]="'stockout'"
          title="Produtos em Falta (Ruptura)"
          fileName="produtos_em_falta"
          infoText="Produtos com venda nos últimos 90 dias, porém estoque zerado.">
        </app-table-view>
      }
      @case ('stagnant') {
        <app-table-view
          [data]="analysisResult().parados"
          [viewType]="'stagnant'"
          title="Itens Parados (Sem Giro)"
          fileName="itens_parados"
          infoText="Itens sem venda nos últimos 90 dias.">
        </app-table-view>
      }
      <!-- NOVO CASE -->
      @case ('abc') {
        <app-curva-abc-view [summaryData]="analysisResult().summary"></app-curva-abc-view>
      }
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SummaryViewComponent, TableViewComponent, CurvaAbcViewComponent], // ⬅ inclui
})
export class DashboardComponent {
  analysisResult = input.required<AnalysisResult>();
  activeTab = signal<Tab>('summary');

  setActiveTab(tab: Tab): void {
    this.activeTab.set(tab);
  }
}
