import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { WorkflowApproval } from '../../../shared/services/workflow.service';

@Component({
  selector: 'app-workflow-approval',
  template: `
    <div class="workflow-approval">
      <div *ngIf="approvals.length === 0" class="no-approvals">
        <mat-icon>check_circle</mat-icon>
        <h3>No pending approvals</h3>
        <p>All workflow approvals are up to date</p>
      </div>

      <div *ngFor="let approval of approvals; trackBy: trackByApproval" 
           class="approval-card"
           [class.urgent]="isUrgent(approval)">
        
        <mat-card>
          <mat-card-header>
            <div mat-card-avatar class="approval-avatar">
              <mat-icon>{{ approval.isRequired ? 'gavel' : 'approval' }}</mat-icon>
            </div>
            
            <mat-card-title>
              <div class="approval-title">
                <span class="workflow-name">{{ approval.instance?.workflow.name }}</span>
                <mat-chip-list class="approval-chips">
                  <mat-chip color="accent" selected *ngIf="approval.isRequired">
                    Required
                  </mat-chip>
                  <mat-chip color="warn" selected *ngIf="isUrgent(approval)">
                    Urgent
                  </mat-chip>
                </mat-chip-list>
              </div>
            </mat-card-title>
            
            <mat-card-subtitle>
              <div class="approval-details">
                <div class="detail-item">
                  <mat-icon>schedule</mat-icon>
                  <span>Requested {{ approval.createdAt | date:'short' }}</span>
                </div>
                <div class="detail-item" *ngIf="approval.deadline">
                  <mat-icon>alarm</mat-icon>
                  <span>Due {{ approval.deadline | date:'short' }}</span>
                </div>
              </div>
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <!-- Workflow Information -->
            <div class="workflow-info">
              <h4>Workflow Details</h4>
              <div class="info-grid">
                <div class="info-item">
                  <label>Type:</label>
                  <span>{{ formatWorkflowType(approval.instance?.workflow.workflowType) }}</span>
                </div>
                <div class="info-item" *ngIf="approval.instance?.relatedItem">
                  <label>Related Item:</label>
                  <span>{{ approval.instance.relatedItem.name }}</span>
                </div>
                <div class="info-item">
                  <label>Status:</label>
                  <span>{{ formatStatus(approval.instance?.status) }}</span>
                </div>
              </div>
            </div>

            <!-- Approval Form -->
            <div class="approval-form" [formGroup]="getApprovalForm(approval.id)">
              <h4>Your Decision</h4>
              
              <div class="decision-buttons">
                <button mat-raised-button 
                        color="primary"
                        [class.selected]="getDecision(approval.id) === 'APPROVED'"
                        (click)="setDecision(approval.id, 'APPROVED')">
                  <mat-icon>check</mat-icon>
                  Approve
                </button>
                
                <button mat-raised-button 
                        color="warn"
                        [class.selected]="getDecision(approval.id) === 'REJECTED'"
                        (click)="setDecision(approval.id, 'REJECTED')">
                  <mat-icon>close</mat-icon>
                  Reject
                </button>
              </div>

              <mat-form-field appearance="outline" class="comments-field">
                <mat-label>Comments ({{ getDecision(approval.id) === 'REJECTED' ? 'Required' : 'Optional' }})</mat-label>
                <textarea matInput 
                          formControlName="comments"
                          rows="3"
                          placeholder="Add your comments or reason for decision...">
                </textarea>
                <mat-error *ngIf="getApprovalForm(approval.id).get('comments')?.hasError('required')">
                  Comments are required when rejecting
                </mat-error>
              </mat-form-field>
            </div>
          </mat-card-content>

          <mat-card-actions align="end">
            <div class="card-actions">
              <button mat-button 
                      (click)="viewWorkflowDetails(approval)">
                <mat-icon>visibility</mat-icon>
                View Workflow
              </button>
              
              <button mat-raised-button 
                      color="primary"
                      [disabled]="!canSubmit(approval.id)"
                      (click)="submitApproval(approval)">
                <mat-icon>send</mat-icon>
                Submit Decision
              </button>
            </div>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Approval History (if needed) -->
      <div *ngIf="showHistory && approvalHistory.length > 0" class="approval-history">
        <h3>Recent Approval History</h3>
        <div class="history-list">
          <mat-card *ngFor="let historyItem of approvalHistory.slice(0, 5)" class="history-card">
            <mat-card-content>
              <div class="history-item">
                <div class="history-header">
                  <span class="workflow-name">{{ historyItem.instance?.workflow.name }}</span>
                  <mat-chip [color]="historyItem.status === 'APPROVED' ? 'primary' : 'warn'" selected>
                    {{ historyItem.status }}
                  </mat-chip>
                </div>
                <div class="history-details">
                  <span>{{ historyItem.approvedAt | date:'short' }}</span>
                  <span *ngIf="historyItem.comments"> • {{ historyItem.comments }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workflow-approval {
      .no-approvals {
        text-align: center;
        padding: 3rem;
        color: #666;

        mat-icon {
          font-size: 4rem;
          width: 4rem;
          height: 4rem;
          margin-bottom: 1rem;
          color: #4CAF50;
        }

        h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        p {
          margin: 0;
        }
      }

      .approval-card {
        margin-bottom: 2rem;

        &.urgent {
          mat-card {
            border-left: 4px solid #F44336;
            box-shadow: 0 4px 16px rgba(244, 67, 54, 0.15);
          }
        }

        mat-card {
          &:hover {
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }

          mat-card-header {
            .approval-avatar {
              background-color: #FF9800;
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
              .approval-title {
                display: flex;
                align-items: center;
                gap: 1rem;
                flex-wrap: wrap;

                .workflow-name {
                  font-weight: 600;
                  color: #333;
                }

                .approval-chips {
                  mat-chip {
                    font-size: 0.75rem;
                    min-height: 24px;
                  }
                }
              }
            }

            mat-card-subtitle {
              .approval-details {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                margin-top: 0.5rem;

                .detail-item {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  font-size: 0.9rem;
                  color: #666;

                  mat-icon {
                    font-size: 1rem;
                    width: 1rem;
                    height: 1rem;
                  }
                }
              }
            }
          }

          mat-card-content {
            .workflow-info {
              margin-bottom: 2rem;
              padding-bottom: 1rem;
              border-bottom: 1px solid #eee;

              h4 {
                margin: 0 0 1rem 0;
                color: #333;
                font-weight: 600;
              }

              .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;

                .info-item {
                  display: flex;
                  flex-direction: column;
                  gap: 0.25rem;

                  label {
                    font-size: 0.8rem;
                    color: #666;
                    text-transform: uppercase;
                    font-weight: 500;
                  }

                  span {
                    color: #333;
                    font-weight: 500;
                  }
                }
              }
            }

            .approval-form {
              h4 {
                margin: 0 0 1rem 0;
                color: #333;
                font-weight: 600;
              }

              .decision-buttons {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;

                button {
                  min-width: 120px;
                  transition: all 0.3s ease;

                  &.selected {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                  }

                  mat-icon {
                    margin-right: 0.5rem;
                  }
                }
              }

              .comments-field {
                width: 100%;
              }
            }
          }

          mat-card-actions {
            .card-actions {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              gap: 1rem;

              button {
                mat-icon {
                  margin-right: 0.5rem;
                }
              }
            }
          }
        }
      }

      .approval-history {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 2px solid #eee;

        h3 {
          margin: 0 0 1.5rem 0;
          color: #333;
        }

        .history-list {
          .history-card {
            margin-bottom: 1rem;
            background-color: #f9f9f9;

            .history-item {
              .history-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;

                .workflow-name {
                  font-weight: 500;
                  color: #333;
                }
              }

              .history-details {
                font-size: 0.9rem;
                color: #666;
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .workflow-approval {
        .approval-card {
          mat-card {
            mat-card-header {
              mat-card-title {
                .approval-title {
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 0.5rem;
                }
              }

              mat-card-subtitle {
                .approval-details {
                  flex-direction: column;
                  gap: 0.5rem;
                }
              }
            }

            mat-card-content {
              .workflow-info {
                .info-grid {
                  grid-template-columns: 1fr;
                }
              }

              .approval-form {
                .decision-buttons {
                  flex-direction: column;

                  button {
                    width: 100%;
                  }
                }
              }
            }

            mat-card-actions {
              .card-actions {
                flex-direction: column;

                button {
                  width: 100%;
                }
              }
            }
          }
        }
      }
    }
  `]
})
export class WorkflowApprovalComponent {
  @Input() approvals: WorkflowApproval[] = [];
  @Input() showHistory = false;
  @Input() approvalHistory: WorkflowApproval[] = [];

