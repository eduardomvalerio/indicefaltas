


import { Component, ChangeDetectionStrategy, signal, OnInit, AfterViewInit, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SupaService } from '../../services/supa.service';
import { AnaliseRun } from '../../models/supabase.model';

// Declara a variável global Chart para que o TypeScript a reconheça.
// A biblioteca é carregada via <script> no index.html.
declare var Chart: any;


@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
@if (isLoading()) {
  <div class="text-center p-8">
    <div class="animate-spin h-8 w-8 text-sky-600 mx-auto"></div>
    <p class="mt-2 text-slate-500">Carregando histórico...</p>
  </div>
} @else if (error()) {
  <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg" role="alert">
    <p class="font-bold">Erro</p>
    <p>{{ error() }}</p>
  </div>
} @else if (runs().length === 0) {
  <div class="text-center py-12 px-6 bg-white rounded-lg shadow-sm">
    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 class="mt-2 text-sm font-medium text-slate-900">Nenhum histórico encontrado</h3>
    <p class="mt-1 text-sm text-slate-500">
      Nenhuma análise foi executada para este cliente ainda.
    </p>
  </div>
} @else {
  <div class="space-y-8">
    <!-- Gráfico -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h2 class="text-xl font-bold text-slate-800 mb-4">Evolução dos Indicadores</h2>
      <div class="relative h-96">
        <canvas #historyChart></canvas>
      </div>
    </div>
    
    <!-- Tabela -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h2 class="text-xl font-bold text-slate-800 mb-4">Execuções da Análise</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">% Faltas (Geral)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Excesso (R$)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dias de Estoque</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Versão</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            @for(run of runs(); track run.id){
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{{ run.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{{ run.summary.indiceFaltas | number:'1.2-2' }}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">{{ run.summary.excessoValorTotal | number:'1.2-2':'pt-BR' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">{{ run.summary.diasEstoqueMedioGeral | number:'1.0-0' }} dias</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-500">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                      {{ run.algoritmo_versao }}
                    </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  </div>
}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit, AfterViewInit {
  @ViewChild('historyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  runs = signal<AnaliseRun[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isViewReady = signal(false);
  private chart: any;

  constructor(private route: ActivatedRoute, private supaService: SupaService) {
    effect(() => {
      // This effect runs when runs() or isViewReady() changes.
      // It ensures the chart is created only when both data and the canvas are ready.
      if (this.isViewReady() && this.runs().length > 0) {
        this.createChart();
      }
    });
  }

  ngOnInit(): void {
    const clientId = this.route.parent?.snapshot.paramMap.get('clientId');
    if (clientId) {
      this.loadHistory(clientId);
    } else {
      this.error.set('ID do cliente não encontrado.');
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    // The view is now initialized, and the canvas element is available.
    this.isViewReady.set(true);
  }

  async loadHistory(clientId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supaService.client
        .from('analise_runs')
        .select('*')
        .eq('cliente_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.runs.set(data as AnaliseRun[]);
      // The chart will be created by the effect when this signal is set.
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao buscar o histórico.');
    } finally {
      this.isLoading.set(false);
    }
  }

  createChart(): void {
    if (!this.chartCanvas || !this.runs().length) return;

    const chartData = [...this.runs()].reverse();
    const labels = chartData.map((run) => new Date(run.created_at).toLocaleDateString('pt-BR'));

    const datasets = [
      { label: '% Faltas (Geral)', data: chartData.map((r) => r.summary.indiceFaltas), yAxisID: 'yPercentage' },
      { label: 'Dias de Estoque (Geral)', data: chartData.map((r) => r.summary.diasEstoqueMedioGeral), yAxisID: 'yDays' },
      { label: 'Excesso (R$)', data: chartData.map((r) => r.summary.excessoValorTotal), yAxisID: 'yCurrency' },
    ];

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yPercentage: { type: 'linear', position: 'left' },
          yDays: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } },
          yCurrency: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } },
        },
      },
    });
  }
}
