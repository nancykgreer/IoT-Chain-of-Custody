import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';

// Components
import { WorkflowDashboardComponent } from './pages/workflow-dashboard/workflow-dashboard.component';
import { WorkflowListComponent } from './components/workflow-list/workflow-list.component';
import { WorkflowInstancesComponent } from './components/workflow-instances/workflow-instances.component';
import { WorkflowApprovalComponent } from './components/workflow-approval/workflow-approval.component';
import { WorkflowCreateComponent } from './components/workflow-create/workflow-create.component';
import { WorkflowDetailsComponent } from './pages/workflow-details/workflow-details.component';

const routes = [
  {
    path: '',
    component: WorkflowDashboardComponent
  },
  {
    path: 'create',
    component: WorkflowCreateComponent
  },
  {
    path: ':id',
    component: WorkflowDetailsComponent
  }
];

@NgModule({
  declarations: [
    WorkflowDashboardComponent,
    WorkflowListComponent,
    WorkflowInstancesComponent,
    WorkflowApprovalComponent,
    WorkflowCreateComponent,
    WorkflowDetailsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    
    // Material modules
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTabsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule
  ]
})
export class WorkflowsModule { }