  @Output() approvalSubmit = new EventEmitter<{
    approval: WorkflowApproval;
    decision: 'APPROVED' | 'REJECTED';
    comments?: string;
  }>();
  @Output() workflowView = new EventEmitter<WorkflowApproval>();

  private approvalForms = new Map<string, FormGroup>();

  constructor(private fb: FormBuilder) {}

  trackByApproval(index: number, approval: WorkflowApproval): string {
    return approval.id;
  }

  getApprovalForm(approvalId: string): FormGroup {
    if (!this.approvalForms.has(approvalId)) {
      this.approvalForms.set(approvalId, this.fb.group({
        decision: [''],
        comments: ['']
      }));
    }
    return this.approvalForms.get(approvalId)!;
  }

  setDecision(approvalId: string, decision: 'APPROVED' | 'REJECTED'): void {
    const form = this.getApprovalForm(approvalId);
    form.patchValue({ decision });

    // Update validation based on decision
    const commentsControl = form.get('comments');
    if (decision === 'REJECTED') {
      commentsControl?.setValidators([Validators.required]);
    } else {
      commentsControl?.clearValidators();
    }
    commentsControl?.updateValueAndValidity();
  }

  getDecision(approvalId: string): string {
    return this.getApprovalForm(approvalId).get('decision')?.value || '';
  }

  canSubmit(approvalId: string): boolean {
    const form = this.getApprovalForm(approvalId);
    const decision = form.get('decision')?.value;
    return decision && form.valid;
  }

  submitApproval(approval: WorkflowApproval): void {
    const form = this.getApprovalForm(approval.id);
    if (form.valid) {
      const decision = form.get('decision')?.value;
      const comments = form.get('comments')?.value;

      this.approvalSubmit.emit({
        approval,
        decision,
        comments: comments || undefined
      });

      // Reset form after submission
      this.approvalForms.delete(approval.id);
    }
  }

  viewWorkflowDetails(approval: WorkflowApproval): void {
    this.workflowView.emit(approval);
  }

  isUrgent(approval: WorkflowApproval): boolean {
    if (!approval.deadline) return false;
    
    const deadline = new Date(approval.deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilDeadline <= 2; // Urgent if deadline is within 2 hours
  }

  formatStatus(status?: string): string {
    if (!status) return '';
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatWorkflowType(workflowType?: string): string {
    if (!workflowType) return '';
    return workflowType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}