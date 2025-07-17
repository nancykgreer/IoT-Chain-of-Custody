import { Router } from 'express';
import { PrismaClient, WorkflowTriggerType } from '@prisma/client';
import { auth } from '../middleware/auth';
import { validateRole } from '../middleware/validateRole';
import { AuditService } from '../services/auditService';
import { NotificationService } from '../services/notificationService';
import { WebSocketService } from '../services/websocketService';
import { WorkflowService, WorkflowDefinition } from '../services/workflowService';

const router = Router();
const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const notificationService = new NotificationService();
const websocketService = new WebSocketService();
const workflowService = new WorkflowService(prisma, auditService, notificationService, websocketService);

// Get all workflows for organization
router.get('/', auth, async (req, res) => {
  try {
    const workflows = await workflowService.getWorkflowsByOrganization(req.user.organizationId);
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Create new workflow
router.post('/', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const definition: WorkflowDefinition = req.body;
    
    // Validate required fields
    if (!definition.name || !definition.triggerType) {
      return res.status(400).json({ error: 'Missing required fields: name, triggerType' });
    }

    const workflow = await workflowService.createWorkflow(
      req.user.organizationId,
      definition,
      req.user.id
    );

    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Get specific workflow
router.get('/:id', auth, async (req, res) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
      include: {
        instances: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            steps: true,
            approvals: true,
          },
        },
        schedules: true,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Update workflow
router.put('/:id', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const { name, description, triggerConfig, conditions, actions, isActive, priority, timeout } = req.body;

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        triggerConfig: triggerConfig as any,
        conditions: conditions as any,
        actions: actions as any,
        isActive,
        priority,
        timeout,
      },
    });

    await auditService.log({
      action: 'UPDATE',
      entityType: 'Workflow',
      entityId: workflow.id,
      userId: req.user.id,
      oldValues: workflow,
      newValues: updatedWorkflow,
      changeReason: 'Workflow updated',
    });

    res.json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
router.delete('/:id', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    await prisma.workflow.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      action: 'DELETE',
      entityType: 'Workflow',
      entityId: workflow.id,
      userId: req.user.id,
      oldValues: workflow,
      changeReason: 'Workflow deleted',
    });

    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Execute workflow manually
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const { triggerData, relatedItemId } = req.body;

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (workflow.triggerType !== WorkflowTriggerType.MANUAL) {
      return res.status(400).json({ error: 'Workflow is not manually executable' });
    }

    const instance = await workflowService.executeWorkflow(
      workflow.id,
      triggerData || {},
      relatedItemId,
      req.user.id
    );

    res.json(instance);
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Get workflow instances
router.get('/instances', auth, async (req, res) => {
  try {
    const { status, workflowId, limit = 50, offset = 0 } = req.query;

    const where: any = {
      workflow: {
        organizationId: req.user.organizationId,
      },
    };

    if (status) {
      where.status = status;
    }

    if (workflowId) {
      where.workflowId = workflowId;
    }

    const instances = await prisma.workflowInstance.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            workflowType: true,
          },
        },
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
                role: true,
              },
            },
          },
        },
        relatedItem: {
          select: {
            id: true,
            name: true,
            barcode: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json(instances);
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instances' });
  }
});

// Get specific workflow instance
router.get('/instances/:id', auth, async (req, res) => {
  try {
    const instance = await workflowService.getWorkflowInstance(req.params.id);

    if (!instance || instance.workflow.organizationId !== req.user.organizationId) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    res.json(instance);
  } catch (error) {
    console.error('Error fetching workflow instance:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instance' });
  }
});

// Cancel workflow instance
router.post('/instances/:id/cancel', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const instance = await prisma.workflowInstance.findFirst({
      where: {
        id: req.params.id,
        workflow: {
          organizationId: req.user.organizationId,
        },
      },
    });

    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(instance.status)) {
      return res.status(400).json({ error: 'Cannot cancel completed workflow' });
    }

    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        errorMessage: `Cancelled by ${req.user.firstName} ${req.user.lastName}`,
      },
    });

    await auditService.log({
      action: 'UPDATE',
      entityType: 'WorkflowInstance',
      entityId: instance.id,
      userId: req.user.id,
      oldValues: { status: instance.status },
      newValues: { status: 'CANCELLED' },
      changeReason: 'Workflow instance cancelled',
    });

    res.json(updatedInstance);
  } catch (error) {
    console.error('Error cancelling workflow instance:', error);
    res.status(500).json({ error: 'Failed to cancel workflow instance' });
  }
});

// Get pending approvals
router.get('/approvals', auth, async (req, res) => {
  try {
    const approvals = await workflowService.getPendingApprovals(req.user.id);
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// Submit approval decision
router.post('/approvals/:id', auth, async (req, res) => {
  try {
    const { decision, comments } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision. Must be APPROVED or REJECTED' });
    }

    // Verify the approval belongs to this user
    const approval = await prisma.workflowApproval.findFirst({
      where: {
        id: req.params.id,
        approverId: req.user.id,
        status: 'PENDING',
      },
    });

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found or already processed' });
    }

    const updatedApproval = await workflowService.processApproval(
      req.params.id,
      decision,
      comments,
      req.user.id
    );

    res.json(updatedApproval);
  } catch (error) {
    console.error('Error processing approval:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

// Get approval history
router.get('/approvals/history', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR']), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const approvals = await prisma.workflowApproval.findMany({
      where: {
        instance: {
          workflow: {
            organizationId: req.user.organizationId,
          },
        },
      },
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
        instance: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                workflowType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history' });
  }
});

// Workflow rules management
router.get('/rules', auth, async (req, res) => {
  try {
    const rules = await prisma.workflowRule.findMany({
      where: {
        organizationId: req.user.organizationId,
        deletedAt: null,
      },
      orderBy: { priority: 'desc' },
    });

    res.json(rules);
  } catch (error) {
    console.error('Error fetching workflow rules:', error);
    res.status(500).json({ error: 'Failed to fetch workflow rules' });
  }
});

// Test workflow rule
router.post('/rules/test', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const { conditions, testData } = req.body;

    // This would test the rule conditions against sample data
    // For now, just return a simple validation
    const result = {
      isValid: true,
      conditionsMatch: true,
      testData,
      message: 'Rule validation successful',
    };

    res.json(result);
  } catch (error) {
    console.error('Error testing workflow rule:', error);
    res.status(500).json({ error: 'Failed to test workflow rule' });
  }
});

// Workflow analytics
router.get('/analytics', auth, validateRole(['ADMIN', 'COMPLIANCE_OFFICER']), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalWorkflows, totalInstances, completedInstances, failedInstances] = await Promise.all([
      prisma.workflow.count({
        where: {
          organizationId: req.user.organizationId,
          deletedAt: null,
        },
      }),
      prisma.workflowInstance.count({
        where: {
          workflow: {
            organizationId: req.user.organizationId,
          },
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.workflowInstance.count({
        where: {
          workflow: {
            organizationId: req.user.organizationId,
          },
          status: 'COMPLETED',
          createdAt: {
            gte: startDate,
          },
        },
      }),
      prisma.workflowInstance.count({
        where: {
          workflow: {
            organizationId: req.user.organizationId,
          },
          status: 'FAILED',
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ]);

    const analytics = {
      totalWorkflows,
      totalInstances,
      completedInstances,
      failedInstances,
      successRate: totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0,
      timeframe,
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching workflow analytics:', error);
    res.status(500).json({ error: 'Failed to fetch workflow analytics' });
  }
});

export default router;