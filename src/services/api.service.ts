// src/services/api.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { SupaService } from './supa.service';

/**
 * Serviço HTTP genérico para comunicar com a API NestJS.
 * Envia o JWT do Supabase Auth no header Authorization.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly baseUrl = environment.API_URL;

    constructor(private supaService: SupaService) { }

    private async getHeaders(): Promise<Record<string, string>> {
        const { data } = await this.supaService.client.auth.getSession();
        const token = data?.session?.access_token;
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async get<T = any>(path: string): Promise<T> {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, { headers });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.message || `Erro ${res.status}`);
        }
        return res.json();
    }

    async post<T = any>(path: string, body: any): Promise<T> {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Erro ${res.status}`);
        }
        return res.json();
    }

    async put<T = any>(path: string, body: any): Promise<T> {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Erro ${res.status}`);
        }
        return res.json();
    }

    async patch<T = any>(path: string, body: any): Promise<T> {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Erro ${res.status}`);
        }
        return res.json();
    }

    async delete<T = any>(path: string): Promise<T> {
        const headers = await this.getHeaders();
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'DELETE',
            headers,
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Erro ${res.status}`);
        }
        return res.json();
    }
}
