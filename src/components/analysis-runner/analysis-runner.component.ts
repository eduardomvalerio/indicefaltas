

import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { AnalysisResult } from '../../models/product.model';
import { ActionPlan } from '../../models/action-plan.model';
import { PersistAnalysisService } from '../../services/persist-analysis.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../environments/environment';
import { UserContextService } from '../../services/user-context.service';
import { ActionPlanService } from '../../services/action-plan.service';
import { ActionPlanViewComponent } from '../action-plan-view/action-plan-view.component';

@Component({
  selector: 'app-analysis-runner',
  standalone: true,
  imports: [CommonModule, FormsModule, FileUploaderComponent, DashboardComponent, ActionPlanViewComponent],
  template: `
@if (!analysisResult()) {
  <div class="mb-4 bg-white p-4 rounded-md shadow-sm border border-slate-100">
    <h3 class="text-sm font-semibold text-slate-700 mb-3">Período da análise (dados enviados)</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="text-sm text-slate-600 flex flex-col gap-1">
        Data inicial
        <input type="date" class="border border-slate-300 rounded-md px-3 py-2 text-sm"
               [(ngModel)]="periodoInicio">
      </label>
      <label class="text-sm text-slate-600 flex flex-col gap-1">
        Data final
        <input type="date" class="border border-slate-300 rounded-md px-3 py-2 text-sm"
               [(ngModel)]="periodoFim">
      </label>
    </div>
    <p class="text-xs text-slate-500 mt-2">Opcional: use para registrar a faixa de datas coberta pelos arquivos (ex.: últimos 90 dias).</p>
  </div>

  <app-file-uploader 
    (analysisComplete)="onAnalysisComplete($event)"
  ></app-file-uploader>
} @else {
  <div class="mb-4 flex justify-end">
    <button (click)="startOver()" class="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors text-sm font-medium flex items-center">
       <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 9a9 9 0 0114.24-4.97M20 15a9 9 0 01-14.24 4.97" />
      </svg>
      Analisar Novos Arquivos
    </button>
  </div>

  @if(isSaving()){
    <div class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 rounded-r-lg flex items-center">
      <div class="animate-spin h-5 w-5 mr-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      Salvando resultado da análise na nuvem...
    </div>
  }
  @if(saveError()){
     <div class="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
        <p class="font-bold">Erro ao Salvar</p>
        <p>{{ saveError() }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button class="px-3 py-1 text-sm rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-50"
                  (click)="startOver()">
            Enviar planilhas
          </button>
          <button class="px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                  (click)="reexecutarAnalise()">
            Reexecutar análise
          </button>
        </div>
      </div>
  }
  @if (actionPlan()) {
    <div class="mb-6">
      <app-action-plan-view [plan]="actionPlan()"></app-action-plan-view>
    </div>
  }

  <app-dashboard [analysisResult]="analysisResult()!"></app-dashboard>
}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisRunnerComponent implements OnInit {
  analysisResult = signal<AnalysisResult | null>(null);
  actionPlan = signal<ActionPlan | null>(null);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  periodoInicio = '';
  periodoFim = '';

  private clientId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private persistService: PersistAnalysisService,
    private authService: AuthService,
    private userContext: UserContextService,
    private actionPlanService: ActionPlanService
  ) { }

  ngOnInit(): void {
    this.clientId = this.route.parent?.snapshot.paramMap.get('clientId') ?? null;
  }

  async onAnalysisComplete(result: AnalysisResult): Promise<void> {
    this.analysisResult.set(result);
    this.actionPlan.set(
      this.actionPlanService.buildPlan(result.consolidated ?? [], environment.DEFAULT_LEAD_TIME_DAYS)
    );
    const { topFaltas, topExcessos, topParados } = this.computeTops(result);

    if (environment.enableCloudSave && this.clientId) {
      this.isSaving.set(true);
      this.saveError.set(null);
      try {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const orgId = await this.resolveOrgId(user.id);
        if (!orgId) throw new Error('Organização do usuário não encontrada.');

        const runPayload = {
          org_id: orgId,
          cliente_id: this.clientId,
          created_by: user.id,
          periodo_dias: 90,
          periodo_inicio: this.periodoInicio || null,
          periodo_fim: this.periodoFim || null,
          algoritmo_versao: 'v1.0.1',
          path_vendas: null,
          path_inventario: null,
          summary: result.summary,
          action_plan: this.actionPlan(),
          top_faltas: topFaltas,
          top_excessos: topExcessos,
          top_parados: topParados,
          consolidated: result.consolidated ?? null,
          faltas: result.faltas ?? null,
          parados: result.parados ?? null,
        };
        await this.saveRunWithSizeFallback(runPayload);
      } catch (e: any) {
        this.saveError.set(e.message || 'Erro ao salvar a análise na nuvem.');
        console.error(e);
      } finally {
        this.isSaving.set(false);
      }
    }
  }

  startOver(): void {
    this.analysisResult.set(null);
    this.actionPlan.set(null);
    this.saveError.set(null);
    this.periodoInicio = '';
    this.periodoFim = '';
  }

  reexecutarAnalise(): void {
    this.startOver();
  }

  private computeTops(result: AnalysisResult): { topFaltas: any[]; topExcessos: any[]; topParados: any[] } {
    const formatItem = (p: any) => ({
      descricao: p.descricaoConsolidada,
      curva: p.Curva_ABC,
      ean: p.EAN_consolidado,
      codigo_interno: p.codigoInterno,
      falta: !!p.flag_falta,
      excesso_valor: p.excessoValor ?? 0,
      custo_unitario: p.custoUnitario ?? 0,
      estoque_atual: p.estoqueAtualConsolidado ?? p.estoqueAtualInventario ?? p.estoqueAtualVendas ?? 0,
      venda_liquida_90d: p.valorVendaLiquidaTotal ?? 0,
      quantidade_vendida_90d: p.quantidadeVendida90d ?? 0,
    });

    const faltas = (result.faltas || [])
      .filter((p) => p.flag_falta)
      .sort((a, b) => (b.valorVendaLiquidaTotal ?? 0) - (a.valorVendaLiquidaTotal ?? 0))
      .slice(0, 20)
      .map(formatItem);

    const excessos = (result.consolidated || [])
      .filter((p) => (p.excessoValor ?? 0) > 0 || p.flag_excesso)
      .sort((a, b) => (b.excessoValor ?? 0) - (a.excessoValor ?? 0))
      .slice(0, 20)
      .map(formatItem);

    const parados = (result.parados || [])
      .filter((p) => p.flag_parado)
      .sort((a, b) => (b.custoUnitario ?? 0) - (a.custoUnitario ?? 0))
      .slice(0, 10)
      .map(formatItem);

    return { topFaltas: faltas, topExcessos: excessos, topParados: parados };
  }

  private isOversizedPayloadError(error: any): boolean {
    const msg = String(error?.message || '').toLowerCase();
    return (
      msg.includes('request entity too large') ||
      msg.includes('payloadtoolargeerror') ||
      msg.includes('erro 413') ||
      msg.includes('413') ||
      msg.includes('bsonobj size') ||
      msg.includes('object to large')
    );
  }

  private async saveRunWithSizeFallback(payload: any): Promise<void> {
    try {
      await this.persistService.saveRun(payload);
    } catch (error: any) {
      if (!this.isOversizedPayloadError(error)) throw error;

      console.warn('Payload muito grande para salvar completo. Persistindo run em modo compacto.');
      await this.persistService.saveRun({
        ...payload,
        consolidated: null,
        faltas: null,
        parados: null,
      });
    }
  }

  private async resolveOrgId(userId: string): Promise<string | null> {
    const ctx = await this.userContext.ensureMembership();
    if (ctx?.org_id) return ctx.org_id;
    // Último recurso: org padrão conhecida
    return '5b4d2ba0-3131-4b3f-8681-72f67a344321';
  }
}
