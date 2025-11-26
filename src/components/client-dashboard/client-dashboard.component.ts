


import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupaService } from '../../services/supa.service';
import { Cliente } from '../../models/supabase.model';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
@if(isLoading()){
  <div class="text-center p-8"><div class="animate-spin h-8 w-8 text-sky-600 mx-auto"></div></div>
} @else if(client()){
  <div class="w-full">
    <div class="mb-6">
      <a routerLink="/clients" class="text-sm text-sky-600 hover:underline mb-2 inline-block">&larr; Voltar para Clientes</a>
      <h1 class="text-2xl font-bold text-slate-800">{{ client()?.nome_fantasia }}</h1>
      <p class="text-slate-500">{{ client()?.cidade }} - {{ client()?.uf }}</p>
    </div>

    <div class="mb-6 border-b border-slate-200">
      <nav class="-mb-px flex space-x-6" aria-label="Tabs">
        <a routerLink="new-analysis" routerLinkActive="border-sky-500 text-sky-600"
           [routerLinkActiveOptions]="{ exact: true }"
           class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          Nova Análise
        </a>
        <a routerLink="history" routerLinkActive="border-sky-500 text-sky-600"
           [routerLinkActiveOptions]="{ exact: true }"
           class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          Histórico
        </a>
      </nav>
    </div>

    <router-outlet></router-outlet>
  </div>
} @else {
  <div class="text-center p-8 bg-white rounded-lg shadow-sm">
    <h2 class="text-lg font-semibold text-red-700">Cliente não encontrado</h2>
    <p class="text-slate-600 mt-2">O cliente que você está procurando não existe ou você não tem permissão para vê-lo.</p>
  </div>
}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDashboardComponent implements OnInit {
  client = signal<Cliente | null>(null);
  clientId = signal<string | null>(null);
  isLoading = signal(true);

  constructor(private route: ActivatedRoute, private supaService: SupaService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('clientId');
      if (id) {
        this.clientId.set(id);
        this.loadClient(id);
      }
    });
  }

  async loadClient(id: string): Promise<void> {
    this.isLoading.set(true);
    const { data, error } = await this.supaService.client
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Cliente não encontrado:', error);
    } else {
      this.client.set(data as Cliente);
    }
    this.isLoading.set(false);
  }
}
