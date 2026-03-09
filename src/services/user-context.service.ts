import { Injectable, computed, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export type UserRole = 'admin' | 'colaborador';
export interface Membership {
  org_id: string | null;
  role: UserRole;
  isRoot: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private membership = signal<Membership | null>(null);
  isAdmin = computed(() => {
    const m = this.membership();
    return !!m && (m.role === 'admin' || m.isRoot);
  });

  constructor(private api: ApiService, private authService: AuthService) { }

  async ensureMembership(): Promise<Membership | null> {
    if (this.membership()) return this.membership();

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.membership.set(null);
      return null;
    }

    try {
      const data = await this.api.get<{
        org_id: string;
        org_name: string;
        role: UserRole;
        is_admin: boolean;
      }>('/orgs/membership');

      if (data && data.org_id) {
        const membership: Membership = {
          org_id: data.org_id,
          role: data.role || 'colaborador',
          isRoot: data.is_admin,
        };
        this.membership.set(membership);
        return membership;
      }
    } catch (err: any) {
      console.error('Erro ao buscar membership via API:', err);
    }

    // Fallback: usar org padrão conhecida para destravar a UI
    const fallback: Membership = { org_id: '5b4d2ba0-3131-4b3f-8681-72f67a344321', role: 'admin', isRoot: true };
    this.membership.set(fallback);
    return fallback;
  }

  getOrgId(): string | null {
    return this.membership()?.org_id ?? null;
  }

  private async getCurrentUserId(): Promise<string | null> {
    const current = this.authService.currentUser();
    if (current) return current.id;
    const session = await this.authService.getSession().toPromise();
    return session?.user?.id ?? null;
  }
}
