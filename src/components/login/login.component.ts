


import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="flex items-center justify-center min-h-[calc(100vh-14rem)]">
  <div class="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold text-slate-800">Acessar Plataforma</h2>
      <p class="text-slate-600 mt-2">
        Entre com suas credenciais para continuar.
      </p>
    </div>

    @if (isMagicLinkSent()) {
      <div class="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-r-lg" role="alert">
        <p class="font-bold">Verifique seu e-mail!</p>
        <p>Enviamos um link de acesso para {{ email() }}.</p>
      </div>
    } @else {
      <form (ngSubmit)="handleLogin()" class="space-y-6">
        <div>
          <label for="email" class="block text-sm font-medium text-slate-700">Email</label>
          <div class="mt-1">
            <input id="email" name="email" type="email" autocomplete="email" required 
                   [ngModel]="email()" (ngModelChange)="email.set($event)"
                   class="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
          </div>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-slate-700">Senha</label>
          <div class="mt-1">
            <input id="password" name="password" type="password" autocomplete="current-password" required 
                   [ngModel]="password()" (ngModelChange)="password.set($event)"
                   class="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
          </div>
        </div>

        @if (error()) {
          <div class="text-red-600 text-sm text-center">{{ error() }}</div>
        }

        <div>
          <button type="submit" [disabled]="isLoading()" 
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
            @if(isLoading()){ <span class="animate-spin h-5 w-5 mr-3 border-2 border-white border-t-transparent rounded-full"></span> }
            Entrar
          </button>
        </div>
      </form>

      <div class="mt-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-slate-500">Ou entre com</span>
          </div>
        </div>

        <div class="mt-6">
          <button (click)="handleMagicLink()" [disabled]="isLoading() || !email()"
                  class="w-full inline-flex justify-center py-2 px-4 border border-slate-300 rounded-md shadow-sm bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Magic Link de Acesso
          </button>
        </div>
      </div>
    }
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  isMagicLinkSent = signal(false);
  error = signal<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  async handleLogin(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.authService.signInWithPassword(this.email(), this.password());
      this.router.navigate(['/clients']);
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao fazer login.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleMagicLink(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.isMagicLinkSent.set(false);
    try {
      await this.authService.signInWithOtp(this.email());
      this.isMagicLinkSent.set(true);
    } catch (e: any) {
      this.error.set(e.message || 'Erro ao enviar o link de acesso.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
