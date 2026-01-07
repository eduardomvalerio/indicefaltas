// src/environments/environment.ts
export const environment = {
  production: false,
  enableCloudSave: true,

  // NÃO coloque a service_role aqui (apenas no backend).
  NG_APP_SUPABASE_URL: 'https://vbivdhuinibdsdqlldyh.supabase.co',
  NG_APP_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaXZkaHVpbmliZHNkcWxsZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjUwOTEsImV4cCI6MjA3ODkwMTA5MX0.ZGYCZUXH-Chqz54PujT_TgcBOnfGASBlnQOBxnzDmRQ',
  // URL/base64 do logo exibido no PDF do relatório (ex.: https://.../logo.png ou data:image/png;base64,...)
  REPORT_LOGO_URL: '/assets/logo_horizontal.png',
  // Service role — ATENÇÃO: manter apenas em ambiente controlado / backend.
  SUPABASE_SERVICE_ROLE_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaXZkaHVpbmliZHNkcWxsZHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyNTA5MSwiZXhwIjoyMDc4OTAxMDkxfQ.W3k4Z7P7AORWKnz02BQwQz-PCRkrTEnQR2WMIQ-AH-g',
};
