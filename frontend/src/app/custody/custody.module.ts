import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

import { CustodyComponent } from './custody.component';

const routes: Routes = [
  { path: '', component: CustodyComponent }
];

@NgModule({
  declarations: [CustodyComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class CustodyModule { }