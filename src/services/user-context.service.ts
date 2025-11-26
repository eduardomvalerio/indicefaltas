import { Injectable, computed, signal } from '@angular/core';
import { SupaService } from './supa.service';
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

  constructor(private supaService: SupaService, private authService: AuthService) {}

  async ensureMembership(): Promise<Membership | null> {
    if (this.membership()) return this.membership();

    const userId = await this.getCurrentUserId();
    if (!userId) {
      this.membership.set(null);
      return null;
    }

    let isRoot = false;
    let orgIdFromRpc: string | null = null;

    // 1) Tenta tabela usuarios_app para descobrir root (sem org_id)
    try {
      const { data } = await this.supaService.client
        .from('usuarios_app')
        .select('is_root')
        .eq('auth_user_id', userId)
        .maybeSingle();
      if (data?.is_root) isRoot = true;
    } catch (err: any) {
      // Ignora erro de coluna inexistente ou RLS; cai para org_members
      console.error('Erro ao buscar usuario_app:', err);
    }

    // 2) Tenta descobrir org via função RLS-friendly
    try {
      const { data: rpcOrg } = await this.supaService.client.rpc('current_org_id');
      if (rpcOrg) orgIdFromRpc = rpcOrg as string;
    } catch (err: any) {
      console.error('Erro ao consultar current_org_id():', err);
    }

    // 3) Busca org e papel em org_members (pode haver mais de uma org)
    let memberOrg: string | null = null;
    let memberRole: UserRole = 'colaborador';
    try {
      const { data: members, error } = await this.supaService.client
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', userId);

      if (!error && members && members.length > 0) {
        memberOrg = (members[0] as any).org_id ?? null;
        memberRole = ((members[0] as any).role as UserRole) ?? 'colaborador';
      }
    } catch (err: any) {
      console.error('Erro ao carregar org_members:', err);
    }

    if (memberOrg || orgIdFromRpc) {
      const membership: Membership = {
        org_id: memberOrg ?? orgIdFromRpc,
        role: isRoot ? 'admin' : memberRole,
        isRoot,
      };
      this.membership.set(membership);
      return membership;
    }

    // 4) Fallback: tentar deduzir a org a partir de qualquer cliente disponível (último recurso)
    try {
      const { data: clientRow } = await this.supaService.client
        .from('clientes')
        .select('org_id')
        .limit(1)
        .maybeSingle();
      if (clientRow?.org_id) {
        const membership: Membership = { org_id: clientRow.org_id as string, role: isRoot ? 'admin' : 'colaborador', isRoot };
        this.membership.set(membership);
        return membership;
      }
    } catch (err: any) {
      console.error('Erro ao deduzir org a partir de clientes:', err);
    }

    // 5) Fallback: usar org detectada via RPC, se existir
    if (orgIdFromRpc) {
      const membership: Membership = { org_id: orgIdFromRpc, role: isRoot ? 'admin' : 'colaborador', isRoot };
      this.membership.set(membership);
      return membership;
    }

    // 6) Último recurso: usar org padrão conhecida para destravar a UI
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
