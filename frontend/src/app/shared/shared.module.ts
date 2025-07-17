import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';

// Shared Components
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { StatusChipComponent } from './components/status-chip/status-chip.component';
import { ComplianceIndicatorComponent } from './components/compliance-indicator/compliance-indicator.component';

// Shared Pipes
import { SafeHtmlPipe } from './pipes/safe-html.pipe';
import { RelativeDatePipe } from './pipes/relative-date.pipe';
import { UserRolePipe } from './pipes/user-role.pipe';

// Shared Directives
import { AutofocusDirective } from './directives/autofocus.directive';
import { HighlightDirective } from './directives/highlight.directive';

const MATERIAL_MODULES = [
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatInputModule,
  MatFormFieldModule,
  MatSelectModule,
  MatCheckboxModule,
  MatProgressSpinnerModule,
  MatSnackBarModule,
  MatDialogModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatChipsModule,
  MatBadgeModule,
  MatTabsModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatExpansionModule,
  MatTooltipModule
];

const SHARED_COMPONENTS = [
  LoadingSpinnerComponent,
  ConfirmDialogComponent,
  StatusChipComponent,
  ComplianceIndicatorComponent
];

const SHARED_PIPES = [
  SafeHtmlPipe,
  RelativeDatePipe,
  UserRolePipe
];

const SHARED_DIRECTIVES = [
  AutofocusDirective,
  HighlightDirective
];

@NgModule({
  declarations: [
    ...SHARED_COMPONENTS,
    ...SHARED_PIPES,
    ...SHARED_DIRECTIVES
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ...MATERIAL_MODULES
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ...MATERIAL_MODULES,
    ...SHARED_COMPONENTS,
    ...SHARED_PIPES,
    ...SHARED_DIRECTIVES
  ]
})
export class SharedModule { }