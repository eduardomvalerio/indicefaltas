


import { Component, ChangeDetectionStrategy, signal, OnInit, ElementRef, ViewChild, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { environment } from '../../environments/environment';
import { ApiService } from '../../services/api.service';
import { AnaliseRun } from '../../models/supabase.model';
import { AssistantService, FarmaciaContext } from '../../services/assistant.service';
import { Cliente } from '../../models/supabase.model';
import { ActionPlan } from '../../models/action-plan.model';
import { ActionPlanService } from '../../services/action-plan.service';
import { ActionPlanViewComponent } from '../action-plan-view/action-plan-view.component';

// Declara a variável global Chart para que o TypeScript a reconheça.
// A biblioteca é carregada via <script> no index.html.
declare var Chart: any;


@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionPlanViewComponent],
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
    <div class="mt-3 flex flex-wrap gap-2">
      <button class="px-3 py-1 text-sm rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-50"
              (click)="reloadHistory()">
        Tentar novamente
      </button>
      @if (clientId) {
        <a class="px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
           [routerLink]="['/clients', clientId, 'new-analysis']">
          Reexecutar análise
        </a>
      }
    </div>
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
    @if (clientId) {
      <a class="inline-flex items-center mt-4 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700"
         [routerLink]="['/clients', clientId, 'new-analysis']">
        Enviar planilhas
      </a>
    }
  </div>
} @else {
  <div class="space-y-8">
    <!-- Gráfico -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 class="text-xl font-bold text-slate-800">Evolução dos Indicadores</h2>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 text-xs font-semibold rounded-full border"
            [class]="chartPeriodDays() === 30 ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            (click)="setChartPeriod(30)"
          >
            Últimos 30 dias
          </button>
          <button
            class="px-3 py-1.5 text-xs font-semibold rounded-full border"
            [class]="chartPeriodDays() === 90 ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            (click)="setChartPeriod(90)"
          >
            Últimos 90 dias
          </button>
          <button
            class="px-3 py-1.5 text-xs font-semibold rounded-full border"
            [class]="chartPeriodDays() === 180 ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            (click)="setChartPeriod(180)"
          >
            Últimos 180 dias
          </button>
        </div>
      </div>
      <div class="relative h-96">
        <canvas #historyChart></canvas>
      </div>
    </div>
    
    <!-- Tabela -->
    <div class="bg-white p-6 rounded-lg shadow-lg">
      <h2 class="text-xl font-bold text-slate-800 mb-4">Execuções da Análise</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Período analisado</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">% Faltas (Geral)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Impacto (R$)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Excesso (R$)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dias de Estoque</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Análise</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">{{ reportLabel }}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            @for(run of runs(); track run.id){
              <tr class="odd:bg-white even:bg-slate-50/60">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{{ run.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{{ formatPeriodo(run) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{{ run.summary.indiceFaltas | number:'1.2-2' }}%</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{{ impactoRun(run) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-amber-600">{{ run.summary.excessoValorTotal | number:'1.2-2':'pt-BR' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">{{ run.summary.diasEstoqueMedioGeral | number:'1.0-0' }} dias</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <button
                    class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-semibold hover:bg-slate-100 transition-colors"
                    (click)="verAnalise(run)">
                    Ver análise
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <button
                    class="px-3 py-1 bg-sky-600 text-white rounded-md text-xs font-semibold hover:bg-sky-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    (click)="gerarNatasha(run)"
                    [disabled]="isGenerating() && selectedRunId() === run.id"
                  >
                    @if(isGenerating() && selectedRunId() === run.id){Gerando...}
                    @else if (natashaCache()[run.id]) {Ver relatório}
                    @else { {{ reportLabel }} }
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if(natashaReport()){
        <div id="natasha-report-panel" class="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-slate-800">{{ reportLabel }}</h3>
            <div class="space-x-2">
              <button class="px-3 py-1 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-100"
                      (click)="exportarPDF()">
                Exportar PDF
              </button>
              <button class="px-3 py-1 text-slate-500 text-sm hover:text-slate-700" (click)="limparRelatorio()">Fechar</button>
            </div>
          </div>
          <div class="report-markdown max-w-none text-justify leading-relaxed" [innerHTML]="renderedReportHtml()"></div>
        </div>
      }

      @if(genError()){
        <div class="mt-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
          <p class="font-semibold">Erro no {{ reportLabel }}</p>
          <p>{{ genError() }}</p>
        </div>
      }

      @if(selectedRun()){
        <div id="analysis-detail-panel" class="mt-8 space-y-6">
          @if (selectedActionPlan()) {
            <app-action-plan-view [plan]="selectedActionPlan()"></app-action-plan-view>
          }
          <div class="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
            <h3 class="text-xl font-semibold text-slate-800 mb-4">Análise detalhada</h3>
            <p class="text-sm text-slate-600 mb-4">
              Cliente: {{ cliente()?.nome_fantasia }} — Período: {{ formatPeriodo(selectedRun()!) }}
            </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">Índice de Faltas</p>
              <p class="text-2xl font-bold text-red-600">{{ selectedRun()!.summary.indiceFaltas | number:'1.2-2' }}%</p>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">Excesso (R$)</p>
              <p class="text-2xl font-bold text-amber-600">{{ selectedRun()!.summary.excessoValorTotal | number:'1.2-2':'pt-BR' }}</p>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">Dias de Estoque</p>
              <p class="text-2xl font-bold text-blue-600">{{ selectedRun()!.summary.diasEstoqueMedioGeral | number:'1.0-0' }} dias</p>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">SKUs</p>
              <p class="text-2xl font-bold text-slate-800">{{ selectedRun()!.summary.totalSKUs | number:'1.0-0' }}</p>
              <p class="text-sm text-slate-600">Com venda: {{ selectedRun()!.summary.skusComVenda | number:'1.0-0' }} · Em falta: {{ selectedRun()!.summary.skusEmFalta | number:'1.0-0' }}</p>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">Parados (unidades / R$)</p>
              <p class="text-lg font-semibold text-slate-800">
                {{ selectedRun()!.summary.estoqueParadoUnidades | number:'1.0-0' }} un ·
                {{ selectedRun()!.summary.estoqueParadoValor | number:'1.2-2':'pt-BR' }}
              </p>
            </div>
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-xs text-slate-500 uppercase">Faturamento 90d</p>
              <p class="text-lg font-semibold text-slate-800">{{ selectedRun()!.summary.vendaTrimestre | number:'1.2-2':'pt-BR' }}</p>
              <p class="text-sm text-slate-600">Lucro bruto: {{ selectedRun()!.summary.lucroBrutoTrimestre | number:'1.2-2':'pt-BR' }} ({{ selectedRun()!.summary.margemBrutaPercent | number:'1.1-1' }}%)</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Curva</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">SKUs</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ruptura (%)</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dias de estoque</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Excesso (R$)</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                @for(c of selectedRun()!.summary.curvas; track c.curva){
                  <tr class="odd:bg-white even:bg-slate-50/60">
                    <td class="px-4 py-2 text-sm font-semibold text-slate-800">{{ c.curva }}</td>
                    <td class="px-4 py-2 text-sm text-right text-slate-700">{{ c.skus | number:'1.0-0' }}</td>
                    <td class="px-4 py-2 text-sm text-right text-red-600">{{ c.faltaPercent | number:'1.1-1' }}%</td>
                    <td class="px-4 py-2 text-sm text-right text-blue-600">{{ c.diasEstoqueMedio | number:'1.0-0' }} dias</td>
                    <td class="px-4 py-2 text-sm text-right text-amber-600">{{ c.excessoValor | number:'1.2-2':'pt-BR' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-sm font-semibold text-slate-700 mb-2">Itens em falta</p>
              <p class="text-xs text-slate-500 mb-3">Listagem salva na análise. Baixe para ver todos.</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">Registros: {{ getFaltas(selectedRun()!).length }}</span>
                <div class="space-x-2">
                  <button class="px-3 py-1 text-xs rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          (click)="downloadXlsxLike('faltas', getFaltas(selectedRun()!))">Baixar XLS</button>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-sm font-semibold text-slate-700 mb-2">Itens em excesso</p>
              <p class="text-xs text-slate-500 mb-3">Itens com excesso > 0 salvos no run.</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">Registros: {{ getExcessos(selectedRun()!).length }}</span>
                <div class="space-x-2">
                  <button class="px-3 py-1 text-xs rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          (click)="downloadXlsxLike('excessos', getExcessos(selectedRun()!))">Baixar XLS</button>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-sm font-semibold text-slate-700 mb-2">Itens parados</p>
              <p class="text-xs text-slate-500 mb-3">Sem giro; ordenados por custo.</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">Registros: {{ getParados(selectedRun()!).length }}</span>
                <div class="space-x-2">
                  <button class="px-3 py-1 text-xs rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          (click)="downloadXlsxLike('parados', getParados(selectedRun()!))">Baixar XLS</button>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <p class="text-sm font-semibold text-slate-700 mb-2">Base consolidada</p>
              <p class="text-xs text-slate-500 mb-3">Todos os SKUs processados nesta análise.</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-600">Registros: {{ selectedRun()?.consolidated?.length || 0 }}</span>
                <div class="space-x-2">
                  <button class="px-3 py-1 text-xs rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                          (click)="downloadXlsxLike('consolidado', selectedRun()?.consolidated || [])">Baixar XLS</button>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button class="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                    (click)="excluirAnalise(selectedRun()!)">
              Excluir análise
            </button>
          </div>
          </div>
        </div>
      }
    </div>
  </div>
}
  `,
  styles: [`
    .report-markdown h1, .report-markdown h2, .report-markdown h3, .report-markdown h4 {
      font-weight: 700;
      color: #1f2937;
      margin: 1rem 0 0.5rem;
      line-height: 1.3;
    }
    .report-markdown h1 { font-size: 1.5rem; }
    .report-markdown h2 { font-size: 1.25rem; }
    .report-markdown h3 { font-size: 1.125rem; }
    .report-markdown h4 { font-size: 1rem; }
    .report-markdown p { margin: 0.5rem 0 0.9rem; color: #334155; }
    .report-markdown ul, .report-markdown ol { margin: 0.5rem 0 1rem; padding-left: 1.25rem; color: #334155; }
    .report-markdown ul { list-style: disc; }
    .report-markdown ol { list-style: decimal; }
    .report-markdown li { margin: 0.2rem 0; }
    .report-markdown strong { font-weight: 700; color: #0f172a; }
    .report-markdown code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      background: #eef2ff;
      color: #1e3a8a;
      border-radius: 4px;
      padding: 0.1rem 0.3rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit {
  @ViewChild('historyChart') set historyChartRef(value: ElementRef<HTMLCanvasElement> | undefined) {
    this.chartCanvas = value;
    this.tryCreateChart();
  }

  clientId: string | null = null;
  runs = signal<AnaliseRun[]>([]);
  cliente = signal<Cliente | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isGenerating = signal(false);
  genError = signal<string | null>(null);
  natashaReport = signal<string | null>(null);
  selectedRunId = signal<string | null>(null);
  natashaCache = signal<Record<string, string>>({});
  selectedRun = signal<AnaliseRun | null>(null);
  selectedActionPlan = signal<ActionPlan | null>(null);
  renderedReportHtml = computed(() => this.markdownToHtml(this.natashaReport() ?? ''));
  chartPeriodDays = signal(90);
  chartRunCount = computed(() => this.getRunsForChart().length);
  readonly reportLabel = 'Relatório Farma Brasil';
  readonly reportLogoUrl = environment.REPORT_LOGO_URL;
  private chart: any;
  private chartCanvas?: ElementRef<HTMLCanvasElement>;
  private readonly leadTimeDays = environment.DEFAULT_LEAD_TIME_DAYS;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private assistant: AssistantService,
    private actionPlanService: ActionPlanService
  ) {
    effect(() => {
      // This effect runs when runs() changes to keep the chart in sync with data.
      this.chartPeriodDays();
      if (this.runs().length > 0) {
        this.tryCreateChart();
      }
    });
  }

  ngOnInit(): void {
    const clientId = this.route.parent?.snapshot.paramMap.get('clientId');
    if (clientId) {
      this.clientId = clientId;
      this.loadHistory(clientId);
      this.loadCliente(clientId);
    } else {
      this.error.set('ID do cliente não encontrado.');
      this.isLoading.set(false);
    }
  }

  async loadHistory(clientId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const data = await this.api.get<any[]>(`/analise-runs?cliente_id=${clientId}`);

      // Map MongoDB _id to id for compatibility
      const runsData = (data || []).map((r: any) => ({ ...r, id: r._id || r.id })) as AnaliseRun[];
      this.runs.set(runsData);
      // Pré-carrega relatórios já existentes no cache
      const cache: Record<string, string> = {};
      runsData.forEach((r) => {
        if (r.natasha_report) cache[r.id] = r.natasha_report;
      });
      this.natashaCache.set(cache);
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao buscar o histórico.');
    } finally {
      this.isLoading.set(false);
    }
  }

  reloadHistory(): void {
    if (this.clientId) {
      this.loadHistory(this.clientId);
    }
  }

  createChart(): void {
    if (!this.chartCanvas) return;

    const filteredRuns = this.getRunsForChart();
    if (!filteredRuns.length) {
      if (this.chart) this.chart.destroy();
      return;
    }

    const chartData = [...filteredRuns].reverse();
    const labels = chartData.map((run) => new Date(run.created_at).toLocaleDateString('pt-BR'));

    const datasets = [
      { label: '% Faltas (Geral)', data: chartData.map((r) => r.summary.indiceFaltas), yAxisID: 'yPercentage' },
      { label: 'Dias de Estoque (Geral)', data: chartData.map((r) => r.summary.diasEstoqueMedioGeral), yAxisID: 'yDays' },
      { label: 'Excesso (R$)', data: chartData.map((r) => r.summary.excessoValorTotal), yAxisID: 'yCurrency' },
    ];

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const formatCurrency = (value: number) =>
      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (items: any[]) => (items.length ? `Data: ${items[0].label}` : ''),
              label: (context: any) => {
                const label = context.dataset?.label ?? '';
                const value = typeof context.parsed?.y === 'number' ? context.parsed.y : 0;
                if (label.includes('% Faltas')) {
                  return `${label}: ${value.toFixed(2)}%`;
                }
                if (label.includes('Dias')) {
                  return `${label}: ${value.toFixed(0)} dias`;
                }
                if (label.includes('Excesso')) {
                  return `${label}: ${formatCurrency(value)}`;
                }
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          yPercentage: {
            type: 'linear',
            position: 'left',
            ticks: { callback: (value: any) => `${value}%` },
          },
          yDays: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: (value: any) => `${value}d` },
          },
          yCurrency: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: (value: any) => formatCurrency(Number(value)) },
          },
        },
      },
    });
  }

  private tryCreateChart(): void {
    if (!this.chartCanvas) return;
    if (!this.chartRunCount()) {
      if (this.chart) this.chart.destroy();
      return;
    }
    this.createChart();
  }

  private getRunsForChart(): AnaliseRun[] {
    const period = this.chartPeriodDays();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return this.runs().filter((run) => new Date(run.created_at) >= cutoff);
  }

  setChartPeriod(days: number): void {
    this.chartPeriodDays.set(days);
  }

  async loadCliente(id: string): Promise<void> {
    try {
      const data = await this.api.get<any>(`/clientes/${id}`);
      if (data) this.cliente.set({ ...data, id: data._id || data.id } as Cliente);
    } catch (err) {
      console.error('Erro ao buscar cliente', err);
    }
  }

  gerarNatasha(run: AnaliseRun): void {
    // Se já existir em cache, só exibe
    const cached = this.natashaCache()[run.id];
    if (cached && cached.trim().toLowerCase() !== 'sem resposta') {
      this.natashaReport.set(cached);
      this.selectedRunId.set(run.id);
      this.focusReportPanel();
      return;
    }

    this.isGenerating.set(true);
    this.genError.set(null);
    this.natashaReport.set(null);
    this.selectedRunId.set(run.id);

    const previous = this.getPreviousRun(run.id);
    const ctx = this.montarContexto(run, previous);

    this.assistant.analisarFarmacia(ctx).subscribe({
      next: (resp) => {
        const report = resp.answer;
        const isEmpty = !report || report.trim().toLowerCase() === 'sem resposta';
        if (!isEmpty) {
          this.natashaReport.set(report);
          this.setCache(run.id, report);
          this.salvarNatasha(run.id, report);
          this.focusReportPanel();
        } else {
          // Não cacheia respostas vazias para permitir tentar novamente
          this.natashaReport.set('Sem resposta');
        }
        this.isGenerating.set(false);
      },
      error: (err) => {
        this.genError.set(err?.message || `Erro ao gerar ${this.reportLabel}.`);
        this.isGenerating.set(false);
      },
    });
  }

  limparRelatorio(): void {
    this.natashaReport.set(null);
    this.selectedRunId.set(null);
  }

  async verAnalise(run: AnaliseRun): Promise<void> {
    const detailed = (await this.loadRunDetails(run.id)) ?? run;
    this.selectedRun.set(detailed);
    const plan =
      (detailed.action_plan as ActionPlan | null) ??
      (Array.isArray(detailed.consolidated)
        ? this.actionPlanService.buildPlan(detailed.consolidated, this.leadTimeDays)
        : null);
    this.selectedActionPlan.set(plan);
    this.focusAnalysisPanel();
  }

  getFaltas(run: AnaliseRun): any[] {
    if (Array.isArray(run.faltas) && run.faltas.length) return run.faltas;
    const cons = run.consolidated || [];
    return cons.filter((p: any) => p.flag_falta);
  }

  getExcessos(run: AnaliseRun): any[] {
    const cons = run.consolidated || [];
    return cons.filter((p: any) => (p.excessoValor ?? 0) > 0 || p.flag_excesso);
  }

  getParados(run: AnaliseRun): any[] {
    if (Array.isArray(run.parados) && run.parados.length) return run.parados;
    const cons = run.consolidated || [];
    return cons.filter((p: any) => p.flag_parado);
  }

  async downloadXlsxLike(name: string, rows: any[]): Promise<void> {
    let dataRows = rows;
    if (!dataRows || !dataRows.length) {
      const selected = this.selectedRun();
      if (selected?.id) {
        const detailed = await this.loadRunDetails(selected.id);
        if (detailed) {
          this.selectedRun.set(detailed);
          dataRows = this.resolveRowsForExport(name, detailed);
        }
      }
    }

    if (!dataRows || !dataRows.length) {
      this.genError.set('Não há dados detalhados disponíveis para exportar este XLS nesta análise.');
      return;
    }

    const headers = Object.keys(dataRows[0]);
    const sanitize = (v: any) => {
      if (v === null || v === undefined) return '';
      return String(v).replace(/\t/g, ' ').replace(/\n/g, ' ');
    };
    const content = [
      headers.join('\t'),
      ...dataRows.map((r) => headers.map((h) => sanitize((r as any)[h])).join('\t')),
    ].join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarPDF(): void {
    const report = this.natashaReport();
    if (!report) return;
    const reportHtml = this.markdownToHtml(report);
    const titulo = this.cliente()?.nome_fantasia ?? 'Relatório';
    const reportLabel = this.reportLabel;
    const logoUrl = this.reportLogoUrl
      ? this.reportLogoUrl.startsWith('/')
        ? `${window.location.origin}${this.reportLogoUrl}`
        : this.reportLogoUrl
      : '';
    const headerHtml = `
      <div class="report-header">
        ${logoUrl ? `<img src="${logoUrl}" alt="${reportLabel}" class="report-logo" />` : ''}
        <h1>${titulo} — ${reportLabel}</h1>
      </div>
    `;
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) return;
    const style = `
      <style>
        body { font-family: "Helvetica Neue", Arial, sans-serif; padding: 32px; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 22px; margin: 0; font-weight: 700; }
        h2, h3, h4 { color: #1f2937; margin-top: 18px; margin-bottom: 8px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        h4 { font-size: 14px; }
        p { text-align: justify; margin-top: 8px; margin-bottom: 12px; color: #334155; }
        ul, ol { margin-top: 6px; margin-bottom: 14px; padding-left: 22px; color: #334155; }
        ul { list-style: disc; }
        ol { list-style: decimal; }
        li { margin: 3px 0; }
        strong { color: #0f172a; }
        code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          background: #eef2ff; color: #1e3a8a; padding: 1px 4px; border-radius: 4px;
        }
        .report-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .report-logo { height: 56px; max-width: 220px; object-fit: contain; }
      </style>
    `;
    const html = `
      <html>
        <head>${style}</head>
        <body>
          ${headerHtml}
          <div class="report-markdown">${reportHtml}</div>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  private markdownToHtml(markdown: string): string {
    const text = (markdown || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    const lines = text.split('\n');
    const html: string[] = [];
    const paragraphBuffer: string[] = [];
    let inUl = false;
    let inOl = false;

    const flushParagraph = () => {
      if (!paragraphBuffer.length) return;
      const paragraph = this.renderInlineMarkdown(paragraphBuffer.join(' ').trim());
      html.push(`<p>${paragraph}</p>`);
      paragraphBuffer.length = 0;
    };

    const closeLists = () => {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        closeLists();
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeLists();
        const level = Math.min(6, heading[1].length);
        html.push(`<h${level}>${this.renderInlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const ordered = line.match(/^\d+\.\s+(.+)$/);
      if (ordered) {
        flushParagraph();
        if (inUl) {
          html.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          html.push('<ol>');
          inOl = true;
        }
        html.push(`<li>${this.renderInlineMarkdown(ordered[1])}</li>`);
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        flushParagraph();
        if (inOl) {
          html.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          html.push('<ul>');
          inUl = true;
        }
        html.push(`<li>${this.renderInlineMarkdown(bullet[1])}</li>`);
        continue;
      }

      closeLists();
      paragraphBuffer.push(line);
    }

    flushParagraph();
    closeLists();
    return html.join('\n');
  }

  private renderInlineMarkdown(input: string): string {
    let safe = this.escapeHtml(input);
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return safe;
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private montarContexto(run: AnaliseRun, previous: AnaliseRun | null): FarmaciaContext {
    const s = run.summary;
    const curva = (sigla: 'A' | 'B' | 'C') =>
      s.curvas.find((c) => c.curva === sigla) || {
        curva: sigla,
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
      };

    const ticketMedio =
      s.unidadesVendidasTrimestre > 0 ? s.vendaTrimestre / s.unidadesVendidasTrimestre : s.vendaTrimestre;

    const alertas: string[] = [];
    alertas.push(`Sem giro: ${s.skusParados} SKUs parados`);
    alertas.push(`Excesso: R$ ${s.excessoValorTotal.toFixed(2)} em excesso total`);
    alertas.push(`Faltas: ${s.skusEmFalta} SKUs em falta, índice de faltas ${s.indiceFaltas.toFixed(2)}%`);

    const cliente = this.cliente();

    return {
      cliente: {
        id: run.cliente_id,
        nome: cliente?.nome_fantasia ?? 'Cliente',
        cidade: cliente?.cidade,
        uf: cliente?.uf,
      },
      periodo: `últimos ${run.periodo_dias} dias`,
      kpis: {
        faturamento: s.vendaTrimestre,
        lucro_bruto: s.lucroBrutoTrimestre,
        ruptura_percent: s.indiceFaltas,
        ticket_medio: ticketMedio,
      },
      curva: {
        A: { skus: curva('A').skus, ruptura: curva('A').faltaPercent, estoque_dias: curva('A').diasEstoqueMedio },
        B: { skus: curva('B').skus, ruptura: curva('B').faltaPercent, estoque_dias: curva('B').diasEstoqueMedio },
        C: { skus: curva('C').skus, ruptura: curva('C').faltaPercent, estoque_dias: curva('C').diasEstoqueMedio },
      },
      alertas,
      acoes_ja_tomadas: [],
      ruptura_anterior_percent: previous?.summary?.indiceFaltas,
      top_faltas: Array.isArray(run.top_faltas) ? run.top_faltas.slice(0, 20) : undefined,
      top_excessos: Array.isArray(run.top_excessos) ? run.top_excessos.slice(0, 20) : undefined,
      top_parados: Array.isArray(run.top_parados) ? run.top_parados.slice(0, 10) : undefined,
    };
  }

  private getPreviousRun(currentRunId: string): AnaliseRun | null {
    // runs() está ordenado desc por data; pega o run seguinte na lista como "anterior"
    const idx = this.runs().findIndex((r) => r.id === currentRunId);
    if (idx === -1) return null;
    return this.runs()[idx + 1] ?? null;
  }

  private setCache(runId: string, report: string): void {
    const next = { ...this.natashaCache(), [runId]: report };
    this.natashaCache.set(next);
  }

  private resolveRowsForExport(name: string, run: AnaliseRun): any[] {
    if (name === 'faltas') return this.getFaltas(run);
    if (name === 'excessos') return this.getExcessos(run);
    if (name === 'parados') return this.getParados(run);
    if (name === 'consolidado') return Array.isArray(run.consolidated) ? run.consolidated : [];
    return [];
  }

  private async loadRunDetails(runId: string): Promise<AnaliseRun | null> {
    try {
      const data = await this.api.get<any>(`/analise-runs/${runId}`);
      if (!data) return null;
      const detailed = { ...data, id: data._id || data.id } as AnaliseRun;

      // Mantém lista sincronizada para evitar perder os campos completos ao reabrir a mesma análise.
      const updated = this.runs().map((r) => (r.id === detailed.id ? { ...r, ...detailed } : r));
      this.runs.set(updated);
      return detailed;
    } catch (err) {
      console.error('Erro ao carregar detalhes completos da análise', err);
      return null;
    }
  }

  private focusReportPanel(): void {
    this.scrollToPanel('natasha-report-panel');
  }

  private focusAnalysisPanel(): void {
    this.scrollToPanel('analysis-detail-panel');
  }

  private scrollToPanel(elementId: string): void {
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  formatPeriodo(run: AnaliseRun): string {
    if (run.periodo_inicio && run.periodo_fim) {
      const ini = new Date(run.periodo_inicio);
      const fim = new Date(run.periodo_fim);
      const fmt = (d: Date) => d.toLocaleDateString('pt-BR');
      return `${fmt(ini)} — ${fmt(fim)}`;
    }
    return `últimos ${run.periodo_dias} dias`;
  }

  impactoRun(run: AnaliseRun): number {
    const venda = run.summary?.vendaTrimestre ?? 0;
    const indice = run.summary?.indiceFaltas ?? 0;
    return venda * (indice / 100);
  }

  private async salvarNatasha(runId: string, report: string): Promise<void> {
    try {
      await this.api.patch(`/analise-runs/${runId}/natasha-report`, { natasha_report: report });
    } catch (err) {
      console.error('Erro ao salvar natasha_report', err);
      this.genError.set('Relatório gerado, mas não foi possível salvar no histórico.');
    }
  }

  async excluirAnalise(run: AnaliseRun): Promise<void> {
    if (!confirm('Deseja excluir esta análise? Esta ação não poderá ser desfeita.')) return;
    try {
      await this.api.delete(`/analise-runs/${run.id}`);
      this.runs.set(this.runs().filter((r) => r.id !== run.id));
      if (this.selectedRunId() === run.id) {
        this.selectedRun.set(null);
        this.selectedActionPlan.set(null);
        this.natashaReport.set(null);
      }
    } catch (error: any) {
      this.genError.set(error.message || 'Erro ao excluir análise.');
    }
  }
}
