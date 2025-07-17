import { PrismaClient, WorkflowTriggerType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedWorkflows() {
  console.log('🌱 Seeding workflow definitions...');

  // Get the first organization for testing
  const organization = await prisma.organization.findFirst();
  if (!organization) {
    console.log('❌ No organization found. Please create an organization first.');
    return;
  }

  // 1. Cold Chain Compliance Workflow
  const coldChainWorkflow = await prisma.workflow.create({
    data: {
      name: 'Cold Chain Compliance',
      description: 'Automatically quarantine items when temperature exceeds safe limits',
      workflowType: 'TEMPERATURE_TRIGGERED',
      triggerType: WorkflowTriggerType.IOT_ALERT,
      triggerConfig: {
        iotThreshold: {
          metric: 'TEMP_HIGH',
          operator: 'GREATER_THAN',
          value: 8
        }
      },
      conditions: [
        {
          field: 'item.type',
          operator: 'EQUALS',
          value: 'LAB_SPECIMEN'
        }
      ],
      actions: [
        {
          type: 'QUARANTINE',
          config: {
            message: 'Temperature excursion detected - specimen quarantined automatically'
          }
        },
        {
          type: 'NOTIFY',
          config: {
            notifyUsers: ['LAB_TECHNICIAN', 'COMPLIANCE_OFFICER'],
            message: 'Critical: Temperature threshold violated for lab specimen'
          }
        },
        {
          type: 'ALERT',
          config: {
            alertSeverity: 'CRITICAL',
            message: 'Cold chain breach detected - immediate action required'
          }
        }
      ],
      isActive: true,
      priority: 10,
      organizationId: organization.id,
    },
  });

  // 2. High Value Transfer Approval Workflow
  const highValueWorkflow = await prisma.workflow.create({
    data: {
      name: 'High Value Transfer Approval',
      description: 'Require approval for high-value item transfers',
      workflowType: 'APPROVAL_REQUIRED',
      triggerType: WorkflowTriggerType.MANUAL,
      triggerConfig: {
        eventType: 'CUSTODY_TRANSFER'
      },
      conditions: [
        {
          field: 'item.metadata.value',
          operator: 'GREATER_THAN',
          value: 10000
        }
      ],
      actions: [
        {
          type: 'APPROVE',
          config: {
            approvers: ['ADMIN', 'COMPLIANCE_OFFICER'],
            requiredApprovals: 2,
            timeout: 3600, // 1 hour
            message: 'High-value item transfer requires dual approval'
          }
        },
        {
          type: 'NOTIFY',
          config: {
            notifyUsers: ['ADMIN', 'COMPLIANCE_OFFICER'],
            message: 'High-value transfer pending approval'
          }
        }
      ],
      isActive: true,
      priority: 8,
      organizationId: organization.id,
    },
  });

  // 3. Battery Low Warning Workflow
  const batteryLowWorkflow = await prisma.workflow.create({
    data: {
      name: 'Battery Low Warning',
      description: 'Alert when IoT device battery is running low',
      workflowType: 'MAINTENANCE_ALERT',
      triggerType: WorkflowTriggerType.IOT_ALERT,
      triggerConfig: {
        iotThreshold: {
          metric: 'BATTERY_LOW',
          operator: 'LESS_THAN',
          value: 20
        }
      },
      conditions: [],
      actions: [
        {
          type: 'NOTIFY',
          config: {
            notifyUsers: ['LAB_TECHNICIAN', 'ADMIN'],
            message: 'IoT device battery low - maintenance required'
          }
        },
        {
          type: 'ALERT',
          config: {
            alertSeverity: 'MEDIUM',
            message: 'Device maintenance required - battery replacement needed'
          }
        }
      ],
      isActive: true,
      priority: 5,
      organizationId: organization.id,
    },
  });

  // 4. Emergency Recall Workflow  
  const emergencyRecallWorkflow = await prisma.workflow.create({
    data: {
      name: 'Emergency Item Recall',
      description: 'Lock and track items during emergency recall',
      workflowType: 'EMERGENCY_RECALL',
      triggerType: WorkflowTriggerType.MANUAL,
      triggerConfig: {
        eventType: 'EMERGENCY_RECALL'
      },
      conditions: [
        {
          field: 'item.status',
          operator: 'IN',
          value: ['COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'STORED']
        }
      ],
      actions: [
        {
          type: 'UPDATE',
          config: {
            updateFields: {
              status: 'QUARANTINED'
            }
          }
        },
        {
          type: 'NOTIFY',
          config: {
            notifyUsers: ['ADMIN', 'COMPLIANCE_OFFICER', 'LAB_TECHNICIAN'],
            message: 'URGENT: Emergency recall initiated - all affected items quarantined'
          }
        },
        {
          type: 'ALERT',
          config: {
            alertSeverity: 'CRITICAL',
            message: 'Emergency recall in progress - follow containment protocols'
          }
        }
      ],
      isActive: true,
      priority: 15,
      organizationId: organization.id,
    },
  });

  // 5. Scheduled Daily Lab Transfer
  const scheduledTransferWorkflow = await prisma.workflow.create({
    data: {
      name: 'Daily Lab Transfer',
      description: 'Automated daily transfer of ready specimens to main lab',
      workflowType: 'SCHEDULED_TRANSFER',
      triggerType: WorkflowTriggerType.SCHEDULE,
      triggerConfig: {
        schedule: {
          cron: '0 14 * * *', // 2 PM daily
          timezone: 'America/New_York'
        }
      },
      conditions: [
        {
          field: 'item.status',
          operator: 'EQUALS',
          value: 'READY_FOR_TESTING'
        },
        {
          field: 'item.currentLocation.name',
          operator: 'CONTAINS',
          value: 'COLLECTION'
        }
      ],
      actions: [
        {
          type: 'NOTIFY',
          config: {
            notifyUsers: ['LAB_TECHNICIAN', 'TRANSPORT_STAFF'],
            message: 'Daily lab transfer scheduled - preparing specimen batch'
          }
        },
        {
          type: 'UPDATE',
          config: {
            updateFields: {
              status: 'IN_TRANSIT'
            }
          }
        }
      ],
      isActive: false, // Disabled by default for testing
      priority: 3,
      organizationId: organization.id,
    },
  });

  // Create a schedule for the daily transfer workflow
  await prisma.workflowSchedule.create({
    data: {
      workflowId: scheduledTransferWorkflow.id,
      cronExpression: '0 14 * * *',
      timezone: 'America/New_York',
      isActive: false,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    },
  });

  console.log('✅ Created workflow definitions:');
  console.log(`   📋 ${coldChainWorkflow.name} (Priority: ${coldChainWorkflow.priority})`);
  console.log(`   📋 ${highValueWorkflow.name} (Priority: ${highValueWorkflow.priority})`);
  console.log(`   📋 ${batteryLowWorkflow.name} (Priority: ${batteryLowWorkflow.priority})`);
  console.log(`   📋 ${emergencyRecallWorkflow.name} (Priority: ${emergencyRecallWorkflow.priority})`);
  console.log(`   📋 ${scheduledTransferWorkflow.name} (Priority: ${scheduledTransferWorkflow.priority}) [DISABLED]`);
  
  console.log('\n🔧 Workflow engine ready! Trigger conditions:');
  console.log('   🌡️  Temperature > 8°C → Cold Chain Compliance');
  console.log('   💰 Item value > $10K → High Value Approval');
  console.log('   🔋 Battery < 20% → Battery Low Warning');
  console.log('   🚨 Manual recall → Emergency Recall');
  console.log('   ⏰ Daily 2PM → Scheduled Transfer (disabled)');
}

if (require.main === module) {
  seedWorkflows()
    .catch((e) => {
      console.error('❌ Error seeding workflows:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}