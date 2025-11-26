import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SupaService } from '../../services/supa.service';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="max-w-3xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-slate-500">Configurações</p>
      <h1 class="text-2xl font-bold text-slate-800">Cadastro de Empresas (Clientes)</h1>
    </div>
    <button class="text-sky-600 text-sm hover:underline" routerLink="/clients">&larr; Voltar</button>
  </div>

  @if (error()) {
    <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg" role="alert">
      <p class="font-bold">Erro</p>
      <p>{{ error() }}</p>
    </div>
  }

  @if (success()) {
    <div class="p-4 bg-emerald-50 border-l-4 border-emerald-400 text-emerald-700 rounded-r-lg" role="alert">
      <p class="font-bold">Cliente cadastrado com sucesso</p>
      <p>Você já pode selecioná-lo na lista de clientes.</p>
    </div>
  }

  <form class="bg-white p-6 rounded-lg shadow-lg space-y-4" (ngSubmit)="createClient()">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700">Nome Fantasia</label>
        <input type="text" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="nomeFantasia" name="nomeFantasia" required />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">CNPJ</label>
        <input type="text" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="cnpj" name="cnpj" required />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700">Cidade</label>
        <input type="text" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="cidade" name="cidade" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">UF</label>
        <input type="text" maxlength="2" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="uf" name="uf" />
      </div>
    </div>

    <div class="flex items-center justify-end space-x-3 pt-2">
      <button type="button" class="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
              (click)="resetForm()">Limpar</button>
      <button type="submit" [disabled]="isSaving()" class="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-400">
        @if(isSaving()) {
          <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></span>
        }
        Salvar cliente
      </button>
    </div>
  </form>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  nomeFantasia = '';
  cnpj = '';
  cidade = '';
  uf = '';

  isSaving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  private orgId: string | null = null;

  constructor(
    private supaService: SupaService,
    private userContext: UserContextService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const membership = await this.userContext.ensureMembership();
    this.orgId = membership?.org_id ?? null;
    if (!this.orgId) {
      // tenta novamente via ensureMembership (rpc fallback)
      const retry = await this.userContext.ensureMembership();
      this.orgId = retry?.org_id ?? null;
    }
    if (!this.orgId) {
      // tenta deduzir org por qualquer cliente existente
      try {
        const { data: clientRow } = await this.supaService.client
          .from('clientes')
          .select('org_id')
          .limit(1)
          .maybeSingle();
        this.orgId = (clientRow as any)?.org_id ?? null;
      } catch (err) {
        console.error('Erro ao deduzir org a partir de clientes:', err);
      }
    }
    if (!this.orgId) {
      // último recurso: org padrão usada pelo contexto
      this.orgId = '5b4d2ba0-3131-4b3f-8681-72f67a344321';
    }
    if (!this.orgId) {
      this.error.set('Não foi possível identificar a organização do usuário.');
    }
  }

  async createClient(): Promise<void> {
    if (!this.orgId) {
      const membership = await this.userContext.ensureMembership();
      this.orgId = membership?.org_id ?? null;
    }
    if (!this.orgId) {
      this.error.set('Organização não encontrada.');
      return;
    }
    this.isSaving.set(true);
    this.error.set(null);
    this.success.set(false);
    try {
      const { error } = await this.supaService.client
        .from('clientes')
        .insert({
          org_id: this.orgId,
          nome_fantasia: this.nomeFantasia,
          cnpj: this.cnpj,
          cidade: this.cidade,
          uf: this.uf.toUpperCase(),
        });
      if (error) throw error;
      this.success.set(true);
      this.resetForm();
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao salvar cliente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.nomeFantasia = '';
    this.cnpj = '';
    this.cidade = '';
    this.uf = '';
  }
}
