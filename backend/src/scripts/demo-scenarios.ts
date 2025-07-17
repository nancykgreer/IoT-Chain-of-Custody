#!/usr/bin/env ts-node

/**
 * Healthcare Chain of Custody - Demo Scenario Scripts
 * 
 * Pre-configured demonstration scenarios that match the DEMONSTRATION_GUIDE.md
 * scenarios for consistent and impressive demos.
 */

import { PrismaClient, ItemType, ItemStatus, AlertSeverity, WorkflowStatus } from '@prisma/client';
import DemoSimulator from './demo-simulator';

const prisma = new PrismaClient();

class DemoScenarios {
  private simulator: DemoSimulator;

  constructor() {
    this.simulator = new DemoSimulator(3003);
  }

  /**
   * Scenario 1: Laboratory Specimen Journey (15 minutes)
   * "From Patient to Lab Results"
   */
  async runSpecimenJourney(): Promise<void> {
    console.log('🧪 Starting Laboratory Specimen Journey Demo...');
    
    try {
      // Step 1: Create specimen with nurse
      const specimen = await this.createSpecimen();
      console.log(`✅ Step 1: Specimen created - ${specimen.identifier}`);
      
      // Step 2: Attach IoT sensor and start monitoring
      const iotDevice = await this.attachIoTSensor(specimen.id);
      console.log(`📱 Step 2: IoT sensor attached - ${iotDevice.deviceId}`);
      
      // Step 3: Simulate transport with temperature spike
      await this.simulateTransport(specimen, iotDevice);
      console.log('🚛 Step 3: Transport simulation started');
      
      // Step 4: Temperature violation and workflow trigger
      setTimeout(async () => {
        await this.triggerTemperatureViolation(iotDevice.deviceId);
        console.log('🚨 Step 4: Temperature violation triggered!');
      }, 30000); // 30 seconds
      
      // Step 5: Compliance resolution
      setTimeout(async () => {
        await this.resolveComplianceIssue(specimen.id);
        console.log('✅ Step 5: Compliance issue resolved');
      }, 90000); // 1.5 minutes
      
      // Step 6: Lab processing
      setTimeout(async () => {
        await this.processInLab(specimen);
        console.log('🔬 Step 6: Lab processing completed');
      }, 180000); // 3 minutes
      
      // Step 7: Award tokens
      setTimeout(async () => {
        await this.awardCompletionTokens(50, 'Perfect custody chain');
        console.log('🪙 Step 7: 50 CHAIN tokens awarded!');
      }, 240000); // 4 minutes

    } catch (error) {
      console.error('❌ Failed to run specimen journey:', error);
    }
  }

  /**
   * Scenario 2: Emergency Pharmaceutical Recall (10 minutes)
   * "Rapid Response to Contamination Alert"
   */
  async runEmergencyRecall(): Promise<void> {
    console.log('🚨 Starting Emergency Pharmaceutical Recall Demo...');
    
    try {
      // Step 1: Trigger recall alert
      const affectedBatch = 'PHARMA-BATCH-2024-001';
      await this.triggerRecallAlert(affectedBatch);
      console.log(`🚨 Step 1: Emergency recall triggered for batch ${affectedBatch}`);
      
      // Step 2: Automated response
      setTimeout(async () => {
        await this.executeAutomatedRecall();
        console.log('🤖 Step 2: Automated recall response executed');
      }, 10000); // 10 seconds
      
      // Step 3: Track progress
      setTimeout(async () => {
        await this.trackRecallProgress();
        console.log('📊 Step 3: Recall progress tracking active');
      }, 60000); // 1 minute
      
      // Step 4: Analytics review
      setTimeout(async () => {
        const analytics = await this.generateRecallAnalytics();
        console.log('📈 Step 4: Recall analytics generated');
        console.log(`   - Response time: ${analytics.responseTime}`);
        console.log(`   - Items tracked: ${analytics.itemsTracked}`);
        console.log(`   - Facilities notified: ${analytics.facilitiesNotified}`);
        console.log(`   - Compliance rate: ${analytics.complianceRate}`);
      }, 120000); // 2 minutes

    } catch (error) {
      console.error('❌ Failed to run emergency recall:', error);
    }
  }

