import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import 'zone.js'; // requerido pelo Angular em modo zone-full
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { AppComponent } from './src/app.component';
import { APP_ROUTES } from './src/app.routes';

// Registra locale PT para pipes de número/data
registerLocaleData(localePt);

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    provideRouter(APP_ROUTES, withHashLocation()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
}).catch((err) => {
  // Loga erros de bootstrap para facilitar debug em tela em branco
  console.error('Erro ao inicializar a aplicação', err);
});
