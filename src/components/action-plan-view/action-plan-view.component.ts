import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionPlan, ActionPlanSection } from '../../models/action-plan.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-action-plan-view',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <div class="flex flex-col gap-3 mb-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h2 class="text-lg font-semibold text-slate-800">Plano de Ação Sugerido Farma Brasil</h2>
        @if (plan()) {
          <p class="text-xs text-slate-500">
            Lead time: {{ plan()!.lead_time_days }} dia{{ plan()!.lead_time_days === 1 ? '' : 's' }}
            · Gerado em {{ formatDate(plan()!.generated_at) }}
          </p>
        }
      </div>
      @if (plan()) {
        <button
          class="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-md hover:bg-slate-50"
          (click)="exportPlanPDF()"
        >
          Exportar PDF
        </button>
      }
    </div>
      @if (plan()) {
        <div class="flex flex-wrap gap-3 text-xs text-slate-600">
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-red-500"></span>
            <span>Críticos: {{ severityCount('high') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
            <span>Atenção: {{ severityCount('medium') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Monitorar: {{ severityCount('low') }}</span>
          </div>
        </div>
      }
    </div>

    @if (!plan() || plan()!.sections.length === 0) {
      <p class="text-sm text-slate-500">Nenhum alerta relevante neste período.</p>
    } @else {
      <div class="space-y-6">
        @for (section of plan()!.sections; track section.key) {
          <div class="border border-slate-200 rounded-lg p-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-slate-800">{{ section.title }}</h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ section.count }} SKU{{ section.count === 1 ? '' : 's' }} ·
                  {{ section.total_value | currency:'BRL':'symbol':'1.2-2':'pt-BR' }} {{ section.value_label }}
                </p>
              </div>
              <span class="text-xs font-semibold px-2 py-1 rounded-full" [class]="severityClass(section)">
                {{ severityLabel(section) }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-2">
              @for (action of section.actions; track action) {
                <span class="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{{ action }}</span>
              }
            </div>

            @if (section.items.length > 0) {
              <div class="mt-4 overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200">
                  <thead class="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produto</th>
                      <th class="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Curva</th>
                      <th class="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Estoque</th>
                      <th class="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Venda 90d</th>
                      <th class="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cobertura (dias)</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-slate-200">
                    @for (item of section.items; track item.id) {
                      <tr class="odd:bg-white even:bg-slate-50/60">
                        <td class="px-3 py-2 text-sm text-slate-700">{{ item.descricao }}</td>
                        <td class="px-3 py-2 text-sm text-center text-slate-600">{{ item.curva }}</td>
                        <td class="px-3 py-2 text-sm text-right text-slate-600">{{ item.estoque_atual | number:'1.0-0' }}</td>
                        <td class="px-3 py-2 text-sm text-right text-slate-600">{{ item.venda_90d | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</td>
                        <td class="px-3 py-2 text-sm text-right text-slate-600">
                          @if (item.cobertura_dias !== null) {
                            {{ item.cobertura_dias | number:'1.0-0' }}
                          } @else {
                            —
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    }
  </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionPlanViewComponent {
  plan = input<ActionPlan | null>(null);
  reportTitle = input<string>('Plano de Ação Sugerido Farma Brasil');

  severityClass(section: ActionPlanSection): string {
    switch (section.severity) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  severityLabel(section: ActionPlanSection): string {
    switch (section.severity) {
      case 'high':
        return 'Crítico';
      case 'medium':
        return 'Atenção';
      default:
        return 'Monitorar';
    }
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleString('pt-BR');
  }

  severityCount(level: ActionPlanSection['severity']): number {
    const plan = this.plan();
    if (!plan) return 0;
    return plan.sections
      .filter((section) => section.severity === level)
      .reduce((sum, section) => sum + (section.count ?? 0), 0);
  }

  exportPlanPDF(): void {
    const plan = this.plan();
    if (!plan) return;

    const title = this.reportTitle();
    const logoUrl = environment.REPORT_LOGO_URL
      ? environment.REPORT_LOGO_URL.startsWith('/')
        ? `${window.location.origin}${environment.REPORT_LOGO_URL}`
        : environment.REPORT_LOGO_URL
      : '';

    const sectionsHtml = plan.sections
      .map((section) => {
        const itemsHtml = section.items.length
          ? `
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Curva</th>
                  <th>Estoque</th>
                  <th>Venda 90d</th>
                  <th>Cobertura (dias)</th>
                </tr>
              </thead>
              <tbody>
                ${section.items
                  .map(
                    (item) => `
                      <tr>
                        <td>${this.escapeHtml(item.descricao)}</td>
                        <td>${this.escapeHtml(item.curva)}</td>
                        <td class="right">${this.formatNumber(item.estoque_atual)}</td>
                        <td class="right">${this.formatCurrency(item.venda_90d)}</td>
                        <td class="right">${item.cobertura_dias !== null ? this.formatNumber(item.cobertura_dias) : '—'}</td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          `
          : '';

        return `
          <section>
            <div class="section-header">
              <h2>${this.escapeHtml(section.title)}</h2>
              <span class="pill ${section.severity}">${this.escapeHtml(this.severityLabel(section))}</span>
            </div>
            <p class="muted">
              ${section.count} SKU${section.count === 1 ? '' : 's'} ·
              ${this.formatCurrency(section.total_value)} ${this.escapeHtml(section.value_label)}
            </p>
            <div class="actions">
              ${section.actions.map((action) => `<span>${this.escapeHtml(action)}</span>`).join('')}
            </div>
            ${itemsHtml}
          </section>
        `;
      })
      .join('');

    const style = `
      <style>
        body { font-family: "Helvetica Neue", Arial, sans-serif; padding: 32px; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 22px; margin: 0; font-weight: 700; }
        h2 { font-size: 16px; margin: 0; font-weight: 700; }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .logo { height: 56px; max-width: 220px; object-fit: contain; }
        .muted { color: #64748b; font-size: 12px; margin: 6px 0 12px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .actions span { font-size: 11px; padding: 4px 8px; background: #f1f5f9; border-radius: 999px; }
        section { border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
        th, td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #64748b; }
        td.right { text-align: right; }
        .pill { font-size: 11px; padding: 4px 8px; border-radius: 999px; font-weight: 600; }
        .pill.high { background: #fee2e2; color: #b91c1c; }
        .pill.medium { background: #fef3c7; color: #92400e; }
        .pill.low { background: #dcfce7; color: #15803d; }
      </style>
    `;

    const html = `
      <html>
        <head>${style}</head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${this.escapeHtml(title)}" class="logo" />` : ''}
            <div>
              <h1>${this.escapeHtml(title)}</h1>
              <p class="muted">
                Lead time: ${plan.lead_time_days} dia${plan.lead_time_days === 1 ? '' : 's'}
                · Gerado em ${this.formatDate(plan.generated_at)}
              </p>
            </div>
          </div>
          ${sectionsHtml}
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  private formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
