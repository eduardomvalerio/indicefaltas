

import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { AnalysisResult } from '../../models/product.model';
import { PersistAnalysisService } from '../../services/persist-analysis.service';
import { FileStorageService } from '../../services/file-storage.service';
import { AuthService } from '../../services/auth.service';
import { SupaService } from '../../services/supa.service';
import { environment } from '../../environments/environment';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-analysis-runner',
  standalone: true,
  imports: [CommonModule, FileUploaderComponent, DashboardComponent],
  template: `
@if (!analysisResult()) {
  <app-file-uploader 
    (analysisComplete)="onAnalysisComplete($event)"
    (filesSelected)="handleFileSelection($event)"
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
      </div>
  }

  <app-dashboard [analysisResult]="analysisResult()!"></app-dashboard>
}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisRunnerComponent implements OnInit {
  analysisResult = signal<AnalysisResult | null>(null);
  isSaving = signal(false);
  saveError = signal<string | null>(null);

  private clientId: string | null = null;
  private salesFile: File | null = null;
  private inventoryFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private persistService: PersistAnalysisService,
    private storageService: FileStorageService,
    private authService: AuthService,
    private supaService: SupaService,
    private userContext: UserContextService
  ) {}

  ngOnInit(): void {
    this.clientId = this.route.parent?.snapshot.paramMap.get('clientId') ?? null;
  }

  handleFileSelection(files: { sales: File; inventory: File }): void {
    this.salesFile = files.sales;
    this.inventoryFile = files.inventory;
  }

  async onAnalysisComplete(result: AnalysisResult): Promise<void> {
    this.analysisResult.set(result);

    if (environment.enableCloudSave && this.clientId && this.salesFile && this.inventoryFile) {
      this.isSaving.set(true);
      this.saveError.set(null);
      try {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const orgId = await this.resolveOrgId(user.id);
        if (!orgId) throw new Error('Organização do usuário não encontrada.');

        const datePrefix = new Date().toISOString().slice(0, 10);
        const basePath = `${orgId}/${this.clientId}/${datePrefix}_${Date.now()}`;

        const pathVendas = await this.storageService.upload(
          'farmacia-analises',
          `${basePath}/vendas.xlsx`,
          this.salesFile
        );
        const pathInventario = await this.storageService.upload(
          'farmacia-analises',
          `${basePath}/inventario.xlsx`,
          this.inventoryFile
        );

        await this.persistService.saveRun({
          org_id: orgId,
          cliente_id: this.clientId,
          created_by: user.id,
          periodo_dias: 90,
          algoritmo_versao: 'v1.0.1',
          path_vendas: pathVendas,
          path_inventario: pathInventario,
          summary: result.summary,
        });
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
    this.salesFile = null;
    this.inventoryFile = null;
  }

  private async resolveOrgId(userId: string): Promise<string | null> {
    // 1) Tenta o contexto já carregado
    const ctx = await this.userContext.ensureMembership();
    if (ctx?.org_id) return ctx.org_id;

    // 2) Tenta RPC current_org_id (RLS-friendly)
    try {
      const { data } = await this.supaService.client.rpc('current_org_id');
      if (data) return data as string;
    } catch (err) {
      console.error('Erro ao consultar current_org_id()', err);
    }

    // 3) Tenta org_members (maybeSingle evita erro 406)
    try {
      const { data } = await this.supaService.client
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (data?.org_id) return data.org_id as string;
    } catch (err) {
      console.error('Erro ao consultar org_members', err);
    }

    // 4) Último recurso: org padrão conhecida
    return '5b4d2ba0-3131-4b3f-8681-72f67a344321';
  }
}
