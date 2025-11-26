

import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsolidatedProduct } from '../../models/product.model';
import { ExcelService } from '../../services/excel.service';

type ViewType = 'all' | 'stockout' | 'stagnant';

@Component({
  selector: 'app-table-view',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="bg-white p-6 rounded-lg shadow-lg">
  <div class="sm:flex sm:items-center sm:justify-between mb-6">
    <div>
      <h2 class="text-xl font-bold text-slate-800">{{ title() }}</h2>
      <p class="mt-1 text-sm text-slate-600">{{ infoText() }}</p>
    </div>
    <div class="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-4">
      @if(viewType() === 'all') {
        <div>
          <label for="curva_filter" class="sr-only">Filtrar por Curva</label>
          <select id="curva_filter" (change)="setFilterCurva($event)" class="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md">
            <option value="all">Toda Curva ABC</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
            <option value="SEM_GIRO">Sem Giro</option>
          </select>
        </div>
      }
      <button (click)="downloadData()" [disabled]="!filteredData().length" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </button>
    </div>
  </div>

  <div class="overflow-x-auto">
    @if(paginatedData().length > 0) {
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
               <button (click)="setSort('descricaoConsolidada')" class="px-6 py-3 w-full group inline-flex items-center justify-start">
                <span>Descrição</span>
                <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'descricaoConsolidada'" [class.group-hover:visible]="sortColumn() !== 'descricaoConsolidada'">
                  @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                  @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                </span>
              </button>
            </th>
            <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
               <button (click)="setSort('EAN_consolidado')" class="px-6 py-3 w-full group inline-flex items-center justify-start">
                <span>EAN</span>
                 <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'EAN_consolidado'" [class.group-hover:visible]="sortColumn() !== 'EAN_consolidado'">
                  @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                  @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                </span>
              </button>
            </th>
            <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
               <button (click)="setSort('quantidadeVendida90d')" class="px-6 py-3 w-full group inline-flex items-center justify-end">
                <span>Qtd. Vend. (90d)</span>
                <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'quantidadeVendida90d'" [class.group-hover:visible]="sortColumn() !== 'quantidadeVendida90d'">
                  @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                  @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                </span>
              </button>
            </th>
            <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
               <button (click)="setSort('estoqueAtualConsolidado')" class="px-6 py-3 w-full group inline-flex items-center justify-end">
                <span>Est. Atual</span>
                 <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'estoqueAtualConsolidado'" [class.group-hover:visible]="sortColumn() !== 'estoqueAtualConsolidado'">
                  @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                  @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                </span>
              </button>
            </th>
            <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
              <button (click)="setSort('Curva_ABC')" class="px-6 py-3 w-full group inline-flex items-center justify-center">
                <span>Curva ABC</span>
                 <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'Curva_ABC'" [class.group-hover:visible]="sortColumn() !== 'Curva_ABC'">
                  @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                  @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                </span>
              </button>
            </th>
            @if(viewType() === 'all') {
              <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
                 <button (click)="setSort('custoUnitario')" class="px-6 py-3 w-full group inline-flex items-center justify-end">
                  <span>Custo Unit.</span>
                   <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'custoUnitario'" [class.group-hover:visible]="sortColumn() !== 'custoUnitario'">
                    @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                    @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                  </span>
                </button>
              </th>
              <th scope="col" class="text-xs font-medium text-slate-500 uppercase tracking-wider">
                <button (click)="setSort('lucroBrutoPeriodo')" class="px-6 py-3 w-full group inline-flex items-center justify-end">
                  <span>Lucro Bruto</span>
                  <span class="ml-2 flex-none rounded text-slate-500" [class.invisible]="sortColumn() !== 'lucroBrutoPeriodo'" [class.group-hover:visible]="sortColumn() !== 'lucroBrutoPeriodo'">
                    @if (sortDirection() === 'desc') { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg> }
                    @else { <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg> }
                  </span>
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-slate-200">
          @for (item of paginatedData(); track item.chave_merge) {
            <tr>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">{{ item.descricaoConsolidada }}</div>
                @if (item.codigoInterno) {
                  <div class="text-xs text-slate-500">Cód: {{ item.codigoInterno }}</div>
                }
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.EAN_consolidado }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold" [class]="viewType() === 'stockout' ? 'text-red-600' : 'text-slate-900'">{{ item.quantidadeVendida90d }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold" [class]="item.estoqueAtualConsolidado === 0 ? 'text-red-600' : (viewType() === 'stagnant' ? 'text-amber-600' : 'text-slate-900')">{{ item.estoqueAtualConsolidado }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" [class]="curvaBadgeClass(item.Curva_ABC)">
                  {{ item.Curva_ABC }}
                </span>
              </td>
              @if(viewType() === 'all') {
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">{{ formatCurrency(item.custoUnitario) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" [class]="item.lucroBrutoPeriodo < 0 ? 'text-red-600' : 'text-green-600'">{{ formatCurrency(item.lucroBrutoPeriodo) }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    } @else {
        <div class="text-center py-12 px-6 bg-slate-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-slate-900">Nenhum produto encontrado</h3>
          <p class="mt-1 text-sm text-slate-500">
            Não há produtos que correspondam aos filtros selecionados.
          </p>
        </div>
    }
  </div>

  @if (totalPages() > 1) {
    <nav class="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6 mt-4" aria-label="Pagination">
      <div class="hidden sm:block">
        <p class="text-sm text-slate-700">
          Mostrando <span class="font-medium">{{ (currentPage() - 1) * itemsPerPage + 1 }}</span> a <span class="font-medium">{{ (currentPage() - 1) * itemsPerPage + paginatedData().length }}</span> de <span class="font-medium">{{ totalResults() }}</span> resultados
        </p>
      </div>
      <div class="flex-1 flex justify-between sm:justify-end">
        <button (click)="changePage(currentPage() - 1)" [disabled]="currentPage() === 1" class="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Anterior
        </button>
        <button (click)="changePage(currentPage() + 1)" [disabled]="currentPage() === totalPages()" class="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Próximo
        </button>
      </div>
    </nav>
  }
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableViewComponent implements OnInit {
  data = input.required<ConsolidatedProduct[]>();
  title = input.required<string>();
  infoText = input.required<string>();
  fileName = input.required<string>();
  viewType = input.required<ViewType>();

  // Paginação
  itemsPerPage = 15;
  currentPage = signal(1);
  totalResults = computed(() => this.filteredData().length);
  totalPages = computed(() => Math.ceil(this.totalResults() / this.itemsPerPage));

  // Ordenação
  sortColumn = signal<keyof ConsolidatedProduct>('quantidadeVendida90d');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Filtro
  filterCurva = signal<'all' | 'A' | 'B' | 'C' | 'SEM_GIRO'>('all');

  constructor(private excelService: ExcelService) {}

  filteredData = computed(() => {
    let items = [...this.data()];
    const filter = this.filterCurva();

    if (filter !== 'all') {
      items = items.filter(p => p.Curva_ABC === filter);
    }
    
    const col = this.sortColumn();
    const dir = this.sortDirection();

    items.sort((a, b) => {
      const valA = a[col] as any;
      const valB = b[col] as any;
      
      let comparison = 0;
      if (valA < valB) {
        comparison = -1;
      } else if (valA > valB) {
        comparison = 1;
      }
      
      return dir === 'asc' ? comparison : -comparison;
    });

    return items;
  });

  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredData().slice(start, end);
  });

  ngOnInit(): void {
    if (this.viewType() === 'stagnant') {
      this.sortColumn.set('estoqueAtualConsolidado');
      this.sortDirection.set('desc');
    }
  }

  setSort(column: keyof ConsolidatedProduct): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.currentPage.set(1);
  }

  setFilterCurva(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as any;
    this.filterCurva.set(value);
    this.currentPage.set(1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  downloadData(): void {
    this.excelService.exportConsolidatedToXlsx(
      this.filteredData(),
      this.fileName(),
      this.viewType()
    );
  }

  formatCurrency(value?: number | null): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
  }

  curvaBadgeClass(curva: string): string {
    switch (curva) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'B': return 'bg-emerald-100 text-emerald-800';
      case 'C': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }
}
