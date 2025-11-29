import { Injectable } from '@angular/core';
import { SupaService } from './supa.service';
import { SummaryData } from '../models/product.model';
import { AnaliseRun } from '../models/supabase.model';

@Injectable({ providedIn: 'root' })
export class PersistAnalysisService {
  constructor(private supaService: SupaService) {}

  async saveRun(params: {
    org_id: string; cliente_id: string; created_by: string;
    periodo_dias: number; algoritmo_versao: string;
    periodo_inicio?: string | null; periodo_fim?: string | null;
    path_vendas?: string; path_inventario?: string;
    summary: SummaryData;
    top_faltas?: any;
    top_excessos?: any;
    top_parados?: any;
    consolidated?: any;
    faltas?: any;
    parados?: any;
  }): Promise<AnaliseRun> {

    const { data: run, error: runError } = await this.supaService.client
      .from('analise_runs')
      .insert({
        org_id: params.org_id,
        cliente_id: params.cliente_id,
        created_by: params.created_by,
        periodo_dias: params.periodo_dias,
        periodo_inicio: params.periodo_inicio ?? null,
        periodo_fim: params.periodo_fim ?? null,
        algoritmo_versao: params.algoritmo_versao,
        path_vendas: params.path_vendas ?? null,
        path_inventario: params.path_inventario ?? null,
        summary: params.summary as any,
        top_faltas: params.top_faltas ?? null,
        top_excessos: params.top_excessos ?? null,
        top_parados: params.top_parados ?? null,
        consolidated: params.consolidated ?? null,
        faltas: params.faltas ?? null,
        parados: params.parados ?? null,
      })
      .select()
      .single();

    if (runError) {
      console.error('Erro ao salvar o run de análise:', runError);
      throw runError;
    }
    if (!run) throw new Error("A inserção do 'run' não retornou dados.");

    const curvasData = (params.summary.curvas || []).map(c => ({
      run_id: run.id,
      curva: c.curva,
      skus: c.skus,
      skus_parados: c.skusParados,
      skus_em_falta: c.skusEmFalta,
      venda_90d: c.venda90d,
      cmv_90d: c.cmv90d,
      lucro_bruto_90d: c.lucroBruto90d,
      estoque_parado_unid: c.estoqueParadoUnidades,
      estoque_parado_valor: c.estoqueParadoValor,
      excesso_unidades: c.excessoUnidades,
      excesso_valor: c.excessoValor,
      dias_estoque_medio: c.diasEstoqueMedio,
      falta_percent: (c as any).faltaPercent ?? 0,
    }));

    if (curvasData.length > 0) {
      const { error: curvasError } = await this.supaService.client
        .from('analise_runs_curvas')
        .insert(curvasData);

      if (curvasError) {
        console.error('Erro ao salvar os dados das curvas:', curvasError);
        throw curvasError;
      }
    }

    return run as AnaliseRun;
  }
}
