import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'items',
    loadChildren: () => import('./items/items.module').then(m => m.ItemsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'custody',
    loadChildren: () => import('./custody/custody.module').then(m => m.CustodyModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'audit',
    loadChildren: () => import('./audit/audit.module').then(m => m.AuditModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'workflows',
    loadChildren: () => import('./workflows/workflows.module').then(m => m.WorkflowsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'monitoring',
    loadChildren: () => import('./monitoring/monitoring.module').then(m => m.MonitoringModule),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }