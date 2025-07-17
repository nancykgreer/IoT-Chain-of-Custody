import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { WorkflowService, Workflow, WorkflowInstance } from '../../../shared/services/workflow.service';

@Component({
  selector: 'app-workflow-details',
  template: `
    <div class="workflow-details" *ngIf="workflow">
      <!-- Header -->
      <div class="details-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <div class="title-section">
            <h1>{{ workflow.name }}</h1>
            <mat-chip-list class="status-chips">
              <mat-chip [color]="workflow.isActive ? 'primary' : 'warn'" selected>
                {{ workflow.isActive ? 'Active' : 'Inactive' }}
              </mat-chip>
              <mat-chip color="accent" selected>
                {{ formatTriggerType(workflow.triggerType) }}
              </mat-chip>
              <mat-chip *ngIf="workflow.priority > 5" color="warn" selected>
                High Priority
              </mat-chip>
            </mat-chip-list>
          </div>
          <p class="description">{{ workflow.description || 'No description provided' }}</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="editWorkflow()">
            <mat-icon>edit</mat-icon>
            Edit
          </button>
          <button mat-raised-button 
                  color="primary"
                  *ngIf="workflow.triggerType === 'MANUAL' && workflow.isActive"
                  (click)="executeWorkflow()">
            <mat-icon>play_arrow</mat-icon>
            Execute
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="details-content">
        <mat-tab-group [(selectedIndex)]="selectedTab">
          <!-- Overview Tab -->
          <mat-tab label="Overview">
            <div class="tab-content">
              <div class="overview-grid">
                <!-- Basic Info -->
                <mat-card class="info-card">
                  <mat-card-header>
                    <mat-card-title>Basic Information</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="info-list">
                      <div class="info-item">
                        <label>Type:</label>
                        <span>{{ formatWorkflowType(workflow.workflowType) }}</span>
                      </div>
                      <div class="info-item">
                        <label>Priority:</label>
                        <span>{{ workflow.priority }} / 10</span>
                      </div>
                      <div class="info-item">
                        <label>Timeout:</label>
                        <span>{{ workflow.timeout || 'No timeout' }} minutes</span>
                      </div>
                      <div class="info-item">
                        <label>Created:</label>
                        <span>{{ workflow.createdAt | date:'medium' }}</span>
                      </div>
                      <div class="info-item">
                        <label>Last Updated:</label>
                        <span>{{ workflow.updatedAt | date:'medium' }}</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Trigger Configuration -->
                <mat-card class="info-card">
                  <mat-card-header>
                    <mat-card-title>Trigger Configuration</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="trigger-info">
                      <div class="trigger-type">
                        <mat-icon>{{ getTriggerIcon(workflow.triggerType) }}</mat-icon>
                        <span>{{ formatTriggerType(workflow.triggerType) }}</span>
                      </div>
                      
                      <div *ngIf="workflow.triggerConfig" class="trigger-details">
                        <!-- IoT Alert Trigger -->
                        <div *ngIf="workflow.triggerType === 'IOT_ALERT' && workflow.triggerConfig.iotThreshold">
                          <div class="config-item">
                            <label>Metric:</label>
                            <span>{{ workflow.triggerConfig.iotThreshold.metric }}</span>
                          </div>
                          <div class="config-item">
                            <label>Condition:</label>
                            <span>{{ workflow.triggerConfig.iotThreshold.operator }} {{ workflow.triggerConfig.iotThreshold.value }}</span>
                          </div>
                        </div>

                        <!-- Schedule Trigger -->
                        <div *ngIf="workflow.triggerType === 'SCHEDULE' && workflow.triggerConfig.schedule">
                          <div class="config-item">
                            <label>Schedule:</label>
                            <span>{{ workflow.triggerConfig.schedule.cron }}</span>
                          </div>
                          <div class="config-item">
                            <label>Timezone:</label>
                            <span>{{ workflow.triggerConfig.schedule.timezone }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Conditions -->
                <mat-card class="info-card full-width">
                  <mat-card-header>
                    <mat-card-title>Conditions ({{ workflow.conditions.length }})</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div *ngIf="workflow.conditions.length === 0" class="no-conditions">
                      <mat-icon>info</mat-icon>
                      <span>No conditions defined - workflow will execute for all triggers</span>
                    </div>
                    
                    <div *ngFor="let condition of workflow.conditions; let i = index" 
                         class="condition-item">
                      <div class="condition-header" *ngIf="i > 0">
                        <mat-chip class="combiner">{{ condition.combineWith || 'AND' }}</mat-chip>
                      </div>
                      <div class="condition-details">
                        <span class="field">{{ condition.field }}</span>
                        <span class="operator">{{ condition.operator }}</span>
                        <span class="value">{{ condition.value }}</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <!-- Actions -->
                <mat-card class="info-card full-width">
                  <mat-card-header>
                    <mat-card-title>Actions ({{ workflow.actions.length }})</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div *ngFor="let action of workflow.actions; let i = index" 
                         class="action-item">
                      <div class="action-header">
                        <div class="action-type">
                          <mat-icon>{{ getActionIcon(action.type) }}</mat-icon>
                          <span>{{ formatActionType(action.type) }}</span>
                        </div>
                        <mat-chip class="step-number">Step {{ i + 1 }}</mat-chip>
                      </div>
                      
                      <div class="action-config" *ngIf="action.config">
                        <div *ngFor="let configItem of getActionConfig(action.config) | keyvalue" 
                             class="config-item">
                          <label>{{ formatConfigKey(configItem.key) }}:</label>
                          <span>{{ formatConfigValue(configItem.key, configItem.value) }}</span>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <!-- Execution History Tab -->
          <mat-tab label="Execution History" [matBadge]="workflow.instances?.length || 0" 
                   [matBadgeHidden]="!workflow.instances?.length">
            <div class="tab-content">
              <app-workflow-instances
                [instances]="workflow.instances || []"
                (instanceSelect)="viewInstance($event)">
              </app-workflow-instances>
            </div>
          </mat-tab>

          <!-- Schedule Tab -->
          <mat-tab label="Schedule" *ngIf="workflow.schedules && workflow.schedules.length > 0">
            <div class="tab-content">
              <div class="schedule-info">
                <mat-card *ngFor="let schedule of workflow.schedules" class="schedule-card">
                  <mat-card-header>
                    <mat-card-title>Schedule Configuration</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="schedule-details">
                      <div class="detail-item">
                        <label>Expression:</label>
                        <code>{{ schedule.cronExpression }}</code>
                      </div>
                      <div class="detail-item">
                        <label>Timezone:</label>
                        <span>{{ schedule.timezone }}</span>
                      </div>
                      <div class="detail-item">
                        <label>Status:</label>
                        <mat-chip [color]="schedule.isActive ? 'primary' : 'warn'" selected>
                          {{ schedule.isActive ? 'Active' : 'Inactive' }}
                        </mat-chip>
                      </div>
                      <div class="detail-item" *ngIf="schedule.lastRun">
                        <label>Last Run:</label>
                        <span>{{ schedule.lastRun | date:'medium' }}</span>
                      </div>
                      <div class="detail-item" *ngIf="schedule.nextRun">
                        <label>Next Run:</label>
                        <span>{{ schedule.nextRun | date:'medium' }}</span>
                      </div>
                    </div>
                    
                    <div class="schedule-stats">
                      <div class="stat">
                        <span class="stat-value">{{ schedule.totalRuns }}</span>
                        <span class="stat-label">Total Runs</span>
                      </div>
                      <div class="stat">
                        <span class="stat-value">{{ schedule.successfulRuns }}</span>
                        <span class="stat-label">Successful</span>
                      </div>
                      <div class="stat">
                        <span class="stat-value">{{ schedule.failedRuns }}</span>
                        <span class="stat-label">Failed</span>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>

    <!-- Loading State -->
    <div *ngIf="!workflow" class="loading-container">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Loading workflow details...</p>
    </div>
  `,
  styles: [`
    .workflow-details {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;

      .details-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e0e0e0;

        .header-content {
          flex: 1;

          .title-section {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 0.5rem;
            flex-wrap: wrap;

            h1 {
              margin: 0;
              font-size: 2rem;
              font-weight: 400;
              color: #333;
            }

            .status-chips {
              mat-chip {
                font-size: 0.75rem;
              }
            }
          }

          .description {
            margin: 0;
            color: #666;
            font-size: 1.1rem;
          }
        }

        .header-actions {
          display: flex;
          gap: 1rem;

          button {
            mat-icon {
              margin-right: 0.5rem;
            }
          }
        }
      }

      .details-content {
        .tab-content {
          padding: 1.5rem 0;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;

          .full-width {
            grid-column: 1 / -1;
          }

          .info-card {
            .info-list {
              .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1rem;

                label {
                  font-weight: 500;
                  color: #666;
                }

                span {
                  color: #333;
                }
              }
            }

            .trigger-info {
              .trigger-type {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 1rem;
                font-weight: 500;
                color: #333;

                mat-icon {
                  color: #2196F3;
                }
              }

              .trigger-details {
                padding-left: 2rem;

                .config-item {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 0.5rem;

                  label {
                    font-weight: 500;
                    color: #666;
                  }

                  span {
                    color: #333;
                    font-family: monospace;
                  }
                }
              }
            }

            .no-conditions {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              color: #666;
              font-style: italic;

              mat-icon {
                color: #2196F3;
              }
            }

            .condition-item {
              margin-bottom: 1rem;
              padding: 1rem;
              border: 1px solid #e0e0e0;
              border-radius: 8px;

              .condition-header {
                margin-bottom: 0.5rem;

                .combiner {
                  font-size: 0.75rem;
                  background-color: #f5f5f5;
                }
              }

              .condition-details {
                display: flex;
                gap: 1rem;
                align-items: center;

                .field {
                  font-weight: 500;
                  color: #2196F3;
                }

                .operator {
                  background-color: #f5f5f5;
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                  font-size: 0.85rem;
                }

                .value {
                  font-family: monospace;
                  background-color: #e8f5e8;
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                }
              }
            }

            .action-item {
              margin-bottom: 1rem;
              padding: 1rem;
              border: 1px solid #e0e0e0;
              border-radius: 8px;

              .action-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;

                .action-type {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  font-weight: 500;
                  color: #333;

                  mat-icon {
                    color: #4CAF50;
                  }
                }

                .step-number {
                  font-size: 0.75rem;
                  background-color: #f5f5f5;
                }
              }

              .action-config {
                padding-left: 2rem;

                .config-item {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 0.5rem;

                  label {
                    font-weight: 500;
                    color: #666;
                    text-transform: capitalize;
                  }

                  span {
                    color: #333;
                  }
                }
              }
            }
          }
        }

        .schedule-info {
          .schedule-card {
            .schedule-details {
              margin-bottom: 2rem;

              .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;

                label {
                  font-weight: 500;
                  color: #666;
                }

                code {
                  background-color: #f5f5f5;
                  padding: 0.25rem 0.5rem;
                  border-radius: 4px;
                  font-family: monospace;
                }
              }
            }

            .schedule-stats {
              display: flex;
              gap: 2rem;
              padding-top: 1rem;
              border-top: 1px solid #e0e0e0;

              .stat {
                text-align: center;

                .stat-value {
                  display: block;
                  font-size: 1.5rem;
                  font-weight: 700;
                  color: #333;
                }

                .stat-label {
                  font-size: 0.8rem;
                  color: #666;
                  text-transform: uppercase;
                }
              }
            }
          }
        }
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      color: #666;

      p {
        margin-top: 1rem;
      }
    }

    @media (max-width: 768px) {
      .workflow-details {
        padding: 1rem;

        .details-header {
          flex-direction: column;
          gap: 1rem;

          .header-actions {
            align-self: stretch;

            button {
              flex: 1;
            }
          }
        }

        .details-content {
          .overview-grid {
            grid-template-columns: 1fr;
          }
        }
      }
    }
  `]
})
export class WorkflowDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  workflow: Workflow | null = null;
  selectedTab = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(
      switchMap(params => this.workflowService.getWorkflow(params['id'])),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (workflow) => {
        this.workflow = workflow;
        
        // Check if specific instance should be highlighted
        const instanceId = this.route.snapshot.queryParams['instance'];
        if (instanceId) {
          this.selectedTab = 1; // Switch to execution history tab
        }
      },
      error: (error) => {
        console.error('Error loading workflow:', error);
        this.router.navigate(['/workflows']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    this.router.navigate(['/workflows']);
  }

  editWorkflow(): void {
    if (this.workflow) {
      this.router.navigate(['/workflows', this.workflow.id, 'edit']);
    }
  }

  executeWorkflow(): void {
    if (this.workflow) {
      this.workflowService.executeWorkflow(this.workflow.id).subscribe({
        next: (instance) => {
          console.log('Workflow executed:', instance);
          // Refresh workflow data to show new instance
          this.workflowService.getWorkflow(this.workflow!.id).subscribe(updated => {
            this.workflow = updated;
            this.selectedTab = 1; // Switch to execution history
          });
        },
        error: (error) => {
          console.error('Error executing workflow:', error);
        }
      });
    }
  }

  viewInstance(instance: WorkflowInstance): void {
    // Could navigate to instance details or show in dialog
    console.log('View instance:', instance);
  }

  formatTriggerType(triggerType: string): string {
    return triggerType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatWorkflowType(workflowType: string): string {
    return workflowType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatActionType(actionType: string): string {
    return actionType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getTriggerIcon(triggerType: string): string {
    const icons: Record<string, string> = {
      'MANUAL': 'touch_app',
      'IOT_ALERT': 'sensors',
      'SCHEDULE': 'schedule',
      'API': 'api'
    };
    return icons[triggerType] || 'help';
  }

  getActionIcon(actionType: string): string {
    const icons: Record<string, string> = {
      'TRANSFER': 'swap_horiz',
      'QUARANTINE': 'block',
      'NOTIFY': 'notifications',
      'ALERT': 'warning',
      'APPROVE': 'gavel',
      'UPDATE': 'edit'
    };
    return icons[actionType] || 'play_arrow';
  }

  getActionConfig(config: any): Record<string, any> {
    // Filter out empty/null values for display
    const filtered: Record<string, any> = {};
    Object.keys(config || {}).forEach(key => {
      const value = config[key];
      if (value !== null && value !== undefined && value !== '' && 
          !(Array.isArray(value) && value.length === 0)) {
        filtered[key] = value;
      }
    });
    return filtered;
  }

  formatConfigKey(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatConfigValue(key: string, value: any): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }
}