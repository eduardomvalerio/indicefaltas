


import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesRecord, InventoryRecord, AnalysisResult } from '../../models/product.model';
import { ExcelService } from '../../services/excel.service';
import { AnalysisService } from '../../services/analysis.service';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  template: `
<div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg">
  <div class="text-center mb-6">
    <h2 class="text-2xl font-bold text-slate-800">Inicie sua Análise</h2>
    <p class="text-slate-600 mt-2">
      Envie suas planilhas para obter insights sobre seu estoque.
    </p>
  </div>
  
  <div class="space-y-6">
    <div class="p-4 border-l-4 border-sky-500 bg-sky-50 text-sky-800 rounded-r-lg">
        <p class="font-semibold">Instruções:</p>
        <ul class="list-disc list-inside mt-1 text-sm">
            <li>Envie primeiro a planilha de <strong class="font-semibold">vendas/índice de faltas</strong> (últimos 90 dias).</li>
            <li>A planilha de <strong class="font-semibold">inventário</strong> é opcional. Sem ela, a análise usa apenas Vendas.</li>
            <li>Certifique-se que os nomes das colunas obrigatórias estão corretos.</li>
        </ul>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Sales File Upload -->
      <div>
        <label for="sales-file" class="block text-sm font-medium text-slate-700 mb-2">1. Planilha de Vendas (90 dias)</label>
        <label class="w-full flex items-center px-4 py-3 bg-white text-sky-600 rounded-lg shadow-sm tracking-wide border border-sky-300 cursor-pointer hover:bg-sky-100 hover:text-sky-700 transition-colors">
          <svg class="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V9h2v2z" />
          </svg>
          <span class="ml-4 text-sm">{{ salesFileName() || 'Selecionar arquivo...' }}</span>
          <input id="sales-file" type="file" class="hidden" (change)="onFileChange($event, 'sales')" accept=".xlsx, .xls">
        </label>
      </div>
      
      <!-- Inventory File Upload -->
      <div>
        <label for="inventory-file" class="block text-sm font-medium text-slate-700 mb-2">2. Planilha de Inventário (opcional)</label>
        <label class="w-full flex items-center px-4 py-3 bg-white text-sky-600 rounded-lg shadow-sm tracking-wide border border-sky-300 cursor-pointer hover:bg-sky-100 hover:text-sky-700 transition-colors">
          <svg class="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V9h2v2z" />
          </svg>
          <span class="ml-4 text-sm">{{ inventoryFileName() || 'Selecionar arquivo...' }}</span>
          <input id="inventory-file" type="file" class="hidden" (change)="onFileChange($event, 'inventory')" accept=".xlsx, .xls">
        </label>
      </div>
    </div>
    
    @if (error()) {
      <div class="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg" role="alert">
        <p class="font-bold">Erro</p>
        <p>{{ error() }}</p>
      </div>
    }

    <div class="pt-4">
      <button 
        (click)="processFiles()" 
        [disabled]="!salesFile() || isLoading()" 
        class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all">
        @if (isLoading()) {
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processando...</span>
        } @else {
          <span>Analisar Arquivos</span>
        }
      </button>
    </div>
  </div>
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class FileUploaderComponent {
  analysisComplete = output<AnalysisResult>();
  filesSelected = output<{ sales: File; inventory: File | null }>();

  salesFile = signal<File | null>(null);
  inventoryFile = signal<File | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  salesFileName = signal<string>('');
  inventoryFileName = signal<string>('');

  constructor(private excelService: ExcelService, private analysisService: AnalysisService) {}

  onFileChange(event: Event, type: 'sales' | 'inventory'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (type === 'sales') {
        this.salesFile.set(input.files[0]);
        this.salesFileName.set(input.files[0].name);
      } else {
        this.inventoryFile.set(input.files[0]);
        this.inventoryFileName.set(input.files[0].name);
      }
      this.error.set(null);

      if (this.salesFile()) {
        this.filesSelected.emit({ sales: this.salesFile()!, inventory: this.inventoryFile() });
      }
    }
  }

  async processFiles(): Promise<void> {
    const salesFile = this.salesFile();
    const inventoryFile = this.inventoryFile();
    if (!salesFile) {
      this.error.set('Por favor, selecione o arquivo de vendas.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const salesData = await this.excelService.readExcelFile<SalesRecord>(salesFile);
      const inventoryData = inventoryFile
        ? await this.excelService.readExcelFile<InventoryRecord>(inventoryFile)
        : [];

      const validationError = this.analysisService.validateColumns(salesData, inventoryData);
      if (validationError) {
        this.error.set(validationError);
        this.isLoading.set(false);
        return;
      }

      const result = this.analysisService.processData(salesData, inventoryData);
      this.analysisComplete.emit(result);
    } catch (e: any) {
      this.error.set(e.message || 'Ocorreu um erro inesperado ao processar os arquivos.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
