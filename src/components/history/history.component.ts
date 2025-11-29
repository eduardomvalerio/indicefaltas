


import { Component, ChangeDetectionStrategy, signal, OnInit, AfterViewInit, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SupaService } from '../../services/supa.service';
import { AnaliseRun } from '../../models/supabase.model';
import { AssistantService, FarmaciaContext } from '../../services/assistant.service';
import { Cliente } from '../../models/supabase.model';

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
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Período analisado</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">% Faltas (Geral)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Excesso (R$)</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dias de Estoque</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Análise</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Análise Natasha</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-slate-200">
            @for(run of runs(); track run.id){
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{{ run.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{{ formatPeriodo(run) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">{{ run.summary.indiceFaltas | number:'1.2-2' }}%</td>
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
                    @else {Análise Natasha}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if(natashaReport()){
        <div class="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-slate-800">Relatório Natasha</h3>
            <div class="space-x-2">
              <button class="px-3 py-1 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-100"
                      (click)="exportarPDF()">
                Exportar PDF
              </button>
              <button class="px-3 py-1 text-slate-500 text-sm hover:text-slate-700" (click)="limparRelatorio()">Fechar</button>
            </div>
          </div>
          <div class="prose max-w-none text-justify leading-relaxed whitespace-pre-line">{{ natashaReport() }}</div>
        </div>
      }

      @if(genError()){
        <div class="mt-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
          <p class="font-semibold">Erro na análise Natasha</p>
          <p>{{ genError() }}</p>
        </div>
      }

      @if(selectedRun()){
        <div class="mt-8 bg-white p-6 rounded-lg shadow-lg border border-slate-200">
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
              <thead class="bg-slate-50">
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
                  <tr>
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
                          (click)="downloadCsv('faltas', getFaltas(selectedRun()!))">Baixar CSV</button>
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
                          (click)="downloadCsv('excessos', getExcessos(selectedRun()!))">Baixar CSV</button>
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
                          (click)="downloadCsv('parados', getParados(selectedRun()!))">Baixar CSV</button>
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
                          (click)="downloadCsv('consolidado', selectedRun()?.consolidated || [])">Baixar CSV</button>
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
      }
    </div>
  </div>
}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit, AfterViewInit {
  @ViewChild('historyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  runs = signal<AnaliseRun[]>([]);
  cliente = signal<Cliente | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isGenerating = signal(false);
  genError = signal<string | null>(null);
  natashaReport = signal<string | null>(null);
  selectedRunId = signal<string | null>(null);
  natashaCache = signal<Record<string, string>>({});
  isViewReady = signal(false);
  selectedRun = signal<AnaliseRun | null>(null);
  private chart: any;

  constructor(
    private route: ActivatedRoute,
    private supaService: SupaService,
    private assistant: AssistantService
  ) {
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
      this.loadCliente(clientId);
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

      const runsData = data as AnaliseRun[];
      this.runs.set(runsData);
      // Pré-carrega relatórios já existentes no cache
      const cache: Record<string, string> = {};
      runsData.forEach((r) => {
        if (r.natasha_report) cache[r.id] = r.natasha_report;
      });
      this.natashaCache.set(cache);
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

  async loadCliente(id: string): Promise<void> {
    try {
      const { data, error } = await this.supaService.client.from('clientes').select('*').eq('id', id).maybeSingle();
      if (!error && data) this.cliente.set(data as Cliente);
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
        } else {
          // Não cacheia respostas vazias para permitir tentar novamente
          this.natashaReport.set('Sem resposta');
        }
        this.isGenerating.set(false);
      },
      error: (err) => {
        this.genError.set(err?.message || 'Erro ao gerar análise Natasha.');
        this.isGenerating.set(false);
      },
    });
  }

  limparRelatorio(): void {
    this.natashaReport.set(null);
    this.selectedRunId.set(null);
  }

  verAnalise(run: AnaliseRun): void {
    this.selectedRun.set(run);
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

  downloadCsv(name: string, rows: any[]): void {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarPDF(): void {
    const report = this.natashaReport();
    if (!report) return;
    const titulo = this.cliente()?.nome_fantasia ?? 'Relatório';
    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) return;
    const style = `
      <style>
        body { font-family: "Helvetica Neue", Arial, sans-serif; padding: 32px; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 22px; margin-bottom: 12px; font-weight: 700; }
        p { text-align: justify; }
        .topic { font-weight: 700; margin-top: 12px; margin-bottom: 4px; }
      </style>
    `;
    const html = `
      <html>
        <head>${style}</head>
        <body>
          <h1>${titulo} — Relatório Natasha</h1>
          <pre style="white-space: pre-wrap; text-align: justify;">${report}</pre>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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

  formatPeriodo(run: AnaliseRun): string {
    if (run.periodo_inicio && run.periodo_fim) {
      const ini = new Date(run.periodo_inicio);
      const fim = new Date(run.periodo_fim);
      const fmt = (d: Date) => d.toLocaleDateString('pt-BR');
      return `${fmt(ini)} — ${fmt(fim)}`;
    }
    return `últimos ${run.periodo_dias} dias`;
  }

  private async salvarNatasha(runId: string, report: string): Promise<void> {
    try {
      const { error } = await this.supaService.client
        .from('analise_runs')
        .update({ natasha_report: report })
        .eq('id', runId);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar natasha_report', err);
      // Exibe aviso, mas mantém o relatório em tela/cache
      this.genError.set('Relatório gerado, mas não foi possível salvar no histórico.');
    }
  }

  excluirAnalise(run: AnaliseRun): void {
    if (!confirm('Deseja excluir esta análise? Esta ação não poderá ser desfeita.')) return;
    this.supaService.client
      .from('analise_runs')
      .delete()
      .eq('id', run.id)
      .then(({ error }) => {
        if (error) {
          this.genError.set(error.message || 'Erro ao excluir análise.');
          return;
        }
        this.runs.set(this.runs().filter((r) => r.id !== run.id));
        if (this.selectedRunId() === run.id) {
          this.selectedRun.set(null);
          this.natashaReport.set(null);
        }
      });
  }
}
