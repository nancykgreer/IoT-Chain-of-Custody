import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { WorkflowInstance } from '../../../shared/services/workflow.service';

@Component({
  selector: 'app-workflow-instances',
  template: `
    <div class="workflow-instances">
      <!-- Filter Controls -->
      <div class="filter-controls">
        <mat-form-field appearance="outline">
          <mat-label>Filter by status</mat-label>
          <mat-select [(value)]="statusFilter" (selectionChange)="applyFilters()">
            <mat-option value="">All Statuses</mat-option>
            <mat-option value="PENDING">Pending</mat-option>
            <mat-option value="IN_PROGRESS">In Progress</mat-option>
            <mat-option value="AWAITING_APPROVAL">Awaiting Approval</mat-option>
            <mat-option value="EXECUTING">Executing</mat-option>
            <mat-option value="COMPLETED">Completed</mat-option>
            <mat-option value="FAILED">Failed</mat-option>
            <mat-option value="CANCELLED">Cancelled</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Search workflows</mat-label>
          <input matInput [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" 
                 placeholder="Search by workflow name...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>

      <!-- Instances Table -->
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="instances-table">
          
          <!-- Workflow Column -->
          <ng-container matColumnDef="workflow">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="workflow.name">Workflow</th>
            <td mat-cell *matCellDef="let instance">
              <div class="workflow-info">
                <div class="workflow-name">{{ instance.workflow?.name || 'Unknown' }}</div>
                <div class="workflow-type">{{ formatWorkflowType(instance.workflow?.workflowType) }}</div>
              </div>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="status">Status</th>
            <td mat-cell *matCellDef="let instance">
              <mat-chip [color]="getStatusColor(instance.status)" selected>
                <mat-icon>{{ getStatusIcon(instance.status) }}</mat-icon>
                {{ formatStatus(instance.status) }}
              </mat-chip>
            </td>
          </ng-container>

          <!-- Started Column -->
          <ng-container matColumnDef="startedAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header="startedAt">Started</th>
            <td mat-cell *matCellDef="let instance">
              <div class="time-info">
                <div class="date">{{ instance.startedAt | date:'short' }}</div>
                <div class="relative">{{ getRelativeTime(instance.startedAt) }}</div>
              </div>
            </td>
          </ng-container>

          <!-- Duration Column -->
          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef>Duration</th>
            <td mat-cell *matCellDef="let instance">
              <div class="duration">
                {{ getDuration(instance) }}
              </div>
            </td>
          </ng-container>

          <!-- Related Item Column -->
          <ng-container matColumnDef="relatedItem">
            <th mat-header-cell *matHeaderCellDef>Related Item</th>
            <td mat-cell *matCellDef="let instance">
              <div *ngIf="instance.relatedItem" class="item-info">
                <div class="item-name">{{ instance.relatedItem.name }}</div>
                <div class="item-barcode">{{ instance.relatedItem.barcode }}</div>
              </div>
              <span *ngIf="!instance.relatedItem" class="no-item">No item</span>
            </td>
          </ng-container>

          <!-- Steps Column -->
          <ng-container matColumnDef="steps">
            <th mat-header-cell *matHeaderCellDef>Progress</th>
            <td mat-cell *matCellDef="let instance">
              <div class="steps-progress">
                <div class="progress-info">
                  <span>{{ getCompletedSteps(instance) }} / {{ instance.steps.length }} steps</span>
                </div>
                <div class="progress-bar">
                  <mat-progress-bar 
                    [value]="getProgressPercentage(instance)"
                    [color]="getProgressColor(instance)">
                  </mat-progress-bar>
                </div>
              </div>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let instance">
              <div class="action-buttons">
                <button mat-icon-button 
                        color="primary"
                        (click)="viewInstance(instance)"
                        matTooltip="View Details">
                  <mat-icon>visibility</mat-icon>
                </button>
                
                <button mat-icon-button 
                        color="warn"
                        *ngIf="canCancel(instance)"
                        (click)="cancelInstance(instance)"
                        matTooltip="Cancel Execution">
                  <mat-icon>cancel</mat-icon>
                </button>

                <button mat-icon-button 
                        *ngIf="instance.status === 'FAILED'"
                        (click)="retryInstance(instance)"
                        matTooltip="Retry Execution">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
              class="instance-row"
              [class]="'status-' + row.status.toLowerCase()"></tr>
        </table>

        <!-- No Data Message -->
        <div *ngIf="dataSource.data.length === 0" class="no-data">
          <mat-icon>history</mat-icon>
          <h3>No workflow executions found</h3>
          <p>Workflow instances will appear here when workflows are executed</p>
        </div>
      </div>

      <!-- Paginator -->
      <mat-paginator 
        [pageSizeOptions]="[10, 25, 50, 100]"
        [pageSize]="25"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  styles: [`
    .workflow-instances {
      .filter-controls {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;

        mat-form-field {
          min-width: 200px;
          flex: 1;
          max-width: 300px;
        }
      }

      .table-container {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        .instances-table {
          width: 100%;

          th {
            background-color: #f5f5f5;
            font-weight: 600;
            color: #333;
          }

          .instance-row {
            cursor: pointer;
            transition: background-color 0.2s ease;

            &:hover {
              background-color: #f9f9f9;
            }

            &.status-completed {
              border-left: 3px solid #4CAF50;
            }

            &.status-failed {
              border-left: 3px solid #F44336;
            }

            &.status-in_progress,
            &.status-executing {
              border-left: 3px solid #2196F3;
            }

            &.status-awaiting_approval {
              border-left: 3px solid #FF9800;
            }
          }

          .workflow-info {
            .workflow-name {
              font-weight: 500;
              color: #333;
              margin-bottom: 0.25rem;
            }

            .workflow-type {
              font-size: 0.8rem;
              color: #666;
              text-transform: capitalize;
            }
          }

          .time-info {
            .date {
              color: #333;
              margin-bottom: 0.25rem;
            }

            .relative {
              font-size: 0.8rem;
              color: #666;
            }
          }

          .duration {
            font-weight: 500;
            color: #333;
          }

          .item-info {
            .item-name {
              font-weight: 500;
              color: #333;
              margin-bottom: 0.25rem;
            }

            .item-barcode {
              font-size: 0.8rem;
              color: #666;
              font-family: monospace;
            }
          }

          .no-item {
            color: #999;
            font-style: italic;
          }

          .steps-progress {
            .progress-info {
              font-size: 0.8rem;
              color: #666;
              margin-bottom: 0.25rem;
            }

            .progress-bar {
              width: 100px;
            }
          }

          .action-buttons {
            display: flex;
            gap: 0.25rem;
          }

          mat-chip {
            mat-icon {
              font-size: 1rem;
              width: 1rem;
              height: 1rem;
              margin-right: 0.25rem;
            }
          }
        }

        .no-data {
          text-align: center;
          padding: 3rem;
          color: #666;

          mat-icon {
            font-size: 4rem;
            width: 4rem;
            height: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }

          h3 {
            margin: 0 0 0.5rem 0;
            color: #333;
          }

          p {
            margin: 0;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .workflow-instances {
        .filter-controls {
          flex-direction: column;

          mat-form-field {
            max-width: none;
          }
        }

        .table-container {
          overflow-x: auto;

          .instances-table {
            min-width: 800px;
          }
        }
      }
    }
  `]
})
export class WorkflowInstancesComponent {
  @Input() instances: WorkflowInstance[] = [];
  @Output() instanceSelect = new EventEmitter<WorkflowInstance>();
  @Output() instanceCancel = new EventEmitter<WorkflowInstance>();
  @Output() instanceRetry = new EventEmitter<WorkflowInstance>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<WorkflowInstance>([]);
  displayedColumns = ['workflow', 'status', 'startedAt', 'duration', 'relatedItem', 'steps', 'actions'];
  
  statusFilter = '';
  searchTerm = '';

  ngOnChanges(): void {
    this.dataSource.data = this.instances;
    this.applyFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilters(): void {
    this.dataSource.filterPredicate = (instance: WorkflowInstance, filter: string) => {
      const [status, search] = filter.split('|');
      
      const statusMatch = !status || instance.status === status;
      const searchMatch = !search || 
        instance.workflow?.name.toLowerCase().includes(search.toLowerCase()) ||
        instance.relatedItem?.name.toLowerCase().includes(search.toLowerCase()) ||
        instance.relatedItem?.barcode.toLowerCase().includes(search.toLowerCase());
      
      return statusMatch && searchMatch;
    };

    this.dataSource.filter = `${this.statusFilter}|${this.searchTerm}`;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' | undefined {
    switch (status) {
      case 'COMPLETED': return undefined; // default green
      case 'FAILED': return 'warn';
      case 'CANCELLED': return 'warn';
      case 'AWAITING_APPROVAL': return 'accent';
      case 'IN_PROGRESS':
      case 'EXECUTING': return 'primary';
      default: return undefined;
    }
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'COMPLETED': 'check_circle',
      'FAILED': 'error',
      'CANCELLED': 'cancel',
      'AWAITING_APPROVAL': 'pending',
      'IN_PROGRESS': 'play_circle',
      'EXECUTING': 'play_circle',
      'PENDING': 'schedule'
    };
    return icons[status] || 'help';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatWorkflowType(workflowType?: string): string {
    if (!workflowType) return '';
    return workflowType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  getDuration(instance: WorkflowInstance): string {
    const start = new Date(instance.startedAt);
    const end = instance.completedAt ? new Date(instance.completedAt) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return `${diffSecs}s`;
    if (diffMins < 60) return `${diffMins}m ${diffSecs % 60}s`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  }

  getCompletedSteps(instance: WorkflowInstance): number {
    return instance.steps.filter(step => step.status === 'COMPLETED').length;
  }

  getProgressPercentage(instance: WorkflowInstance): number {
    if (instance.steps.length === 0) return 0;
    return (this.getCompletedSteps(instance) / instance.steps.length) * 100;
  }

  getProgressColor(instance: WorkflowInstance): 'primary' | 'accent' | 'warn' {
    if (instance.status === 'FAILED') return 'warn';
    if (instance.status === 'COMPLETED') return 'accent';
    return 'primary';
  }

  canCancel(instance: WorkflowInstance): boolean {
    return ['PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'EXECUTING'].includes(instance.status);
  }

  viewInstance(instance: WorkflowInstance): void {
    this.instanceSelect.emit(instance);
  }

  cancelInstance(instance: WorkflowInstance): void {
    this.instanceCancel.emit(instance);
  }

  retryInstance(instance: WorkflowInstance): void {
    this.instanceRetry.emit(instance);
  }
}