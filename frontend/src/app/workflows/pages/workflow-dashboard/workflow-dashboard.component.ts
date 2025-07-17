import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { WorkflowService, Workflow, WorkflowInstance, WorkflowApproval, WorkflowAnalytics } from '../../../shared/services/workflow.service';
import { WebSocketService } from '../../../shared/services/websocket.service';

@Component({
  selector: 'app-workflow-dashboard',
  template: `
    <div class="workflow-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Workflow Management</h1>
          <p class="subtitle">Automated healthcare compliance and process orchestration</p>
        </div>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="createWorkflow()">
            <mat-icon>add</mat-icon>
            Create Workflow
          </button>
        </div>
      </div>

      <!-- Analytics Cards -->
      <div class="analytics-grid" *ngIf="analytics">
        <mat-card class="metric-card workflows">
          <mat-card-content>
            <div class="metric-icon">
              <mat-icon>settings</mat-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ analytics.totalWorkflows }}</div>
              <div class="metric-label">Total Workflows</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card instances">
          <mat-card-content>
            <div class="metric-icon">
              <mat-icon>play_arrow</mat-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ analytics.totalInstances }}</div>
              <div class="metric-label">Executions ({{ analytics.timeframe }})</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card success-rate" [class.excellent]="analytics.successRate >= 95">
          <mat-card-content>
            <div class="metric-icon">
              <mat-icon>{{ analytics.successRate >= 95 ? 'check_circle' : 'trending_up' }}</mat-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ analytics.successRate | number:'1.1-1' }}%</div>
              <div class="metric-label">Success Rate</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="metric-card approvals" [class.has-pending]="pendingApprovals.length > 0">
          <mat-card-content>
            <div class="metric-icon">
              <mat-icon matBadge="{{ pendingApprovals.length }}" 
                       [matBadgeHidden]="pendingApprovals.length === 0"
                       matBadgeColor="accent">
                approval
              </mat-icon>
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ pendingApprovals.length }}</div>
              <div class="metric-label">Pending Approvals</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Quick Actions -->
      <mat-card class="quick-actions" *ngIf="pendingApprovals.length > 0">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>priority_high</mat-icon>
            Urgent Actions Required
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="approval-items">
            <div *ngFor="let approval of pendingApprovals.slice(0, 3)" 
                 class="approval-item" 
                 (click)="openApproval(approval)">
              <div class="approval-info">
                <div class="workflow-name">{{ approval.instance?.workflow.name }}</div>
                <div class="approval-details">
                  Created {{ approval.createdAt | date:'short' }}
                  <span *ngIf="approval.deadline" class="deadline">
                    • Due {{ approval.deadline | date:'short' }}
                  </span>
                </div>
              </div>
              <button mat-icon-button color="primary">
                <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </div>
          <div class="show-all" *ngIf="pendingApprovals.length > 3">
            <button mat-button color="primary" (click)="viewAllApprovals()">
              View All {{ pendingApprovals.length }} Approvals
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Main Content Tabs -->
      <mat-tab-group class="main-tabs" [(selectedIndex)]="selectedTab">
        <mat-tab label="Active Workflows">
          <div class="tab-content">
            <app-workflow-list 
              [workflows]="workflows"
              (workflowSelect)="openWorkflow($event)"
              (workflowToggle)="toggleWorkflow($event)"
              (workflowExecute)="executeWorkflow($event)">
            </app-workflow-list>
          </div>
        </mat-tab>

        <mat-tab label="Recent Executions">
          <div class="tab-content">
            <app-workflow-instances
              [instances]="recentInstances"
              (instanceSelect)="openInstance($event)"
              (instanceCancel)="cancelInstance($event)">
            </app-workflow-instances>
          </div>
        </mat-tab>

        <mat-tab label="Approvals" [matBadge]="pendingApprovals.length" 
                 [matBadgeHidden]="pendingApprovals.length === 0">
          <div class="tab-content">
            <app-workflow-approval
              [approvals]="pendingApprovals"
              (approvalSubmit)="submitApproval($event)">
            </app-workflow-approval>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .workflow-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;

      .header-content {
        h1 {
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: 300;
          color: #333;
        }

        .subtitle {
          margin: 0;
          color: #666;
          font-size: 1.1rem;
        }
      }

      .header-actions {
        button {
          min-width: 160px;
          
          mat-icon {
            margin-right: 0.5rem;
          }
        }
      }
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;

      .metric-card {
        mat-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem !important;
        }

        .metric-icon {
          mat-icon {
            font-size: 2.5rem;
            width: 2.5rem;
            height: 2.5rem;
            color: #2196F3;
          }
        }

        .metric-content {
          flex: 1;

          .metric-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #333;
            line-height: 1;
          }

          .metric-label {
            font-size: 0.9rem;
            color: #666;
            margin-top: 0.25rem;
            text-transform: uppercase;
            font-weight: 500;
          }
        }

        &.success-rate.excellent {
          .metric-icon mat-icon {
            color: #4CAF50;
          }
        }

        &.approvals.has-pending {
          border-left: 4px solid #FF9800;
          
          .metric-icon mat-icon {
            color: #FF9800;
          }
        }
      }
    }

    .quick-actions {
      margin-bottom: 2rem;
      border-left: 4px solid #FF9800;

      mat-card-header {
        mat-card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #FF9800;
          font-weight: 600;

          mat-icon {
            color: #FF9800;
          }
        }
      }

      .approval-items {
        .approval-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s ease;

          &:hover {
            background-color: #f5f5f5;
          }

          .approval-info {
            flex: 1;

            .workflow-name {
              font-weight: 600;
              color: #333;
              margin-bottom: 0.25rem;
            }

            .approval-details {
              font-size: 0.9rem;
              color: #666;

              .deadline {
                color: #FF9800;
                font-weight: 500;
              }
            }
          }
        }
      }

      .show-all {
        text-align: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
      }
    }

    .main-tabs {
      .tab-content {
        padding: 1.5rem 0;
      }
    }

    @media (max-width: 768px) {
      .workflow-dashboard {
        padding: 1rem;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 1rem;

        .header-actions {
          align-self: stretch;

          button {
            width: 100%;
          }
        }
      }

      .analytics-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `]
})
export class WorkflowDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  workflows: Workflow[] = [];
  recentInstances: WorkflowInstance[] = [];
  pendingApprovals: WorkflowApproval[] = [];
  analytics: WorkflowAnalytics | null = null;
  selectedTab = 0;

  constructor(
    private workflowService: WorkflowService,
    private websocketService: WebSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // Load all data in parallel
    combineLatest([
      this.workflowService.getWorkflows(),
      this.workflowService.getWorkflowInstances({ limit: 20 }),
      this.workflowService.getPendingApprovals(),
      this.workflowService.getWorkflowAnalytics('30d')
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([workflows, instances, approvals, analytics]) => {
        this.workflows = workflows;
        this.recentInstances = instances;
        this.pendingApprovals = approvals;
        this.analytics = analytics;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
      }
    });
  }

  private setupRealTimeUpdates(): void {
    // Listen for workflow events
    this.websocketService.on('workflow:started').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadDashboardData();
    });

    this.websocketService.on('workflow:completed').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadDashboardData();
    });

    this.websocketService.on('approval:required').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.workflowService.refreshPendingApprovals();
    });
  }

  createWorkflow(): void {
    this.router.navigate(['/workflows/create']);
  }

  openWorkflow(workflow: Workflow): void {
    this.router.navigate(['/workflows', workflow.id]);
  }

  toggleWorkflow(event: { workflow: Workflow; isActive: boolean }): void {
    this.workflowService.updateWorkflow(event.workflow.id, {
      isActive: event.isActive
    }).subscribe({
      next: () => {
        const index = this.workflows.findIndex(w => w.id === event.workflow.id);
        if (index !== -1) {
          this.workflows[index] = { ...this.workflows[index], isActive: event.isActive };
        }
      },
      error: (error) => {
        console.error('Error updating workflow:', error);
      }
    });
  }

  executeWorkflow(workflow: Workflow): void {
    this.workflowService.executeWorkflow(workflow.id).subscribe({
      next: (instance) => {
        this.recentInstances.unshift(instance);
        console.log('Workflow executed:', instance);
      },
      error: (error) => {
        console.error('Error executing workflow:', error);
      }
    });
  }

  openInstance(instance: WorkflowInstance): void {
    this.router.navigate(['/workflows', instance.workflowId], {
      queryParams: { instance: instance.id }
    });
  }

  cancelInstance(instance: WorkflowInstance): void {
    this.workflowService.cancelWorkflowInstance(instance.id).subscribe({
      next: () => {
        const index = this.recentInstances.findIndex(i => i.id === instance.id);
        if (index !== -1) {
          this.recentInstances[index] = { ...this.recentInstances[index], status: 'CANCELLED' };
        }
      },
      error: (error) => {
        console.error('Error cancelling workflow instance:', error);
      }
    });
  }

  openApproval(approval: WorkflowApproval): void {
    this.selectedTab = 2; // Switch to approvals tab
  }

  viewAllApprovals(): void {
    this.selectedTab = 2; // Switch to approvals tab
  }

  submitApproval(event: { approval: WorkflowApproval; decision: 'APPROVED' | 'REJECTED'; comments?: string }): void {
    this.workflowService.submitApproval(event.approval.id, event.decision, event.comments).subscribe({
      next: () => {
        // Remove from pending approvals
        this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== event.approval.id);
        // Refresh data
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error submitting approval:', error);
      }
    });
  }
}