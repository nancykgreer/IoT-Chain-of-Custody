import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowService } from '../../../shared/services/workflow.service';

@Component({
  selector: 'app-workflow-create',
  template: `
    <div class="workflow-create">
      <!-- Header -->
      <div class="create-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <h1>Create New Workflow</h1>
          <p>Design automated healthcare processes and compliance rules</p>
        </div>
      </div>

      <!-- Workflow Form -->
      <form [formGroup]="workflowForm" (ngSubmit)="onSubmit()">
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Basic Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Workflow Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter workflow name">
                <mat-error *ngIf="workflowForm.get('name')?.hasError('required')">
                  Workflow name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="3" 
                          placeholder="Describe what this workflow does"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Workflow Type</mat-label>
                <mat-select formControlName="workflowType">
                  <mat-option value="STANDARD_TRANSFER">Standard Transfer</mat-option>
                  <mat-option value="TEMPERATURE_TRIGGERED">Temperature Triggered</mat-option>
                  <mat-option value="SCHEDULED_TRANSFER">Scheduled Transfer</mat-option>
                  <mat-option value="EMERGENCY_RECALL">Emergency Recall</mat-option>
                  <mat-option value="APPROVAL_REQUIRED">Approval Required</mat-option>
                  <mat-option value="MAINTENANCE_ALERT">Maintenance Alert</mat-option>
                </mat-select>
                <mat-error *ngIf="workflowForm.get('workflowType')?.hasError('required')">
                  Workflow type is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Priority</mat-label>
                <mat-select formControlName="priority">
                  <mat-option value="1">Low (1)</mat-option>
                  <mat-option value="3">Normal (3)</mat-option>
                  <mat-option value="5">Medium (5)</mat-option>
                  <mat-option value="8">High (8)</mat-option>
                  <mat-option value="10">Critical (10)</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Trigger Configuration -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Trigger Configuration</mat-card-title>
            <mat-card-subtitle>Define when this workflow should execute</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Trigger Type</mat-label>
              <mat-select formControlName="triggerType" (selectionChange)="onTriggerTypeChange($event.value)">
                <mat-option value="MANUAL">Manual Execution</mat-option>
                <mat-option value="IOT_ALERT">IoT Alert Triggered</mat-option>
                <mat-option value="SCHEDULE">Scheduled Execution</mat-option>
                <mat-option value="API">API Triggered</mat-option>
              </mat-select>
              <mat-error *ngIf="workflowForm.get('triggerType')?.hasError('required')">
                Trigger type is required
              </mat-error>
            </mat-form-field>

            <!-- IoT Alert Configuration -->
            <div *ngIf="workflowForm.get('triggerType')?.value === 'IOT_ALERT'" class="trigger-config">
              <h4>IoT Alert Settings</h4>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Metric Type</mat-label>
                  <mat-select formControlName="iotMetric">
                    <mat-option value="TEMP_HIGH">Temperature High</mat-option>
                    <mat-option value="TEMP_LOW">Temperature Low</mat-option>
                    <mat-option value="HUMIDITY_HIGH">Humidity High</mat-option>
                    <mat-option value="BATTERY_LOW">Battery Low</mat-option>
                    <mat-option value="LOCATION_VIOLATION">Location Violation</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Operator</mat-label>
                  <mat-select formControlName="iotOperator">
                    <mat-option value="GREATER_THAN">Greater Than</mat-option>
                    <mat-option value="LESS_THAN">Less Than</mat-option>
                    <mat-option value="EQUALS">Equals</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Threshold Value</mat-label>
                  <input matInput type="number" formControlName="iotValue" placeholder="Enter threshold value">
                </mat-form-field>
              </div>
            </div>

            <!-- Schedule Configuration -->
            <div *ngIf="workflowForm.get('triggerType')?.value === 'SCHEDULE'" class="trigger-config">
              <h4>Schedule Settings</h4>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Cron Expression</mat-label>
                  <input matInput formControlName="cronExpression" placeholder="0 14 * * *">
                  <mat-hint>Examples: "0 14 * * *" (daily at 2 PM), "0 9 * * MON" (Mondays at 9 AM)</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Timezone</mat-label>
                  <mat-select formControlName="timezone">
                    <mat-option value="America/New_York">Eastern Time</mat-option>
                    <mat-option value="America/Chicago">Central Time</mat-option>
                    <mat-option value="America/Denver">Mountain Time</mat-option>
                    <mat-option value="America/Los_Angeles">Pacific Time</mat-option>
                    <mat-option value="UTC">UTC</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Conditions -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Conditions</mat-card-title>
            <mat-card-subtitle>Define when the workflow should execute (optional)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div formArrayName="conditions">
              <div *ngFor="let condition of conditions.controls; let i = index" 
                   [formGroupName]="i" class="condition-item">
                <div class="condition-header">
                  <h4>Condition {{ i + 1 }}</h4>
                  <button type="button" mat-icon-button color="warn" 
                          (click)="removeCondition(i)" *ngIf="conditions.length > 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Field</mat-label>
                    <mat-select formControlName="field">
                      <mat-option value="item.type">Item Type</mat-option>
                      <mat-option value="item.status">Item Status</mat-option>
                      <mat-option value="item.metadata.value">Item Value</mat-option>
                      <mat-option value="item.currentLocation.name">Location Name</mat-option>
                      <mat-option value="device.batteryLevel">Battery Level</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Operator</mat-label>
                    <mat-select formControlName="operator">
                      <mat-option value="EQUALS">Equals</mat-option>
                      <mat-option value="NOT_EQUALS">Not Equals</mat-option>
                      <mat-option value="GREATER_THAN">Greater Than</mat-option>
                      <mat-option value="LESS_THAN">Less Than</mat-option>
                      <mat-option value="CONTAINS">Contains</mat-option>
                      <mat-option value="IN">In List</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Value</mat-label>
                    <input matInput formControlName="value" placeholder="Enter value">
                  </mat-form-field>

                  <mat-form-field appearance="outline" *ngIf="i > 0">
                    <mat-label>Combine With</mat-label>
                    <mat-select formControlName="combineWith">
                      <mat-option value="AND">AND</mat-option>
                      <mat-option value="OR">OR</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <button type="button" mat-button color="primary" (click)="addCondition()">
              <mat-icon>add</mat-icon>
              Add Condition
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Actions -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Actions</mat-card-title>
            <mat-card-subtitle>Define what the workflow should do</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div formArrayName="actions">
              <div *ngFor="let action of actions.controls; let i = index" 
                   [formGroupName]="i" class="action-item">
                <div class="action-header">
                  <h4>Action {{ i + 1 }}</h4>
                  <button type="button" mat-icon-button color="warn" 
                          (click)="removeAction(i)" *ngIf="actions.length > 1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                
                <div class="action-config">
                  <mat-form-field appearance="outline" class="action-type">
                    <mat-label>Action Type</mat-label>
                    <mat-select formControlName="type" (selectionChange)="onActionTypeChange(i, $event.value)">
                      <mat-option value="TRANSFER">Transfer Item</mat-option>
                      <mat-option value="QUARANTINE">Quarantine Item</mat-option>
                      <mat-option value="NOTIFY">Send Notification</mat-option>
                      <mat-option value="ALERT">Create Alert</mat-option>
                      <mat-option value="APPROVE">Require Approval</mat-option>
                      <mat-option value="UPDATE">Update Item</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <!-- Action-specific configuration -->
                  <div [ngSwitch]="action.get('type')?.value" class="action-details">
                    <!-- Transfer Configuration -->
                    <div *ngSwitchCase="'TRANSFER'" class="form-grid">
                      <mat-form-field appearance="outline">
                        <mat-label>Target Location</mat-label>
                        <input matInput formControlName="targetLocation" 
                               placeholder="Enter target location ID">
                      </mat-form-field>
                    </div>

                    <!-- Notification Configuration -->
                    <div *ngSwitchCase="'NOTIFY'" class="form-grid">
                      <mat-form-field appearance="outline">
                        <mat-label>Notify User Roles</mat-label>
                        <mat-select formControlName="notifyUsers" multiple>
                          <mat-option value="ADMIN">Admin</mat-option>
                          <mat-option value="LAB_TECHNICIAN">Lab Technician</mat-option>
                          <mat-option value="NURSE">Nurse</mat-option>
                          <mat-option value="COMPLIANCE_OFFICER">Compliance Officer</mat-option>
                          <mat-option value="TRANSPORT_STAFF">Transport Staff</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Message</mat-label>
                        <textarea matInput formControlName="message" rows="2" 
                                  placeholder="Enter notification message"></textarea>
                      </mat-form-field>
                    </div>

                    <!-- Alert Configuration -->
                    <div *ngSwitchCase="'ALERT'" class="form-grid">
                      <mat-form-field appearance="outline">
                        <mat-label>Alert Severity</mat-label>
                        <mat-select formControlName="alertSeverity">
                          <mat-option value="LOW">Low</mat-option>
                          <mat-option value="MEDIUM">Medium</mat-option>
                          <mat-option value="HIGH">High</mat-option>
                          <mat-option value="CRITICAL">Critical</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Alert Message</mat-label>
                        <textarea matInput formControlName="message" rows="2" 
                                  placeholder="Enter alert message"></textarea>
                      </mat-form-field>
                    </div>

                    <!-- Approval Configuration -->
                    <div *ngSwitchCase="'APPROVE'" class="form-grid">
                      <mat-form-field appearance="outline">
                        <mat-label>Required Approvers</mat-label>
                        <mat-select formControlName="approvers" multiple>
                          <mat-option value="ADMIN">Admin</mat-option>
                          <mat-option value="COMPLIANCE_OFFICER">Compliance Officer</mat-option>
                          <mat-option value="DOCTOR">Doctor</mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Required Approvals</mat-label>
                        <input matInput type="number" formControlName="requiredApprovals" 
                               placeholder="Number of required approvals">
                      </mat-form-field>

                      <mat-form-field appearance="outline">
                        <mat-label>Timeout (minutes)</mat-label>
                        <input matInput type="number" formControlName="timeout" 
                               placeholder="Approval timeout in minutes">
                      </mat-form-field>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" mat-button color="primary" (click)="addAction()">
              <mat-icon>add</mat-icon>
              Add Action
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" mat-button (click)="goBack()">Cancel</button>
          <button type="button" mat-stroked-button (click)="saveDraft()">Save Draft</button>
          <button type="submit" mat-raised-button color="primary" 
                  [disabled]="workflowForm.invalid || isSubmitting">
            <mat-icon *ngIf="isSubmitting">hourglass_empty</mat-icon>
            <mat-icon *ngIf="!isSubmitting">save</mat-icon>
            {{ isSubmitting ? 'Creating...' : 'Create Workflow' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .workflow-create {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1.5rem;

      .create-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 2rem;

        .header-content {
          h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2rem;
            font-weight: 300;
            color: #333;
          }

          p {
            margin: 0;
            color: #666;
            font-size: 1.1rem;
          }
        }
      }

      .form-section {
        margin-bottom: 2rem;

        mat-card-header {
          margin-bottom: 1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          align-items: start;

          .full-width {
            grid-column: 1 / -1;
          }
        }

        .trigger-config,
        .condition-item,
        .action-item {
          padding: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 1rem;

          h4 {
            margin: 0 0 1rem 0;
            color: #333;
            font-weight: 600;
          }

          .condition-header,
          .action-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }
        }

        .action-config {
          .action-type {
            margin-bottom: 1rem;
          }

          .action-details {
            .form-grid {
              margin-top: 1rem;
            }
          }
        }
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 2rem 0;
        border-top: 1px solid #e0e0e0;

        button {
          min-width: 120px;

          mat-icon {
            margin-right: 0.5rem;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .workflow-create {
        padding: 1rem;

        .form-section {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-actions {
          flex-direction: column;

          button {
            width: 100%;
          }
        }
      }
    }
  `]
})
export class WorkflowCreateComponent implements OnInit {
  workflowForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private workflowService: WorkflowService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.workflowForm = this.createForm();
  }

  ngOnInit(): void {
    // Add initial condition and action
    this.addCondition();
    this.addAction();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: [''],
      workflowType: ['', Validators.required],
      triggerType: ['', Validators.required],
      priority: [5],
      timeout: [60],
      isActive: [true],
      
      // Trigger config fields
      iotMetric: [''],
      iotOperator: [''],
      iotValue: [''],
      cronExpression: [''],
      timezone: ['UTC'],
      
      // Form arrays
      conditions: this.fb.array([]),
      actions: this.fb.array([])
    });
  }

  get conditions(): FormArray {
    return this.workflowForm.get('conditions') as FormArray;
  }

  get actions(): FormArray {
    return this.workflowForm.get('actions') as FormArray;
  }

  addCondition(): void {
    const conditionGroup = this.fb.group({
      field: ['', Validators.required],
      operator: ['', Validators.required],
      value: ['', Validators.required],
      combineWith: ['AND']
    });
    this.conditions.push(conditionGroup);
  }

  removeCondition(index: number): void {
    this.conditions.removeAt(index);
  }

  addAction(): void {
    const actionGroup = this.fb.group({
      type: ['', Validators.required],
      targetLocation: [''],
      notifyUsers: [[]],
      message: [''],
      alertSeverity: ['MEDIUM'],
      approvers: [[]],
      requiredApprovals: [1],
      timeout: [60]
    });
    this.actions.push(actionGroup);
  }

  removeAction(index: number): void {
    this.actions.removeAt(index);
  }

  onTriggerTypeChange(triggerType: string): void {
    // Reset trigger-specific fields
    this.workflowForm.patchValue({
      iotMetric: '',
      iotOperator: '',
      iotValue: '',
      cronExpression: '',
      timezone: 'UTC'
    });
  }

  onActionTypeChange(index: number, actionType: string): void {
    const actionGroup = this.actions.at(index);
    
    // Reset action-specific fields
    actionGroup.patchValue({
      targetLocation: '',
      notifyUsers: [],
      message: '',
      alertSeverity: 'MEDIUM',
      approvers: [],
      requiredApprovals: 1,
      timeout: 60
    });
  }

  saveDraft(): void {
    // Save as inactive workflow
    const formData = { ...this.workflowForm.value, isActive: false };
    this.submitWorkflow(formData, 'Draft saved successfully');
  }

  onSubmit(): void {
    if (this.workflowForm.valid) {
      this.submitWorkflow(this.workflowForm.value, 'Workflow created successfully');
    }
  }

  private submitWorkflow(formData: any, successMessage: string): void {
    this.isSubmitting = true;

    // Transform form data to API format
    const workflowData = this.transformFormData(formData);

    this.workflowService.createWorkflow(workflowData).subscribe({
      next: (workflow) => {
        this.snackBar.open(successMessage, 'Close', { duration: 3000 });
        this.router.navigate(['/workflows', workflow.id]);
      },
      error: (error) => {
        console.error('Error creating workflow:', error);
        this.snackBar.open('Error creating workflow', 'Close', { duration: 5000 });
        this.isSubmitting = false;
      }
    });
  }

  private transformFormData(formData: any): any {
    // Build trigger config
    const triggerConfig: any = {};
    
    if (formData.triggerType === 'IOT_ALERT') {
      triggerConfig.iotThreshold = {
        metric: formData.iotMetric,
        operator: formData.iotOperator,
        value: formData.iotValue
      };
    } else if (formData.triggerType === 'SCHEDULE') {
      triggerConfig.schedule = {
        cron: formData.cronExpression,
        timezone: formData.timezone
      };
    }

    // Transform actions
    const actions = formData.actions.map((action: any) => {
      const config: any = {};
      
      switch (action.type) {
        case 'TRANSFER':
          config.targetLocationId = action.targetLocation;
          break;
        case 'NOTIFY':
          config.notifyUsers = action.notifyUsers;
          config.message = action.message;
          break;
        case 'ALERT':
          config.alertSeverity = action.alertSeverity;
          config.message = action.message;
          break;
        case 'APPROVE':
          config.approvers = action.approvers;
          config.requiredApprovals = action.requiredApprovals;
          config.timeout = action.timeout;
          break;
      }

      return {
        type: action.type,
        config
      };
    });

    return {
      name: formData.name,
      description: formData.description,
      workflowType: formData.workflowType,
      triggerType: formData.triggerType,
      triggerConfig,
      conditions: formData.conditions,
      actions,
      isActive: formData.isActive,
      priority: formData.priority,
      timeout: formData.timeout
    };
  }

  goBack(): void {
    this.router.navigate(['/workflows']);
  }
}