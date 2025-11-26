import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { UserContextService } from '../../services/user-context.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="max-w-3xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-slate-500">Configurações</p>
      <h1 class="text-2xl font-bold text-slate-800">Cadastro de Usuários</h1>
      <p class="text-sm text-slate-600">Crie um usuário e vincule à organização atual.</p>
    </div>
    <a routerLink="/clients" class="text-sm text-sky-600 hover:underline">&larr; Voltar</a>
  </div>

  @if (error()) {
    <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
      <p class="font-bold">Erro</p>
      <p>{{ error() }}</p>
    </div>
  }
  @if (success()) {
    <div class="p-4 bg-emerald-50 border-l-4 border-emerald-400 text-emerald-700 rounded-r-lg">
      <p class="font-bold">Usuário criado com sucesso</p>
      <p>ID: {{ createdUserId() }}</p>
    </div>
  }

  <form class="bg-white p-6 rounded-lg shadow-lg space-y-4" (ngSubmit)="createUser()">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700">E-mail</label>
        <input type="email" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="email" name="email" required />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Senha (opcional)</label>
        <input type="text" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
               [(ngModel)]="password" name="password" placeholder="Gera aleatória se vazio" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700">Papel</label>
        <select class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
                [(ngModel)]="role" name="role">
          <option value="admin">Admin</option>
          <option value="colaborador">Colaborador</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Org vinculada</label>
        <input type="text" class="mt-1 block w-full border-slate-300 rounded-md shadow-sm bg-slate-50"
               [value]="orgId || 'Não detectada'" disabled />
      </div>
    </div>

    <div class="flex items-center justify-end space-x-3 pt-2">
      <button type="button" class="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
              (click)="resetForm()">Limpar</button>
      <button type="submit" [disabled]="isSaving() || !orgId"
              class="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-400">
        @if(isSaving()) {
          <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></span>
        }
        Criar usuário
      </button>
    </div>
  </form>

  <div class="bg-white p-6 rounded-lg shadow-lg space-y-4">
    <div>
      <h2 class="text-lg font-semibold text-slate-800">Vincular usuário a empresas</h2>
      <p class="text-sm text-slate-600">Escolha um usuário existente e a empresa (org) para conceder acesso.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-slate-700">Usuário</label>
        <select class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
                [(ngModel)]="selectedUserId" name="selectedUserId">
          @for (u of users(); track u.id) {
            <option [ngValue]="u.id">{{ u.email }}</option>
          }
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Empresa (Org)</label>
        <select class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
                [(ngModel)]="selectedOrgId" name="selectedOrgId">
          @for (o of orgs(); track o.id) {
            <option [ngValue]="o.id">{{ o.name || o.id }}</option>
          }
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Papel</label>
        <select class="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500"
                [(ngModel)]="selectedRoleForOrg" name="selectedRoleForOrg">
          <option value="admin">Admin</option>
          <option value="colaborador">Colaborador</option>
        </select>
      </div>
    </div>

    @if (linkError()) {
      <div class="p-3 bg-red-50 text-red-700 rounded border border-red-100 text-sm">{{ linkError() }}</div>
    }
    @if (linkSuccess()) {
      <div class="p-3 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-sm">{{ linkSuccess() }}</div>
    }

    <div class="flex justify-end">
      <button type="button" (click)="linkUserToOrg()" [disabled]="isLinking() || !selectedUserId() || !selectedOrgId()"
              class="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:bg-slate-400">
        @if(isLinking()){
          <span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></span>
        }
        Salvar vínculo
      </button>
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent implements OnInit {
  email = '';
  password = '';
  role: 'admin' | 'colaborador' = 'colaborador';
  orgId: string | null = null;

  isSaving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  createdUserId = signal<string | null>(null);

  // Gerenciamento de acesso a empresas (orgs)
  users = signal<Array<{ id: string; email: string }>>([]);
  orgs = signal<Array<{ id: string; name: string }>>([]);
  selectedUserId = signal<string | null>(null);
  selectedOrgId = signal<string | null>(null);
  selectedRoleForOrg: 'admin' | 'colaborador' = 'colaborador';
  isLinking = signal(false);
  linkSuccess = signal<string | null>(null);
  linkError = signal<string | null>(null);

  constructor(private adminService: AdminService, private userContext: UserContextService) {}

  async ngOnInit(): Promise<void> {
    const membership = await this.userContext.ensureMembership();
    this.orgId = membership?.org_id ?? null;
    // carrega usuários e orgs para vinculação manual
    this.loadUsers();
    this.loadOrgs();
  }

  async createUser(): Promise<void> {
    this.error.set(null);
    this.success.set(false);
    this.createdUserId.set(null);
    if (!this.orgId) {
      this.error.set('Org não detectada. Faça login novamente.');
      return;
    }
    this.isSaving.set(true);
    try {
      const { userId } = await this.adminService.createUserAndAssign({
        email: this.email,
        password: this.password,
        role: this.role,
        orgId: this.orgId,
      });
      this.createdUserId.set(userId);
      this.success.set(true);
      this.resetForm();
    } catch (err: any) {
      this.error.set(err.message || 'Erro ao criar usuário.');
      console.error(err);
    } finally {
      this.isSaving.set(false);
    }
  }

  resetForm(): void {
    this.email = '';
    this.password = '';
    this.role = 'colaborador';
  }

  async loadUsers(): Promise<void> {
    try {
      const data = await this.adminService.listUsers();
      this.users.set(data);
      if (!this.selectedUserId() && data.length > 0) {
        this.selectedUserId.set(data[0].id);
      }
    } catch (err: any) {
      console.error('Erro ao listar usuários:', err);
    }
  }

  async loadOrgs(): Promise<void> {
    try {
      const data = await this.adminService.listOrgs();
      this.orgs.set(data);
      if (!this.selectedOrgId() && data.length > 0) {
        this.selectedOrgId.set(data[0].id);
      }
    } catch (err: any) {
      console.error('Erro ao listar orgs:', err);
    }
  }

  async linkUserToOrg(): Promise<void> {
    this.linkError.set(null);
    this.linkSuccess.set(null);
    if (!this.selectedUserId() || !this.selectedOrgId()) {
      this.linkError.set('Selecione usuário e empresa.');
      return;
    }
    this.isLinking.set(true);
    try {
      await this.adminService.upsertOrgMember({
        orgId: this.selectedOrgId()!,
        userId: this.selectedUserId()!,
        role: this.selectedRoleForOrg,
      });
      this.linkSuccess.set('Vínculo salvo com sucesso.');
    } catch (err: any) {
      this.linkError.set(err.message || 'Erro ao salvar vínculo.');
      console.error(err);
    } finally {
      this.isLinking.set(false);
    }
  }
}