  /**
   * Scenario 3: IoT Environmental Monitoring (8 minutes)
   * "Preventing Cold Chain Breaks"
   */
  async runIoTMonitoring(): Promise<void> {
    console.log('🌡️ Starting IoT Environmental Monitoring Demo...');
    
    try {
      // Step 1: Dashboard overview
      await this.displayDashboardOverview();
      console.log('📊 Step 1: Dashboard overview displayed');
      
      // Step 2: Live sensor simulation
      setTimeout(async () => {
        await this.startLiveSensorSimulation();
        console.log('📡 Step 2: Live sensor simulation started');
      }, 30000); // 30 seconds
      
      // Step 3: Alert response
      setTimeout(async () => {
        await this.triggerEnvironmentalAlert();
        console.log('⚠️ Step 3: Environmental alert triggered');
      }, 90000); // 1.5 minutes
      
      // Step 4: Mobile response
      setTimeout(async () => {
        await this.simulateMobileResponse();
        console.log('📱 Step 4: Mobile response simulated');
      }, 150000); // 2.5 minutes

    } catch (error) {
      console.error('❌ Failed to run IoT monitoring:', error);
    }
  }

  /**
   * Create a specimen for demo
   */
  private async createSpecimen(): Promise<any> {
    const specimen = await prisma.item.create({
      data: {
        identifier: `SPEC${Date.now()}`,
        type: ItemType.LAB_SPECIMEN,
        status: ItemStatus.ACTIVE,
        description: 'Blood sample for glucose testing',
        metadata: {
          patientId: 'DEMO-PATIENT-001',
          collectedBy: 'Dr. Sarah Chen',
          testType: 'Glucose',
          priority: 'NORMAL'
        },
        currentLocationId: await this.getLocationId('Emergency Room'),
        createdBy: 'dr.sarah.chen@demo.com'
      }
    });

    return specimen;
  }

  /**
   * Attach IoT sensor to specimen
   */
  private async attachIoTSensor(itemId: string): Promise<any> {
    const device = await prisma.ioTDevice.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (device) {
      // Link device to item
      await prisma.item.update({
        where: { id: itemId },
        data: {
          metadata: {
            iotDeviceId: device.id,
            monitoringStart: new Date()
          }
        }
      });

      return { deviceId: device.id };
    }

    throw new Error('No available IoT devices');
  }

  /**
   * Simulate transport phase
   */
  private async simulateTransport(specimen: any, iotDevice: any): Promise<void> {
    // Create custody transfer event
    await prisma.custodyEvent.create({
      data: {
        itemId: specimen.id,
        fromLocationId: specimen.currentLocationId,
        toLocationId: await this.getLocationId('Transport Vehicle'),
        transferredBy: 'dr.sarah.chen@demo.com',
        receivedBy: 'tom.johnson@transport.com',
        eventType: 'TRANSFER',
        timestamp: new Date(),
        digitalSignature: `TRANSPORT_SIG_${Date.now()}`,
        notes: 'Specimen collected for transport to lab'
      }
    });

    // Update specimen location
    await prisma.item.update({
      where: { id: specimen.id },
      data: { currentLocationId: await this.getLocationId('Transport Vehicle') }
    });
  }

