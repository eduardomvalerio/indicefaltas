import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { ClientListComponent } from './components/client-list/client-list.component';
import { ClientDashboardComponent } from './components/client-dashboard/client-dashboard.component';
import { AnalysisRunnerComponent } from './components/analysis-runner/analysis-runner.component';
import { HistoryComponent } from './components/history/history.component';
import { SettingsComponent } from './components/settings/settings.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { AdminGuard } from './guards/admin.guard';

export const APP_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'clients', component: ClientListComponent },
      {
        path: 'clients/:clientId',
        component: ClientDashboardComponent,
        children: [
          { path: '', redirectTo: 'new-analysis', pathMatch: 'full' },
          { path: 'new-analysis', component: AnalysisRunnerComponent },
          { path: 'history', component: HistoryComponent },
        ],
      },
      {
        path: 'settings',
        canActivate: [AdminGuard],
        component: SettingsComponent,
      },
      {
        path: 'settings/users',
        canActivate: [AdminGuard],
        component: UserManagementComponent,
      },
      { path: '', redirectTo: '/clients', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
