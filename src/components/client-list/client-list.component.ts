


import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupaService } from '../../services/supa.service';
import { UserContextService } from '../../services/user-context.service';
import { Cliente } from '../../models/supabase.model';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-800">Selecione um Cliente</h1>
    <p class="text-slate-600 mt-1">Escolha um cliente para iniciar uma nova análise ou ver o histórico.</p>
    @if (isAdmin()) {
      <div class="mt-3 flex items-center space-x-3">
        <a routerLink="/settings" class="inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700">
          + Cadastrar cliente
        </a>
      </div>
    }
  </div>

  @if (isLoading()) {
    <div class="text-center p-8">
      <div class="animate-spin h-8 w-8 text-sky-600 mx-auto"></div>
      <p class="mt-2 text-slate-500">Carregando clientes...</p>
    </div>
  } @else if (error()) {
    <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg" role="alert">
      <p class="font-bold">Erro</p>
      <p>{{ error() }}</p>
    </div>
  } @else if (clients().length === 0) {
    <div class="text-center py-12 px-6 bg-white rounded-lg shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0012 15a5.975 5.975 0 00-3-5.197M15 21a9 9 0 00-9-5.197" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-slate-900">Nenhum cliente encontrado</h3>
      <p class="mt-1 text-sm text-slate-500">
        Não há clientes cadastrados para sua organização.
      </p>
    </div>
  } @else {
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      @for (client of clients(); track client.id) {
        <a [routerLink]="['/clients', client.id]" class="block p-6 bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-sky-100 text-sky-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-md font-bold text-slate-800 truncate">{{ client.nome_fantasia }}</p>
              <p class="text-sm text-slate-500 truncate">{{ client.cidade }} - {{ client.uf }}</p>
            </div>
          </div>
        </a>
      }
    </div>
  }
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientListComponent implements OnInit {
  clients = signal<Cliente[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isAdmin = this.userContext.isAdmin;

  constructor(private supaService: SupaService, private userContext: UserContextService) {}

  ngOnInit(): void {
    this.userContext.ensureMembership();
    this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supaService.client.from('clientes').select('*');
      if (error) throw error;
      this.clients.set(data as Cliente[]);
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao buscar clientes.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
