import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) { }

  async createUserAndAssign(params: {
    email: string;
    password?: string;
    role: 'admin' | 'colaborador';
    orgId: string;
  }): Promise<{ userId: string }> {
    return this.api.post<{ userId: string }>('/admin/users', params);
  }

  async listUsers(): Promise<Array<{ id: string; email: string }>> {
    return this.api.get<Array<{ id: string; email: string }>>('/admin/users');
  }

  async listOrgs(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.api.get<any[]>('/admin/orgs');
    return (data || []).map((o: any) => ({ id: o._id || o.id, name: o.name }));
  }

  async upsertOrgMember(params: { orgId: string; userId: string; role: 'admin' | 'colaborador' }): Promise<void> {
    await this.api.put('/admin/org-members', params);
  }
}
