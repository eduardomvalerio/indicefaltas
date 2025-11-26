import { Component, ChangeDetectionStrategy, effect, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { User } from '@supabase/supabase-js';

import { AuthService } from './services/auth.service';
import { SupaService } from './services/supa.service';
import { UserContextService } from './services/user-context.service';
import { Cliente } from './models/supabase.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
<div class="min-h-screen bg-slate-100 text-slate-800">
  <header class="bg-white shadow-md sticky top-0 z-10">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center cursor-pointer" [routerLink]="['/']">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h3m-3-10h.01M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01M4 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
          </svg>
          <h1 class="text-xl font-bold text-slate-700 ml-2">Analisador de Estoque de Farmácia</h1>
        </div>

        @if (currentUser()) {
            <div class="flex items-center space-x-4">
              @if (clients().length > 0) {
                <div class="hidden sm:block">
                  <label class="text-xs text-slate-500">Selecionar cliente</label>
                  <select class="ml-2 border border-slate-300 rounded-md text-sm px-2 py-1"
                          [ngModel]="selectedClientId()"
                          (ngModelChange)="onSelectClient($event)">
                    <option [ngValue]="null">Clientes</option>
                    @for (c of clients(); track c.id) {
                      <option [ngValue]="c.id">{{ c.nome_fantasia }}</option>
                    }
                  </select>
                </div>
              }

            @if (isAdmin()) {
              <div class="flex items-center space-x-3">
                <a class="text-sm text-sky-600 hover:underline font-medium" routerLink="/settings">Configurações</a>
                <a class="text-sm text-sky-600 hover:underline font-medium" routerLink="/settings/users">Usuários</a>
              </div>
            }

            <div class="text-right">
              <p class="text-sm font-medium text-slate-800">{{ currentUser()?.email }}</p>
            </div>
            <button (click)="logout()" class="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors text-sm font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair
            </button>
          </div>
        }
      </div>
    </div>
  </header>

  <main class="container mx-auto p-4 sm:p-6 lg:p-8">
    <router-outlet></router-outlet>
  </main>

  <footer class="text-center py-4 text-sm text-slate-500">
      Desenvolvido para análise de estoque.
  </footer>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
})
export class AppComponent {
  currentUser: Signal<User | null>;
  clients = signal<Cliente[]>([]);
  selectedClientId = signal<string | null>(null);
  isAdmin = this.userContext.isAdmin;

  constructor(
    private authService: AuthService,
    private router: Router,
    private supaService: SupaService,
    private userContext: UserContextService
  ) {
    this.currentUser = this.authService.currentUser;

    effect(() => {
      if (this.authService.authChangeEvent() === 'SIGNED_OUT') {
        this.router.navigate(['/login']);
      }
    });

    effect(() => {
      if (this.currentUser()) {
        this.userContext.ensureMembership().then(() => this.loadClients());
      } else {
        this.clients.set([]);
        this.selectedClientId.set(null);
      }
    }, { allowSignalWrites: true });

    // Recarrega a lista de clientes a cada navegação relevante (ex.: após cadastrar)
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.currentUser()) {
          this.loadClients();
        }
      });
  }

  async loadClients(): Promise<void> {
    const { data, error } = await this.supaService.client
      .from('clientes')
      .select('id, nome_fantasia, cidade, uf')
      .order('nome_fantasia', { ascending: true });
    if (!error && data) {
      this.clients.set(data as Cliente[]);
    }
  }

  onSelectClient(clientId: string | null): void {
    if (!clientId) return;
    this.selectedClientId.set(clientId);
    this.router.navigate(['/clients', clientId]);
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
