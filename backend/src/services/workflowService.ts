import { PrismaClient, WorkflowTriggerType, WorkflowStatus, WorkflowStepStatus } from '@prisma/client';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { WebSocketService } from './websocketService';

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

export interface WorkflowDefinition {
  name: string;
  description?: string;
  workflowType: string;
  triggerType: WorkflowTriggerType;
  triggerConfig: WorkflowTriggerConfig;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isActive?: boolean;
  priority?: number;
  timeout?: number;
}

export class WorkflowService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService,
    private notificationService: NotificationService,
    private websocketService: WebSocketService
  ) {}

  async createWorkflow(
    organizationId: string,
    definition: WorkflowDefinition,
    userId: string
  ) {
    const workflow = await this.prisma.workflow.create({
      data: {
        name: definition.name,
        description: definition.description,
        workflowType: definition.workflowType,
        triggerType: definition.triggerType,
        triggerConfig: definition.triggerConfig as any,
        conditions: definition.conditions as any,
        actions: definition.actions as any,
        isActive: definition.isActive ?? true,
        priority: definition.priority ?? 0,
        timeout: definition.timeout,
        organizationId,
      },
    });

    await this.auditService.log({
      action: 'CREATE',
      entityType: 'Workflow',
      entityId: workflow.id,
      userId,
      newValues: workflow,
      changeReason: 'Workflow created',
    });

    return workflow;
  }

  async executeWorkflow(
    workflowId: string,
    triggerData: any,
    relatedItemId?: string,
    userId?: string
  ) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        organization: true,
      },
    });

    if (!workflow || !workflow.isActive) {
      throw new Error('Workflow not found or inactive');
    }

    // Create workflow instance
    const instance = await this.prisma.workflowInstance.create({
      data: {
        workflowId,
        status: WorkflowStatus.PENDING,
        triggerData: triggerData as any,
        context: {
          executedBy: userId,
          executedAt: new Date().toISOString(),
        } as any,
        relatedItemId,
      },
    });

    // Evaluate conditions
    const conditionsMatch = await this.evaluateConditions(
      workflow.conditions as WorkflowCondition[],
      triggerData,
      relatedItemId
    );

    if (!conditionsMatch) {
      await this.updateInstanceStatus(instance.id, WorkflowStatus.COMPLETED, 'Conditions not met');
      return instance;
    }

    // Update status to in progress
    await this.updateInstanceStatus(instance.id, WorkflowStatus.IN_PROGRESS);

    try {
      // Execute workflow steps
      await this.executeWorkflowSteps(instance.id, workflow.actions as WorkflowAction[], userId);

      // Emit real-time update
      this.websocketService.emitToOrganization(workflow.organizationId, 'workflow:started', {
        instanceId: instance.id,
        workflowName: workflow.name,
        status: WorkflowStatus.IN_PROGRESS,
      });

      return instance;
    } catch (error) {
      await this.updateInstanceStatus(
        instance.id,
        WorkflowStatus.FAILED,
        `Execution error: ${error.message}`
      );
      throw error;
    }
  }

  private async evaluateConditions(
    conditions: WorkflowCondition[],
    triggerData: any,
    relatedItemId?: string
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) return true;

    // Get item data if needed
    let itemData = null;
    if (relatedItemId) {
      itemData = await this.prisma.item.findUnique({
        where: { id: relatedItemId },
        include: {
          currentLocation: true,
          organization: true,
        },
      });
    }

    const context = {
      ...triggerData,
      item: itemData,
    };

    let result = true;
    let operator = 'AND';

    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(context, condition.field);
      const conditionResult = this.evaluateCondition(fieldValue, condition.operator, condition.value);

      if (operator === 'AND') {
        result = result && conditionResult;
      } else if (operator === 'OR') {
        result = result || conditionResult;
      }

      operator = condition.combineWith || 'AND';
    }

    return result;
  }

  private evaluateCondition(fieldValue: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return fieldValue === expectedValue;
      case 'NOT_EQUALS':
        return fieldValue !== expectedValue;
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(expectedValue);
      case 'LESS_THAN':
        return Number(fieldValue) < Number(expectedValue);
      case 'IN':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'CONTAINS':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeWorkflowSteps(
    instanceId: string,
    actions: WorkflowAction[],
    userId?: string
  ) {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Create workflow step
      const step = await this.prisma.workflowStep.create({
        data: {
          instanceId,
          stepType: action.type,
          stepOrder: i + 1,
          status: WorkflowStepStatus.PENDING,
          inputData: action.config as any,
          executedById: userId,
        },
      });

      try {
        await this.updateStepStatus(step.id, WorkflowStepStatus.IN_PROGRESS);
        
        // Execute the action
        const result = await this.executeAction(action, instanceId, userId);
        
        await this.updateStepStatus(step.id, WorkflowStepStatus.COMPLETED, result);
      } catch (error) {
        await this.updateStepStatus(step.id, WorkflowStepStatus.FAILED, null, error.message);
        throw error;
      }
    }

    // Mark instance as completed
    await this.updateInstanceStatus(instanceId, WorkflowStatus.COMPLETED);
  }

  private async executeAction(action: WorkflowAction, instanceId: string, userId?: string): Promise<any> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        relatedItem: {
          include: {
            currentLocation: true,
            organization: true,
          },
        },
        workflow: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!instance) {
      throw new Error('Workflow instance not found');
    }

    switch (action.type) {
      case 'TRANSFER':
        return await this.executeTransferAction(action, instance, userId);

      case 'QUARANTINE':
        return await this.executeQuarantineAction(action, instance, userId);

      case 'NOTIFY':
        return await this.executeNotifyAction(action, instance);

      case 'ALERT':
        return await this.executeAlertAction(action, instance);

      case 'UPDATE':
        return await this.executeUpdateAction(action, instance, userId);

      case 'APPROVE':
        return await this.executeApprovalAction(action, instance, userId);

      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async executeTransferAction(action: WorkflowAction, instance: any, userId?: string) {
    if (!instance.relatedItem || !action.config.targetLocationId) {
      throw new Error('Transfer action requires item and target location');
    }

    // Create custody event
    const custodyEvent = await this.prisma.custodyEvent.create({
      data: {
        type: 'TRANSFER',
        description: `Workflow automated transfer: ${instance.workflow.name}`,
        fromLocationId: instance.relatedItem.currentLocationId,
        toLocationId: action.config.targetLocationId,
        itemId: instance.relatedItem.id,
        handledById: userId || 'SYSTEM',
        notes: `Automated by workflow: ${instance.workflow.name}`,
      },
    });

    // Update item location
    await this.prisma.item.update({
      where: { id: instance.relatedItem.id },
      data: {
        currentLocationId: action.config.targetLocationId,
        status: 'IN_TRANSIT',
      },
    });

    return { custodyEventId: custodyEvent.id };
  }

  private async executeQuarantineAction(action: WorkflowAction, instance: any, userId?: string) {
    if (!instance.relatedItem) {
      throw new Error('Quarantine action requires an item');
    }

    // Find quarantine location
    const quarantineLocation = await this.prisma.location.findFirst({
      where: {
        organizationId: instance.workflow.organizationId,
        name: { contains: 'QUARANTINE', mode: 'insensitive' },
      },
    });

    if (!quarantineLocation) {
      throw new Error('Quarantine location not found');
    }

    // Update item status and location
    await this.prisma.item.update({
      where: { id: instance.relatedItem.id },
      data: {
        status: 'QUARANTINED',
        currentLocationId: quarantineLocation.id,
      },
    });

    // Create custody event
    const custodyEvent = await this.prisma.custodyEvent.create({
      data: {
        type: 'TRANSFER',
        description: `Automated quarantine: ${action.config.message || 'Threshold violation detected'}`,
        fromLocationId: instance.relatedItem.currentLocationId,
        toLocationId: quarantineLocation.id,
        itemId: instance.relatedItem.id,
        handledById: userId || 'SYSTEM',
        notes: `Quarantined by workflow: ${instance.workflow.name}`,
      },
    });

    return { custodyEventId: custodyEvent.id, quarantineLocationId: quarantineLocation.id };
  }

  private async executeNotifyAction(action: WorkflowAction, instance: any) {
    const notifyUsers = action.config.notifyUsers || [];
    const message = action.config.message || `Workflow notification: ${instance.workflow.name}`;

    for (const userRole of notifyUsers) {
      // Find users with the specified role
      const users = await this.prisma.user.findMany({
        where: {
          organizationId: instance.workflow.organizationId,
          role: userRole as any,
          isActive: true,
        },
      });

      // Send notifications
      for (const user of users) {
        await this.notificationService.sendNotification({
          userId: user.id,
          type: 'WORKFLOW',
          title: `Workflow: ${instance.workflow.name}`,
          message,
          data: {
            workflowInstanceId: instance.id,
            workflowId: instance.workflowId,
            itemId: instance.relatedItemId,
          },
        });
      }
    }

    return { notifiedUsers: notifyUsers.length };
  }

  private async executeAlertAction(action: WorkflowAction, instance: any) {
    // Create IoT alert if device is involved
    if (instance.triggerData?.deviceId) {
      await this.prisma.ioTAlert.create({
        data: {
          deviceId: instance.triggerData.deviceId,
          alertType: 'WORKFLOW_TRIGGERED',
          severity: action.config.alertSeverity || 'MEDIUM',
          message: action.config.message || `Workflow alert: ${instance.workflow.name}`,
          threshold: instance.triggerData.threshold,
          currentValue: instance.triggerData.currentValue,
        },
      });
    }

    // Emit real-time alert
    this.websocketService.emitToOrganization(instance.workflow.organizationId, 'alert:workflow', {
      workflowName: instance.workflow.name,
      message: action.config.message,
      severity: action.config.alertSeverity || 'MEDIUM',
      instanceId: instance.id,
    });

    return { alertCreated: true };
  }

  private async executeUpdateAction(action: WorkflowAction, instance: any, userId?: string) {
    if (!instance.relatedItem || !action.config.updateFields) {
      throw new Error('Update action requires item and update fields');
    }

    const oldValues = { ...instance.relatedItem };
    
    await this.prisma.item.update({
      where: { id: instance.relatedItem.id },
      data: action.config.updateFields,
    });

    // Log the update
    await this.auditService.log({
      action: 'UPDATE',
      entityType: 'Item',
      entityId: instance.relatedItem.id,
      userId: userId || 'SYSTEM',
      oldValues,
      newValues: action.config.updateFields,
      changeReason: `Updated by workflow: ${instance.workflow.name}`,
    });

    return { updatedFields: Object.keys(action.config.updateFields) };
  }

  private async executeApprovalAction(action: WorkflowAction, instance: any, userId?: string) {
    const approvers = action.config.approvers || [];
    const requiredApprovals = action.config.requiredApprovals || approvers.length;
    const deadline = action.config.timeout 
      ? new Date(Date.now() + action.config.timeout * 60000)
      : null;

    // Update instance status to awaiting approval
    await this.updateInstanceStatus(instance.id, WorkflowStatus.AWAITING_APPROVAL);

    // Create approval requests
    for (const approverRole of approvers) {
      const users = await this.prisma.user.findMany({
        where: {
          organizationId: instance.workflow.organizationId,
          role: approverRole as any,
          isActive: true,
        },
      });

      for (const user of users) {
        await this.prisma.workflowApproval.create({
          data: {
            instanceId: instance.id,
            approverId: user.id,
            status: 'PENDING',
            isRequired: true,
            deadline,
          },
        });

        // Send approval notification
        await this.notificationService.sendNotification({
          userId: user.id,
          type: 'APPROVAL_REQUEST',
          title: 'Workflow Approval Required',
          message: `Please review and approve workflow: ${instance.workflow.name}`,
          data: {
            workflowInstanceId: instance.id,
            approvalDeadline: deadline?.toISOString(),
          },
        });
      }
    }

    return { approvalRequests: approvers.length };
  }

  async processApproval(approvalId: string, decision: 'APPROVED' | 'REJECTED', comments?: string, userId?: string) {
    const approval = await this.prisma.workflowApproval.update({
      where: { id: approvalId },
      data: {
        status: decision,
        comments,
        approvedAt: decision === 'APPROVED' ? new Date() : null,
        rejectionReason: decision === 'REJECTED' ? comments : null,
      },
      include: {
        instance: {
          include: {
            workflow: true,
            approvals: true,
          },
        },
      },
    });

    // Check if all required approvals are received
    const requiredApprovals = approval.instance.approvals.filter(a => a.isRequired);
    const approvedCount = requiredApprovals.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = requiredApprovals.filter(a => a.status === 'REJECTED').length;

    if (rejectedCount > 0) {
      // Any rejection fails the workflow
      await this.updateInstanceStatus(approval.instanceId, WorkflowStatus.REJECTED, 'Approval rejected');
    } else if (approvedCount === requiredApprovals.length) {
      // All approvals received, continue workflow
      await this.updateInstanceStatus(approval.instanceId, WorkflowStatus.APPROVED);
      await this.updateInstanceStatus(approval.instanceId, WorkflowStatus.EXECUTING);
      
      // Continue with remaining actions if any
      await this.updateInstanceStatus(approval.instanceId, WorkflowStatus.COMPLETED);
    }

    return approval;
  }

  private async updateInstanceStatus(instanceId: string, status: WorkflowStatus, errorMessage?: string) {
    return await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status,
        errorMessage,
        completedAt: status === WorkflowStatus.COMPLETED || status === WorkflowStatus.FAILED 
          ? new Date() 
          : undefined,
      },
    });
  }

  private async updateStepStatus(
    stepId: string,
    status: WorkflowStepStatus,
    outputData?: any,
    errorMessage?: string
  ) {
    return await this.prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status,
        outputData: outputData as any,
        errorMessage,
        startedAt: status === WorkflowStepStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt: status === WorkflowStepStatus.COMPLETED || status === WorkflowStepStatus.FAILED 
          ? new Date() 
          : undefined,
      },
    });
  }

  // Rule-based workflow triggers
  async evaluateIoTAlert(deviceId: string, alertType: string, currentValue: number, threshold: number) {
    // Find workflows triggered by IoT alerts
    const workflows = await this.prisma.workflow.findMany({
      where: {
        triggerType: WorkflowTriggerType.IOT_ALERT,
        isActive: true,
      },
    });

    for (const workflow of workflows) {
      const config = workflow.triggerConfig as any;
      
      // Check if this alert matches the trigger configuration
      if (config.iotThreshold?.metric === alertType && 
          this.evaluateCondition(currentValue, config.iotThreshold.operator, config.iotThreshold.value)) {
        
        await this.executeWorkflow(workflow.id, {
          deviceId,
          alertType,
          currentValue,
          threshold,
          triggeredAt: new Date().toISOString(),
        });
      }
    }
  }

  async getWorkflowsByOrganization(organizationId: string) {
    return await this.prisma.workflow.findMany({
      where: { 
        organizationId,
        deletedAt: null,
      },
      include: {
        instances: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            steps: true,
            approvals: true,
          },
        },
        schedules: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWorkflowInstance(instanceId: string) {
    return await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
        relatedItem: {
          include: {
            currentLocation: true,
          },
        },
      },
    });
  }

  async getPendingApprovals(userId: string) {
    return await this.prisma.workflowApproval.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
      },
      include: {
        instance: {
          include: {
            workflow: true,
            relatedItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}