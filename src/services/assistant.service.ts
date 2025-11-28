import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AssistantRequest {
  question: string;
  context?: Record<string, unknown> | FarmaciaContext;
}

export interface FarmaciaContext {
  cliente: { id: string; nome: string; cidade?: string; uf?: string };
  periodo: string;
  kpis: {
    faturamento: number;
    lucro_bruto: number;
    ruptura_percent: number;
    ticket_medio: number;
  };
  curva: {
    A: { skus: number; ruptura: number; estoque_dias: number };
    B: { skus: number; ruptura: number; estoque_dias: number };
    C: { skus: number; ruptura: number; estoque_dias: number };
  };
  alertas: string[];
  acoes_ja_tomadas?: string[];
  ruptura_anterior_percent?: number; // para comparação com análise anterior
  top_faltas?: Array<Record<string, unknown>>;
  top_excessos?: Array<Record<string, unknown>>;
  top_parados?: Array<Record<string, unknown>>;
}

export interface AssistantResponse {
  answer: string;
  threadId?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'https://vbivdhuinibdsdqlldyh.functions.supabase.co/assistant';
  private readonly anonKey = environment.NG_APP_SUPABASE_ANON_KEY;

  ask(payload: AssistantRequest): Observable<AssistantResponse> {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.anonKey}`,
      apikey: this.anonKey,
    };
    return this.http.post<AssistantResponse>(this.endpoint, payload, { headers });
  }

  /**
   * Envia um payload estruturado de farmácia para gerar diagnóstico/relatório/plano.
   * Inclui comparação de ruptura atual vs anterior quando fornecido.
   */
  analisarFarmacia(ctx: FarmaciaContext): Observable<AssistantResponse> {
    const comparativo =
      typeof ctx.ruptura_anterior_percent === 'number'
        ? `Comparar ruptura atual (${ctx.kpis.ruptura_percent}%) vs anterior (${ctx.ruptura_anterior_percent}%) e indicar evolução.`
        : 'Se não houver ruptura anterior, apenas contextualize o nível atual.';

    const question = [
      'Gerar análise e plano de ação para o cliente.',
      'Entregáveis:',
      '1) Resumo executivo',
      '2) Diagnóstico (ruptura, excesso, giro) por curva',
      '3) Top alertas e ações recomendadas',
      '4) Plano de ação em 5 passos com responsáveis e prazo',
      '5) OKRs sugeridos (2-3)',
      comparativo,
    ].join(' ');

    return this.ask({
      question,
      context: ctx,
    });
  }
}
