import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkflowCondition {
  field: string;
  operator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'CONTAINS' | 'NOT_EQUALS';
  value: any;
  combineWith?: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: 'TRANSFER' | 'ALERT' | 'NOTIFY' | 'APPROVE' | 'QUARANTINE' | 'UPDATE' | 'EMAIL' | 'SMS';
  config: {
    targetLocationId?: string;
    notifyUsers?: string[];
    updateFields?: Record<string, any>;
    approvers?: string[];
    requiredApprovals?: number;
    timeout?: number;
    message?: string;
    alertSeverity?: string;
  };
}

export interface WorkflowTriggerConfig {
  iotThreshold?: {
    metric: string;
    operator: string;
    value: number;
  };
  schedule?: {
    cron: string;
    timezone: string;
  };
  eventType?: string;
  itemTypes?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  workflowType: string;
  triggerType: 'MANUAL' | 'IOT_ALERT' | 'SCHEDULE' | 'API' | 'THRESHOLD';
  triggerConfig: WorkflowTriggerConfig;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
  timeout?: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  instances?: WorkflowInstance[];
  schedules?: WorkflowSchedule[];
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflow?: Workflow;
  status: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'CANCELLED';
  triggerData?: any;
  context?: any;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
  relatedItemId?: string;
  relatedItem?: any;
  steps: WorkflowStep[];
  approvals: WorkflowApproval[];
}

export interface WorkflowStep {
  id: string;
  instanceId: string;
  stepType: string;
  stepOrder: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  executedById?: string;
  executedBy?: any;
}

export interface WorkflowApproval {
  id: string;
  instanceId: string;
  stepId?: string;
  approverId: string;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
  approvedAt?: string;
  rejectionReason?: string;
  isRequired: boolean;
  deadline?: string;
  createdAt: string;
  instance?: {
    workflow: {
      id: string;
      name: string;
      workflowType: string;
    };
  };
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

export interface WorkflowAnalytics {
  totalWorkflows: number;
  totalInstances: number;
  completedInstances: number;
  failedInstances: number;
  successRate: number;
  timeframe: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = `${environment.apiUrl}/workflows`;
  private workflowsSubject = new BehaviorSubject<Workflow[]>([]);
  private pendingApprovalsSubject = new BehaviorSubject<WorkflowApproval[]>([]);

  public workflows$ = this.workflowsSubject.asObservable();
  public pendingApprovals$ = this.pendingApprovalsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Workflow Management
  getWorkflows(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(this.apiUrl);
  }

  getWorkflow(id: string): Observable<Workflow> {
    return this.http.get<Workflow>(`${this.apiUrl}/${id}`);
  }

  createWorkflow(workflow: Partial<Workflow>): Observable<Workflow> {
    return this.http.post<Workflow>(this.apiUrl, workflow);
  }

  updateWorkflow(id: string, workflow: Partial<Workflow>): Observable<Workflow> {
    return this.http.put<Workflow>(`${this.apiUrl}/${id}`, workflow);
  }

  deleteWorkflow(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  executeWorkflow(id: string, triggerData?: any, relatedItemId?: string): Observable<WorkflowInstance> {
    return this.http.post<WorkflowInstance>(`${this.apiUrl}/${id}/execute`, {
      triggerData,
      relatedItemId
    });
  }

  // Workflow Instances
  getWorkflowInstances(params?: {
    status?: string;
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Observable<WorkflowInstance[]> {
    return this.http.get<WorkflowInstance[]>(`${this.apiUrl}/instances`, { params });
  }

  getWorkflowInstance(id: string): Observable<WorkflowInstance> {
    return this.http.get<WorkflowInstance>(`${this.apiUrl}/instances/${id}`);
  }

  cancelWorkflowInstance(id: string): Observable<WorkflowInstance> {
    return this.http.post<WorkflowInstance>(`${this.apiUrl}/instances/${id}/cancel`, {});
  }

  // Approvals
  getPendingApprovals(): Observable<WorkflowApproval[]> {
    return this.http.get<WorkflowApproval[]>(`${this.apiUrl}/approvals`);
  }

  submitApproval(id: string, decision: 'APPROVED' | 'REJECTED', comments?: string): Observable<WorkflowApproval> {
    return this.http.post<WorkflowApproval>(`${this.apiUrl}/approvals/${id}`, {
      decision,
      comments
    });
  }

  getApprovalHistory(params?: { limit?: number; offset?: number }): Observable<WorkflowApproval[]> {
    return this.http.get<WorkflowApproval[]>(`${this.apiUrl}/approvals/history`, { params });
  }

  // Analytics
  getWorkflowAnalytics(timeframe: string = '30d'): Observable<WorkflowAnalytics> {
    return this.http.get<WorkflowAnalytics>(`${this.apiUrl}/analytics`, {
      params: { timeframe }
    });
  }

  // Utility methods
  refreshWorkflows(): void {
    this.getWorkflows().subscribe(workflows => {
      this.workflowsSubject.next(workflows);
    });
  }

  refreshPendingApprovals(): void {
    this.getPendingApprovals().subscribe(approvals => {
      this.pendingApprovalsSubject.next(approvals);
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'warn';
      case 'AWAITING_APPROVAL': return 'accent';
      case 'IN_PROGRESS': 
      case 'EXECUTING': return 'primary';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'check_circle';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'cancel';
      case 'AWAITING_APPROVAL': return 'pending';
      case 'IN_PROGRESS': 
      case 'EXECUTING': return 'play_circle';
      case 'PENDING': return 'schedule';
      default: return 'help';
    }
  }

  formatTriggerType(triggerType: string): string {
    return triggerType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatWorkflowType(workflowType: string): string {
    return workflowType.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}