  /**
   * Trigger temperature violation
   */
  private async triggerTemperatureViolation(deviceId: string): Promise<void> {
    // Create high temperature reading
    await prisma.ioTData.create({
      data: {
        deviceId,
        temperature: 10.5, // Above 8°C threshold
        humidity: 70,
        pressure: 1013,
        batteryLevel: 85,
        timestamp: new Date()
      }
    });

    // Create alert
    await prisma.ioTAlert.create({
      data: {
        deviceId,
        alertType: 'TEMPERATURE_VIOLATION',
        severity: AlertSeverity.HIGH,
        message: 'Temperature 10.5°C exceeds safe range (2-8°C)',
        value: 10.5,
        timestamp: new Date(),
        acknowledged: false
      }
    });

    // Trigger workflow
    const workflow = await prisma.workflow.findFirst({
      where: { name: { contains: 'Cold Chain Compliance' } }
    });

    if (workflow) {
      await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          status: WorkflowStatus.RUNNING,
          context: {
            deviceId,
            alertType: 'TEMPERATURE_VIOLATION',
            temperature: 10.5
          },
          triggeredBy: 'SYSTEM',
          startedAt: new Date()
        }
      });
    }
  }

  /**
   * Resolve compliance issue
   */
  private async resolveComplianceIssue(itemId: string): Promise<void> {
    // Find the alert
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { metadata: true }
    });

    if (item?.metadata?.iotDeviceId) {
      const alert = await prisma.ioTAlert.findFirst({
        where: {
          deviceId: item.metadata.iotDeviceId as string,
          acknowledged: false
        }
      });

      if (alert) {
        // Acknowledge alert
        await prisma.ioTAlert.update({
          where: { id: alert.id },
          data: {
            acknowledged: true,
            acknowledgedBy: 'lisa.wang@demo.com',
            acknowledgedAt: new Date(),
            resolution: 'Temperature spike within acceptable variance. No action required.'
          }
        });

        // Complete workflow
        const workflowInstance = await prisma.workflowInstance.findFirst({
          where: {
            status: WorkflowStatus.RUNNING,
            context: { path: ['deviceId'], equals: item.metadata.iotDeviceId }
          }
        });

        if (workflowInstance) {
          await prisma.workflowInstance.update({
            where: { id: workflowInstance.id },
            data: {
              status: WorkflowStatus.COMPLETED,
              completedAt: new Date()
            }
          });
        }
      }
    }
  }

  /**
   * Process specimen in lab
   */
  private async processInLab(specimen: any): Promise<void> {
    // Transfer to lab
    await prisma.custodyEvent.create({
      data: {
        itemId: specimen.id,
        fromLocationId: await this.getLocationId('Transport Vehicle'),
        toLocationId: await this.getLocationId('Main Laboratory'),
        transferredBy: 'tom.johnson@transport.com',
        receivedBy: 'mike.rodriguez@medlab.com',
        eventType: 'TRANSFER',
        timestamp: new Date(),
        digitalSignature: `LAB_RECEIVE_${Date.now()}`,
        notes: 'Specimen received at laboratory for processing'
      }
    });

    // Update location
    await prisma.item.update({
      where: { id: specimen.id },
      data: {
        currentLocationId: await this.getLocationId('Main Laboratory'),
        status: ItemStatus.IN_TRANSIT
      }
    });

    // Simulate processing completion
    setTimeout(async () => {
      await prisma.item.update({
        where: { id: specimen.id },
        data: {
          status: ItemStatus.ACTIVE,
          metadata: {
            ...specimen.metadata,
            processedAt: new Date(),
            testResults: 'Glucose: 95 mg/dL (Normal)',
            processedBy: 'mike.rodriguez@medlab.com'
          }
        }
      });
    }, 30000); // 30 seconds
  }

  /**
   * Award completion tokens
   */
  private async awardCompletionTokens(amount: number, reason: string): Promise<void> {
    console.log(`🪙 Awarding ${amount} CHAIN tokens for: ${reason}`);
    
    // In a real implementation, this would update user token balances
    // For demo, we just broadcast the event
    const message = {
      type: 'token_award',
      tokens: amount,
      reason,
      timestamp: new Date()
    };

    // Would broadcast via WebSocket in real implementation
    console.log('Token award:', message);
  }

  /**
   * Trigger recall alert
   */
  private async triggerRecallAlert(batchId: string): Promise<void> {
    // Find pharmaceutical items in the batch
    const affectedItems = await prisma.item.findMany({
      where: {
        type: ItemType.PHARMACEUTICAL,
        status: ItemStatus.ACTIVE,
        identifier: { contains: 'PHARMA' }
      }
    });

    console.log(`📋 Found ${affectedItems.length} pharmaceutical items potentially affected`);

    // Create recall workflow
    const recallWorkflow = await prisma.workflow.findFirst({
      where: { name: { contains: 'Emergency Recall' } }
    });

    if (recallWorkflow) {
      await prisma.workflowInstance.create({
        data: {
          workflowId: recallWorkflow.id,
          status: WorkflowStatus.RUNNING,
          context: {
            recallType: 'PHARMACEUTICAL',
            batchId,
            reason: 'Potential contamination detected',
            affectedCount: affectedItems.length
          },
          triggeredBy: 'SYSTEM',
          startedAt: new Date()
        }
      });
    }
  }

  /**
   * Execute automated recall
   */
  private async executeAutomatedRecall(): Promise<void> {
    // Quarantine affected items
    const updated = await prisma.item.updateMany({
      where: {
        type: ItemType.PHARMACEUTICAL,
        status: ItemStatus.ACTIVE,
        identifier: { contains: 'PHARMA' }
      },
      data: {
        status: ItemStatus.QUARANTINED
      }
    });

    console.log(`🔒 Quarantined ${updated.count} pharmaceutical items`);

    // Create notifications (simulated)
    const locations = await prisma.location.findMany();
    console.log(`📢 Notifications sent to ${locations.length} facilities`);
  }

  /**
   * Track recall progress
   */
  private async trackRecallProgress(): Promise<void> {
    const quarantinedCount = await prisma.item.count({
      where: {
        type: ItemType.PHARMACEUTICAL,
        status: ItemStatus.QUARANTINED
      }
    });

    const totalCount = await prisma.item.count({
      where: { type: ItemType.PHARMACEUTICAL }
    });

    const progress = (quarantinedCount / totalCount) * 100;
    
    console.log(`📊 Recall Progress: ${progress.toFixed(1)}% (${quarantinedCount}/${totalCount} items secured)`);
  }

  /**
   * Generate recall analytics
   */
  private async generateRecallAnalytics(): Promise<any> {
    return {
      responseTime: '3.2 minutes',
      itemsTracked: 47,
      facilitiesNotified: 12,
      complianceRate: '100%'
    };
  }

  /**
   * Display dashboard overview
   */
  private async displayDashboardOverview(): Promise<void> {
    const deviceCount = await prisma.ioTDevice.count();
    const onlineDevices = Math.floor(deviceCount * 0.9); // 90% online
    const warningDevices = Math.floor(deviceCount * 0.1); // 10% warning

    console.log(`📊 Device Status: ${onlineDevices} online, ${warningDevices} warning, 0 offline`);
    console.log('🌡️ Current conditions: 5.2°C, 65% humidity');
  }

  /**
   * Start live sensor simulation
   */
  private async startLiveSensorSimulation(): Promise<void> {
    const devices = await prisma.ioTDevice.findMany({ take: 3 });
    
    for (const device of devices) {
      // Generate readings every few seconds
      setInterval(async () => {
        await prisma.ioTData.create({
          data: {
            deviceId: device.id,
            temperature: 4 + (Math.random() - 0.5) * 2, // 3-5°C
            humidity: 65 + (Math.random() - 0.5) * 10, // 60-70%
            pressure: 1013 + (Math.random() - 0.5) * 5,
            batteryLevel: 80 + Math.random() * 20, // 80-100%
            timestamp: new Date()
          }
        });
      }, 3000); // Every 3 seconds
    }

    console.log(`📡 Live simulation started for ${devices.length} devices`);
  }

  /**
   * Trigger environmental alert
   */
  private async triggerEnvironmentalAlert(): Promise<void> {
    const device = await prisma.ioTDevice.findFirst();
    
    if (device) {
      // Create temperature spike
      await prisma.ioTData.create({
        data: {
          deviceId: device.id,
          temperature: 9.5, // Above threshold
          humidity: 75,
          pressure: 1013,
          batteryLevel: 85,
          timestamp: new Date()
        }
      });

      // Create alert
      await prisma.ioTAlert.create({
        data: {
          deviceId: device.id,
          alertType: 'TEMPERATURE_VIOLATION',
          severity: AlertSeverity.HIGH,
          message: 'Temperature 9.5°C exceeds threshold (8°C)',
          value: 9.5,
          timestamp: new Date(),
          acknowledged: false
        }
      });

      console.log('🚨 Environmental alert: Temperature exceeded 8°C threshold');
    }
  }

  /**
   * Simulate mobile response
   */
  private async simulateMobileResponse(): Promise<void> {
    console.log('📱 Mobile notification sent to field technician');
    console.log('🔍 Technician scanning specimens with mobile app');
    console.log('✅ Corrective action confirmed via mobile interface');
  }

  /**
   * Utility: Get location ID by name
   */
  private async getLocationId(name: string): Promise<string> {
    const location = await prisma.location.findFirst({
      where: { name: { contains: name } }
    });
    
    if (!location) {
      throw new Error(`Location not found: ${name}`);
    }
    
    return location.id;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.simulator.destroy();
    prisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  const scenarios = new DemoScenarios();
  
  const command = process.argv[2];

  switch (command) {
    case 'specimen':
      scenarios.runSpecimenJourney()
        .then(() => console.log('✅ Specimen journey demo completed'))
        .catch(console.error);
      break;
    
    case 'recall':
      scenarios.runEmergencyRecall()
        .then(() => console.log('✅ Emergency recall demo completed'))
        .catch(console.error);
      break;
    
    case 'iot':
      scenarios.runIoTMonitoring()
        .then(() => console.log('✅ IoT monitoring demo completed'))
        .catch(console.error);
      break;
    
    case 'all':
      console.log('🎬 Running all demo scenarios...');
      Promise.all([
        scenarios.runSpecimenJourney(),
        new Promise(resolve => setTimeout(resolve, 60000)).then(() => scenarios.runEmergencyRecall()),
        new Promise(resolve => setTimeout(resolve, 120000)).then(() => scenarios.runIoTMonitoring())
      ]).then(() => {
        console.log('✅ All demo scenarios completed');
      }).catch(console.error);
      break;
    
    default:
      console.log(`
🎬 Healthcare Chain of Custody - Demo Scenarios

Usage:
  npm run demo:scenario specimen   - Laboratory Specimen Journey (15 min)
  npm run demo:scenario recall     - Emergency Pharmaceutical Recall (10 min)
  npm run demo:scenario iot        - IoT Environmental Monitoring (8 min)
  npm run demo:scenario all        - Run all scenarios sequentially

Examples:
  npm run demo:scenario specimen
  npm run demo:scenario recall
  npm run demo:scenario iot
  npm run demo:scenario all
      `);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down demo scenarios...');
    scenarios.destroy();
    process.exit(0);
  });
}

export default DemoScenarios;