import { Injectable } from '@angular/core';
import { ConsolidatedProduct } from '../models/product.model';

// Declara a variável global XLSX para que o TypeScript a reconheça.
// A biblioteca é carregada via <script> no index.html.
declare var XLSX: any;

type ViewType = 'all' | 'stockout' | 'stagnant';

@Injectable({ providedIn: 'root' })
export class ExcelService {

  /**
   * Lê o primeiro sheet de um arquivo Excel (XLSX/XLS) e
   * devolve como array de objetos (cada linha = objeto).
   * Usado pelo file-uploader para ler as planilhas enviadas.
   */
  readExcelFile<T = any>(file: File): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(
            (e.target?.result as ArrayBuffer) || new ArrayBuffer(0)
          );
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const json = XLSX.utils.sheet_to_json(worksheet, {
            defval: null, // evita "undefined" nos campos vazios
          }) as T[];

          resolve(json);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Exporta uma lista de produtos consolidados em XLSX,
   * já no layout padrão de "índice de faltas".
   */
  exportConsolidatedToXlsx(
    data: ConsolidatedProduct[],
    fileName: string,
    viewType: ViewType
  ): void {
    if (!data || data.length === 0) {
      console.warn('[ExcelService] Nenhum dado para exportar.');
      return;
    }

    const rows = data.map((p) => {
      const qtd = p.quantidadeVendida90d || 0;
      const cmv = p.cmvPeriodo || 0;
      const custoUnitario = qtd > 0 ? cmv / qtd : null;

      return {
        'Código interno': p.codigoInterno || '',
        'EAN': p.EAN_consolidado || '',
        'Descrição': p.descricaoConsolidada || '',
        'Quantidade Vendida': qtd,
        'Estoque atual': p.estoqueAtualConsolidado ?? 0,
        'Valor de venda líquida total': p.valorVendaLiquidaTotal || 0,
        'Custo unitário': custoUnitario,
        'CMV 90d (R$)': cmv,
        'Lucro Bruto 90d (R$)': p.lucroBrutoPeriodo || 0,
        'Curva ABC': p.Curva_ABC || '',
        'Em falta?': p.flag_falta ? 'SIM' : 'NÃO',
        'Parado?': p.flag_parado ? 'SIM' : 'NÃO',
      };
    });

    const sheetName =
      viewType === 'stockout'
        ? 'Produtos em falta'
        : viewType === 'stagnant'
        ? 'Itens parados'
        : 'Base consolidada';

    // FIX: Removed explicit type annotation for `worksheet` as XLSX is declared as `any`.
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        'Código interno',
        'EAN',
        'Descrição',
        'Quantidade Vendida',
        'Estoque atual',
        'Valor de venda líquida total',
        'Custo unitário',
        'CMV 90d (R$)',
        'Lucro Bruto 90d (R$)',
        'Curva ABC',
        'Em falta?',
        'Parado?',
      ],
    });

    // FIX: Removed explicit type annotation for `workbook` as XLSX is declared as `any`.
    const workbook = {
      Sheets: { [sheetName]: worksheet },
      SheetNames: [sheetName],
    };

    const safeName =
      fileName && fileName.trim().length > 0
        ? fileName.trim()
        : sheetName.replace(/\s+/g, '_').toLowerCase();

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  }
}
