// src/environments/environment.ts
export const environment = {
  production: false,
  enableCloudSave: true,

  // Supabase Self-Hosted (apenas para Auth — login/logout)
  NG_APP_SUPABASE_URL: 'https://supabase.farmaciaautogerenciavel.com',
  NG_APP_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.NPt2pMyvj73FAbpnMBMK2c6xRyhUxxf0vJ7oBeWgavA',

  // API NestJS (backend intermediário para MongoDB)
  API_URL: 'https://faltas.farmabrasilcontabilidade.com.br/api',

  // URL/base64 do logo exibido no PDF do relatório
  REPORT_LOGO_URL: '/assets/logo_horizontal.png',
  // Lead time padrão (dias) para alertas pós-análise.
  DEFAULT_LEAD_TIME_DAYS: 1,
};
