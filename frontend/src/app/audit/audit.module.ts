import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { RoleGuard } from '../auth/auth.guard';

import { AuditComponent } from './audit.component';

const routes: Routes = [
  { 
    path: '', 
    component: AuditComponent,
    data: { roles: ['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'] }
  }
];

@NgModule({
  declarations: [AuditComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class AuditModule { }