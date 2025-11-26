import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private adminClient: SupabaseClient;

  constructor() {
    this.adminClient = createClient(
      environment.NG_APP_SUPABASE_URL,
      environment.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          storageKey: 'sr-admin-client',
        },
      }
    );
  }

  async createUserAndAssign(params: {
    email: string;
    password?: string;
    role: 'admin' | 'colaborador';
    orgId: string;
  }): Promise<{ userId: string }> {
    const pwd = params.password && params.password.trim().length > 0
      ? params.password
      : crypto.randomUUID();

    let userId: string | undefined;

    const { data, error } = await this.adminClient.auth.admin.createUser({
      email: params.email,
      password: pwd,
      email_confirm: true,
    });

    if (error) {
      // Se já existir, tenta localizar pelo e-mail e apenas vincular
      const alreadyExists = error.message?.toLowerCase().includes('already been registered');
      if (!alreadyExists) throw error;

      const existingId = await this.findUserIdByEmail(params.email);
      if (!existingId) throw error;
      userId = existingId;
    } else {
      userId = data.user?.id;
    }

    if (!userId) throw new Error('Não foi possível obter o ID do usuário.');

    const { error: memberError } = await this.adminClient
      .from('org_members')
      .upsert({ org_id: params.orgId, user_id: userId, role: params.role });
    if (memberError) throw memberError;

    return { userId };
  }

  async listUsers(): Promise<Array<{ id: string; email: string }>> {
    const { data, error } = await this.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return (data?.users || []).map((u) => ({ id: u.id, email: u.email || '' }));
  }

  async listOrgs(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await this.adminClient.from('orgs').select('id, name').order('name');
    if (error) throw error;
    return (data || []) as Array<{ id: string; name: string }>;
  }

  async upsertOrgMember(params: { orgId: string; userId: string; role: 'admin' | 'colaborador' }): Promise<void> {
    const { error } = await this.adminClient
      .from('org_members')
      .upsert({ org_id: params.orgId, user_id: params.userId, role: params.role });
    if (error) throw error;
  }

  private async findUserIdByEmail(email: string): Promise<string | null> {
    const { data, error } = await this.adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    return found?.id ?? null;
  }
}
