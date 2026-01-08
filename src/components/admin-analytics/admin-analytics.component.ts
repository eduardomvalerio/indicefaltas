import { Component, ChangeDetectionStrategy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SupaService } from '../../services/supa.service';
import { Cliente } from '../../models/supabase.model';

interface AnalysisByClient {
  clientId: string;
  name: string;
  city?: string;
  uf?: string;
  count: number;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatDateInput = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const toStartIso = (dateInput: string) => new Date(`${dateInput}T00:00:00`).toISOString();
const toEndIso = (dateInput: string) => new Date(`${dateInput}T23:59:59.999`).toISOString();
const formatDateDisplay = (dateInput: string) =>
  new Date(`${dateInput}T00:00:00`).toLocaleDateString('pt-BR');

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="max-w-5xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-800">Painel Administrativo</h1>
      <p class="text-sm text-slate-500">Acompanhe a quantidade de análises por empresa no período selecionado.</p>
    </div>

    <div class="bg-white p-6 rounded-lg shadow-lg space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-slate-700">Início</label>
          <input
            type="date"
            class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
            [ngModel]="startDate()"
            (ngModelChange)="startDate.set($event)"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Fim</label>
          <input
            type="date"
            class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
            [ngModel]="endDate()"
            (ngModelChange)="endDate.set($event)"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            class="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-semibold hover:bg-sky-700"
            (click)="loadAnalytics()"
            [disabled]="isLoading()"
          >
            Atualizar
          </button>
          <button
            class="px-3 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
            (click)="setCurrentMonth()"
            [disabled]="isLoading()"
          >
            Mês atual
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-500">Período: {{ periodLabel() }}</p>
    </div>

    @if (isLoading()) {
      <div class="text-center p-8">
        <div class="animate-spin h-8 w-8 text-sky-600 mx-auto"></div>
        <p class="mt-2 text-slate-500">Carregando painel...</p>
      </div>
    } @else if (error()) {
      <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
        <p class="font-semibold">Erro ao carregar painel</p>
        <p>{{ error() }}</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p class="text-xs text-slate-500 uppercase">Total de análises</p>
          <p class="text-2xl font-bold text-slate-800">{{ totalRuns() }}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p class="text-xs text-slate-500 uppercase">Empresas com análises</p>
          <p class="text-2xl font-bold text-slate-800">{{ totalClients() }}</p>
        </div>
        <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
          <p class="text-xs text-slate-500 uppercase">Média por empresa</p>
          <p class="text-2xl font-bold text-slate-800">{{ averageRuns() }}</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-lg">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Análises por empresa</h2>

        @if (analysisByClient().length === 0) {
          <p class="text-sm text-slate-500">Nenhuma análise encontrada neste período.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Empresa</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qtd. análises</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                @for (row of analysisByClient(); track row.clientId) {
                  <tr>
                    <td class="px-4 py-3 text-sm text-slate-800">
                      <p class="font-semibold">{{ row.name }}</p>
                      @if (row.city || row.uf) {
                        <p class="text-xs text-slate-500">{{ row.city }} {{ row.uf ? '· ' + row.uf : '' }}</p>
                      }
                    </td>
                    <td class="px-4 py-3 text-sm text-right font-semibold text-slate-800">{{ row.count }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAnalyticsComponent implements OnInit {
  startDate = signal<string>(formatDateInput(startOfMonth(new Date())));
  endDate = signal<string>(formatDateInput(new Date()));
  isLoading = signal(false);
  error = signal<string | null>(null);
  analysisByClient = signal<AnalysisByClient[]>([]);
  totalRuns = signal(0);
  totalClients = signal(0);

  periodLabel = computed(() => `${formatDateDisplay(this.startDate())} — ${formatDateDisplay(this.endDate())}`);
  averageRuns = computed(() => {
    const total = this.totalRuns();
    const companies = this.totalClients();
    if (!companies) return '0';
    return (total / companies).toFixed(1);
  });

  private clientsById = new Map<string, Cliente>();
  private clientsLoaded = false;

  constructor(private supaService: SupaService) {}

  async ngOnInit(): Promise<void> {
    await this.loadClients();
    await this.loadAnalytics();
  }

  async loadClients(): Promise<void> {
    if (this.clientsLoaded) return;
    const { data, error } = await this.supaService.client
      .from('clientes')
      .select('id, nome_fantasia, cidade, uf')
      .order('nome_fantasia', { ascending: true });
    if (!error && data) {
      data.forEach((row) => {
        this.clientsById.set(row.id, row as Cliente);
      });
      this.clientsLoaded = true;
    }
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const startIso = toStartIso(this.startDate());
      const endIso = toEndIso(this.endDate());

      const { data, error } = await this.supaService.client
        .from('analise_runs')
        .select('id, cliente_id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (error) throw error;

      const runs = data ?? [];
      const counts = new Map<string, number>();
      runs.forEach((run: any) => {
        const clientId = run.cliente_id as string;
        counts.set(clientId, (counts.get(clientId) ?? 0) + 1);
      });

      const rows: AnalysisByClient[] = Array.from(counts.entries()).map(([clientId, count]) => {
        const client = this.clientsById.get(clientId);
        return {
          clientId,
          name: client?.nome_fantasia ?? 'Cliente removido',
          city: client?.cidade,
          uf: client?.uf,
          count,
        };
      });

      rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      this.analysisByClient.set(rows);
      this.totalRuns.set(runs.length);
      this.totalClients.set(rows.length);
    } catch (err: any) {
      this.error.set(err?.message || 'Erro ao carregar as análises.');
    } finally {
      this.isLoading.set(false);
    }
  }

  setCurrentMonth(): void {
    const now = new Date();
    this.startDate.set(formatDateInput(startOfMonth(now)));
    this.endDate.set(formatDateInput(now));
  }
}
