import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Workflow } from '../../../shared/services/workflow.service';

@Component({
  selector: 'app-workflow-list',
  template: `
    <div class="workflow-list">
      <div *ngIf="workflows.length === 0" class="no-workflows">
        <mat-icon>settings</mat-icon>
        <h3>No workflows configured</h3>
        <p>Create your first workflow to automate healthcare processes</p>
      </div>

      <div *ngFor="let workflow of workflows; trackBy: trackByWorkflow" 
           class="workflow-card"
           [class.inactive]="!workflow.isActive">
        
        <mat-card>
          <mat-card-header>
            <div mat-card-avatar class="workflow-avatar">
              <mat-icon>{{ getWorkflowIcon(workflow.workflowType) }}</mat-icon>
            </div>
            
            <mat-card-title>
              <span class="workflow-name">{{ workflow.name }}</span>
              <mat-chip-list class="workflow-chips">
                <mat-chip [color]="getTriggerColor(workflow.triggerType)" selected>
                  {{ formatTriggerType(workflow.triggerType) }}
                </mat-chip>
                <mat-chip *ngIf="workflow.priority > 5" color="accent" selected>
                  High Priority
                </mat-chip>
              </mat-chip-list>
            </mat-card-title>
            
            <mat-card-subtitle>
              {{ workflow.description || 'No description provided' }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="workflow-details">
              <div class="detail-item">
                <mat-icon>rule</mat-icon>
                <span>{{ workflow.conditions.length }} condition(s)</span>
              </div>
              
              <div class="detail-item">
                <mat-icon>play_arrow</mat-icon>
                <span>{{ workflow.actions.length }} action(s)</span>
              </div>
              
              <div class="detail-item" *ngIf="workflow.instances && workflow.instances.length > 0">
                <mat-icon>history</mat-icon>
                <span>{{ workflow.instances.length }} recent execution(s)</span>
              </div>
            </div>

            <!-- Recent Executions -->
            <div *ngIf="workflow.instances && workflow.instances.length > 0" 
                 class="recent-executions">
              <h4>Recent Executions</h4>
              <div class="execution-list">
                <div *ngFor="let instance of workflow.instances.slice(0, 3)" 
                     class="execution-item"
                     [class]="'status-' + instance.status.toLowerCase()">
                  <mat-icon>{{ getStatusIcon(instance.status) }}</mat-icon>
                  <span class="execution-time">{{ instance.startedAt | date:'short' }}</span>
                  <span class="execution-status">{{ formatStatus(instance.status) }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions align="end">
            <div class="card-actions">
              <!-- Toggle Switch -->
              <div class="toggle-section">
                <mat-slide-toggle 
                  [checked]="workflow.isActive"
                  (change)="onToggleWorkflow(workflow, $event.checked)"
                  [disabled]="toggleDisabled">
                  {{ workflow.isActive ? 'Active' : 'Inactive' }}
                </mat-slide-toggle>
              </div>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button mat-button 
                        color="primary"
                        (click)="onViewWorkflow(workflow)">
                  <mat-icon>visibility</mat-icon>
                  View
                </button>
                
                <button mat-button 
                        color="accent"
                        *ngIf="workflow.triggerType === 'MANUAL' && workflow.isActive"
                        (click)="onExecuteWorkflow(workflow)">
                  <mat-icon>play_arrow</mat-icon>
                  Execute
                </button>

                <button mat-icon-button 
                        [matMenuTriggerFor]="workflowMenu"
                        aria-label="More options">
                  <mat-icon>more_vert</mat-icon>
                </button>

                <mat-menu #workflowMenu="matMenu">
                  <button mat-menu-item (click)="onEditWorkflow(workflow)">
                    <mat-icon>edit</mat-icon>
                    <span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="onDuplicateWorkflow(workflow)">
                    <mat-icon>content_copy</mat-icon>
                    <span>Duplicate</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item 
                          (click)="onDeleteWorkflow(workflow)"
                          class="delete-option">
                    <mat-icon>delete</mat-icon>
                    <span>Delete</span>
                  </button>
                </mat-menu>
              </div>
            </div>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .workflow-list {
      .no-workflows {
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

      .workflow-card {
        margin-bottom: 1.5rem;
        transition: opacity 0.3s ease;

        &.inactive {
          opacity: 0.6;
        }

        mat-card {
          &:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          }

          mat-card-header {
            .workflow-avatar {
              background-color: #2196F3;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;

              mat-icon {
                font-size: 1.5rem;
                width: 1.5rem;
                height: 1.5rem;
              }
            }

            mat-card-title {
              display: flex;
              align-items: center;
              gap: 1rem;
              flex-wrap: wrap;

              .workflow-name {
                font-weight: 600;
                color: #333;
              }

              .workflow-chips {
                mat-chip {
                  font-size: 0.75rem;
                  min-height: 24px;
                }
              }
            }
          }

          mat-card-content {
            .workflow-details {
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
              margin-bottom: 1rem;

              .detail-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                color: #666;

                mat-icon {
                  font-size: 1.1rem;
                  width: 1.1rem;
                  height: 1.1rem;
                }
              }
            }

            .recent-executions {
              margin-top: 1rem;
              padding-top: 1rem;
              border-top: 1px solid #eee;

              h4 {
                margin: 0 0 0.75rem 0;
                font-size: 0.9rem;
                color: #666;
                text-transform: uppercase;
                font-weight: 500;
              }

              .execution-list {
                .execution-item {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  margin-bottom: 0.5rem;
                  font-size: 0.85rem;

                  mat-icon {
                    font-size: 1rem;
                    width: 1rem;
                    height: 1rem;
                  }

                  .execution-time {
                    color: #666;
                  }

                  .execution-status {
                    font-weight: 500;
                  }

                  &.status-completed {
                    .execution-status { color: #4CAF50; }
                    mat-icon { color: #4CAF50; }
                  }

                  &.status-failed {
                    .execution-status { color: #F44336; }
                    mat-icon { color: #F44336; }
                  }

                  &.status-in_progress {
                    .execution-status { color: #2196F3; }
                    mat-icon { color: #2196F3; }
                  }

                  &.status-awaiting_approval {
                    .execution-status { color: #FF9800; }
                    mat-icon { color: #FF9800; }
                  }
                }
              }
            }
          }

          mat-card-actions {
            .card-actions {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;

              .toggle-section {
                mat-slide-toggle {
                  .mat-slide-toggle-content {
                    font-size: 0.9rem;
                  }
                }
              }

              .action-buttons {
                display: flex;
                align-items: center;
                gap: 0.5rem;

                button {
                  &.delete-option {
                    color: #F44336;
                  }
                }
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .workflow-list {
        .workflow-card {
          mat-card {
            mat-card-header {
              mat-card-title {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.5rem;
              }
            }

            mat-card-content {
              .workflow-details {
                flex-direction: column;
                gap: 0.5rem;
              }
            }

            mat-card-actions {
              .card-actions {
                flex-direction: column;
                gap: 1rem;
                align-items: stretch;

                .action-buttons {
                  justify-content: space-between;
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class WorkflowListComponent {
  @Input() workflows: Workflow[] = [];
  @Input() toggleDisabled = false;

  @Output() workflowSelect = new EventEmitter<Workflow>();
  @Output() workflowToggle = new EventEmitter<{ workflow: Workflow; isActive: boolean }>();
  @Output() workflowExecute = new EventEmitter<Workflow>();
  @Output() workflowEdit = new EventEmitter<Workflow>();
  @Output() workflowDuplicate = new EventEmitter<Workflow>();
  @Output() workflowDelete = new EventEmitter<Workflow>();

  trackByWorkflow(index: number, workflow: Workflow): string {
    return workflow.id;
  }

  getWorkflowIcon(workflowType: string): string {
    const icons: Record<string, string> = {
      'TEMPERATURE_TRIGGERED': 'thermostat',
      'STANDARD_TRANSFER': 'swap_horiz',
      'SCHEDULED_TRANSFER': 'schedule',
      'EMERGENCY_RECALL': 'warning',
      'APPROVAL_REQUIRED': 'approval',
      'MAINTENANCE_ALERT': 'build'
    };
    return icons[workflowType] || 'settings';
  }

  getTriggerColor(triggerType: string): 'primary' | 'accent' | 'warn' {
    switch (triggerType) {
      case 'IOT_ALERT': return 'warn';
      case 'SCHEDULE': return 'accent';
      default: return 'primary';
    }
  }

  formatTriggerType(triggerType: string): string {
    return triggerType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
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

  onViewWorkflow(workflow: Workflow): void {
    this.workflowSelect.emit(workflow);
  }

  onToggleWorkflow(workflow: Workflow, isActive: boolean): void {
    this.workflowToggle.emit({ workflow, isActive });
  }

  onExecuteWorkflow(workflow: Workflow): void {
    this.workflowExecute.emit(workflow);
  }

  onEditWorkflow(workflow: Workflow): void {
    this.workflowEdit.emit(workflow);
  }

  onDuplicateWorkflow(workflow: Workflow): void {
    this.workflowDuplicate.emit(workflow);
  }

  onDeleteWorkflow(workflow: Workflow): void {
    this.workflowDelete.emit(workflow);
  }
}