#!/usr/bin/env ts-node

/**
 * Healthcare Chain of Custody - Demo Simulation Scripts
 * 
 * This script simulates realistic scenarios for demonstration purposes:
 * - IoT sensor data generation
 * - Workflow triggers and automation
 * - Custody transfer events
 * - Token reward calculations
 * - Emergency situations and alerts
 */

import { PrismaClient, ItemType, ItemStatus, AlertSeverity, WorkflowStatus } from '@prisma/client';
import { WebSocketServer } from 'ws';

const prisma = new PrismaClient();

interface SimulationConfig {
  duration: number; // minutes
  iotDeviceCount: number;
  temperatureRange: [number, number];
  humidityRange: [number, number];
  alertProbability: number;
  transferProbability: number;
}

interface IoTReading {
  deviceId: string;
  temperature: number;
  humidity: number;
  pressure: number;
  batteryLevel: number;
  timestamp: Date;
}

class DemoSimulator {
  private wss: WebSocketServer;
  private isRunning = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private devices: any[] = [];
  private items: any[] = [];
  private workflows: any[] = [];

  constructor(port: number = 3002) {
    this.wss = new WebSocketServer({ port });
    console.log(`🎮 Demo Simulator WebSocket server running on port ${port}`);
  }

  /**
   * Start the complete demo simulation
   */
  async startSimulation(config: SimulationConfig): Promise<void> {
    console.log('🚀 Starting Healthcare Chain of Custody Demo Simulation...');
    
    try {
      await this.initializeData();
      this.isRunning = true;

      // Start IoT data simulation
      this.simulateIoTData(config);
      
      // Start workflow triggers
      this.simulateWorkflowTriggers(config);
      
      // Start custody transfers
      this.simulateCustodyTransfers(config);

      console.log(`✅ Simulation started for ${config.duration} minutes`);
      
      // Auto-stop after duration
      setTimeout(() => {
        this.stopSimulation();
      }, config.duration * 60 * 1000);

    } catch (error) {
      console.error('❌ Failed to start simulation:', error);
    }
  }

  /**
   * Stop all simulations
   */
  stopSimulation(): void {
    this.isRunning = false;
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    console.log('🛑 Demo simulation stopped');
  }

  /**
   * Initialize demo data
   */
  private async initializeData(): Promise<void> {
    console.log('📊 Initializing demo data...');

    // Get existing IoT devices
    this.devices = await prisma.ioTDevice.findMany({
      include: { location: true }
    });

    // Get existing items
    this.items = await prisma.item.findMany({
      include: { currentLocation: true, custodyEvents: true }
    });

    // Get active workflows
    this.workflows = await prisma.workflow.findMany({
      where: { isActive: true }
    });

    console.log(`📱 Found ${this.devices.length} IoT devices`);
    console.log(`📦 Found ${this.items.length} items`);
    console.log(`⚙️ Found ${this.workflows.length} active workflows`);
  }

  /**
   * Simulate realistic IoT sensor data
   */
  private simulateIoTData(config: SimulationConfig): void {
    const interval = setInterval(async () => {
      if (!this.isRunning) return;

      for (const device of this.devices) {
        const reading = this.generateIoTReading(device, config);
        
        // Store in database
        await this.storeIoTReading(device.id, reading);
        
        // Broadcast to WebSocket clients
        this.broadcastIoTUpdate(device.id, reading);
        
        // Check for threshold violations
        await this.checkThresholdViolations(device, reading);
      }
    }, 5000); // Every 5 seconds

    this.simulationInterval = interval;
  }

  /**
   * Generate realistic IoT sensor reading
   */
  private generateIoTReading(device: any, config: SimulationConfig): IoTReading {
    // Base values with some drift
    const baseTemp = 4.0; // Cold chain storage
    const baseHumidity = 65.0;
    const basePressure = 1013.25;

    // Add realistic noise and occasional spikes
    const tempVariation = (Math.random() - 0.5) * 2; // ±1°C normal variation
    const humidityVariation = (Math.random() - 0.5) * 10; // ±5% normal variation
    
    // Occasional temperature spikes (equipment malfunction simulation)
    const spikeChance = Math.random() < 0.02; // 2% chance
    const temperatureSpike = spikeChance ? Math.random() * 6 + 2 : 0; // 2-8°C spike

    // Battery drain simulation
    const batteryDrain = Math.max(10, 100 - (Date.now() % 86400000) / 864000); // Drains over day

    return {
      deviceId: device.id,
      temperature: baseTemp + tempVariation + temperatureSpike,
      humidity: Math.max(0, Math.min(100, baseHumidity + humidityVariation)),
      pressure: basePressure + (Math.random() - 0.5) * 5,
      batteryLevel: batteryDrain,
      timestamp: new Date()
    };
  }

  /**
   * Store IoT reading in database
   */
  private async storeIoTReading(deviceId: string, reading: IoTReading): Promise<void> {
    try {
      await prisma.ioTData.create({
        data: {
          deviceId,
          temperature: reading.temperature,
          humidity: reading.humidity,
          pressure: reading.pressure,
          batteryLevel: reading.batteryLevel,
          timestamp: reading.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to store IoT reading:', error);
    }
  }

  /**
   * Broadcast IoT update via WebSocket
   */
  private broadcastIoTUpdate(deviceId: string, reading: IoTReading): void {
    const message = JSON.stringify({
      type: 'iot_update',
      deviceId,
      data: reading
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  /**
   * Check for threshold violations and create alerts
   */
  private async checkThresholdViolations(device: any, reading: IoTReading): Promise<void> {
    const alerts: any[] = [];

    // Temperature threshold (2-8°C for specimens)
    if (reading.temperature < 2 || reading.temperature > 8) {
      alerts.push({
        type: 'TEMPERATURE_VIOLATION',
        severity: reading.temperature < 0 || reading.temperature > 10 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        message: `Temperature ${reading.temperature.toFixed(1)}°C outside safe range (2-8°C)`,
        value: reading.temperature
      });
    }

    // Humidity threshold
    if (reading.humidity > 85 || reading.humidity < 45) {
      alerts.push({
        type: 'HUMIDITY_VIOLATION',
        severity: AlertSeverity.MEDIUM,
        message: `Humidity ${reading.humidity.toFixed(1)}% outside optimal range (45-85%)`,
        value: reading.humidity
      });
    }

    // Low battery
    if (reading.batteryLevel < 20) {
      alerts.push({
        type: 'LOW_BATTERY',
        severity: reading.batteryLevel < 10 ? AlertSeverity.HIGH : AlertSeverity.LOW,
        message: `Device battery low: ${reading.batteryLevel.toFixed(0)}%`,
        value: reading.batteryLevel
      });
    }

    // Create alerts and trigger workflows
    for (const alert of alerts) {
      await this.createAlert(device.id, alert, reading);
      await this.triggerAlertWorkflows(device, alert, reading);
    }
  }

  /**
   * Create alert in database
   */
  private async createAlert(deviceId: string, alert: any, reading: IoTReading): Promise<void> {
    try {
      await prisma.ioTAlert.create({
        data: {
          deviceId,
          alertType: alert.type,
          severity: alert.severity,
          message: alert.message,
          value: alert.value,
          timestamp: reading.timestamp,
          acknowledged: false
        }
      });

      // Broadcast alert
      this.broadcastAlert(deviceId, alert);
      
      console.log(`🚨 Alert: ${alert.message} (Device: ${deviceId})`);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Broadcast alert via WebSocket
   */
  private broadcastAlert(deviceId: string, alert: any): void {
    const message = JSON.stringify({
      type: 'iot_alert',
      deviceId,
      alert
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Trigger workflows based on alerts
   */
  private async triggerAlertWorkflows(device: any, alert: any, reading: IoTReading): Promise<void> {
    // Find workflows that should be triggered
    const applicableWorkflows = this.workflows.filter(workflow => {
      return workflow.triggerType === 'IOT_ALERT' && 
             workflow.triggerConditions.alertTypes?.includes(alert.type);
    });

    for (const workflow of applicableWorkflows) {
      await this.executeWorkflow(workflow, {
        deviceId: device.id,
        locationId: device.locationId,
        alert,
        reading
      });
    }
  }

  /**
   * Execute a workflow instance
   */
  private async executeWorkflow(workflow: any, context: any): Promise<void> {
    try {
      console.log(`⚙️ Executing workflow: ${workflow.name}`);

      const workflowInstance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          status: WorkflowStatus.RUNNING,
          context: context,
          triggeredBy: 'SYSTEM',
          startedAt: new Date()
        }
      });

      // Simulate workflow execution steps
      await this.simulateWorkflowSteps(workflowInstance, workflow, context);

    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  }

  /**
   * Simulate workflow execution steps
   */
  private async simulateWorkflowSteps(instance: any, workflow: any, context: any): Promise<void> {
    // Simulate step execution with delays
    const steps = workflow.steps || [
      { name: 'Identify affected items', duration: 2000 },
      { name: 'Notify stakeholders', duration: 1000 },
      { name: 'Execute containment actions', duration: 3000 },
      { name: 'Generate compliance report', duration: 2000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      console.log(`   📋 Step ${i + 1}: ${step.name}`);
      
      // Simulate step execution time
      await this.delay(step.duration);
      
      // Broadcast step completion
      this.broadcastWorkflowUpdate(instance.id, {
        step: i + 1,
        totalSteps: steps.length,
        currentStep: step.name,
        status: 'completed'
      });
    }

    // Complete workflow
    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        status: WorkflowStatus.COMPLETED,
        completedAt: new Date()
      }
    });

    console.log(`✅ Workflow completed: ${workflow.name}`);
    
    // Award tokens for successful workflow completion
    await this.awardTokens(context, workflow);
  }

  /**
   * Broadcast workflow update via WebSocket
   */
  private broadcastWorkflowUpdate(instanceId: string, update: any): void {
    const message = JSON.stringify({
      type: 'workflow_update',
      instanceId,
      update
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Award tokens for compliance and quality
   */
  private async awardTokens(context: any, workflow: any): Promise<void> {
    const baseReward = 10; // Base tokens per workflow completion
    const qualityMultiplier = Math.random() > 0.1 ? 1.5 : 1.0; // 90% chance of quality bonus
    const speedBonus = workflow.name.includes('Emergency') ? 2.0 : 1.0;
    
    const tokens = Math.floor(baseReward * qualityMultiplier * speedBonus);
    
    console.log(`🪙 Awarded ${tokens} CHAIN tokens for workflow completion`);
    
    // Broadcast token award
    this.broadcastTokenAward(tokens, workflow.name);
  }

  /**
   * Broadcast token award via WebSocket
   */
  private broadcastTokenAward(tokens: number, reason: string): void {
    const message = JSON.stringify({
      type: 'token_award',
      tokens,
      reason,
      timestamp: new Date()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Simulate custody transfers
   */
  private simulateCustodyTransfers(config: SimulationConfig): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // Random chance of custody transfer
      if (Math.random() < config.transferProbability) {
        await this.simulateRandomTransfer();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Simulate a random custody transfer
   */
  private async simulateRandomTransfer(): Promise<void> {
    const randomItem = this.items[Math.floor(Math.random() * this.items.length)];
    if (!randomItem || randomItem.status !== ItemStatus.ACTIVE) return;

    try {
      // Simulate transfer between locations
      const locations = await prisma.location.findMany();
      const currentLocationId = randomItem.currentLocationId;
      const availableLocations = locations.filter(loc => loc.id !== currentLocationId);
      
      if (availableLocations.length === 0) return;

      const newLocation = availableLocations[Math.floor(Math.random() * availableLocations.length)];
      
      console.log(`📦 Simulating transfer: ${randomItem.identifier} → ${newLocation.name}`);

      // Create custody event
      await prisma.custodyEvent.create({
        data: {
          itemId: randomItem.id,
          fromLocationId: currentLocationId,
          toLocationId: newLocation.id,
          transferredBy: 'DEMO_USER',
          receivedBy: 'DEMO_RECEIVER',
          eventType: 'TRANSFER',
          timestamp: new Date(),
          digitalSignature: `DEMO_SIG_${Date.now()}`,
          notes: 'Automated demo transfer'
        }
      });

      // Update item location
      await prisma.item.update({
        where: { id: randomItem.id },
        data: { currentLocationId: newLocation.id }
      });

      // Broadcast transfer event
      this.broadcastTransferEvent(randomItem, newLocation);
      
      // Award tokens for successful transfer
      await this.awardTokens({ itemId: randomItem.id }, { name: 'Custody Transfer' });

    } catch (error) {
      console.error('Failed to simulate transfer:', error);
    }
  }

  /**
   * Broadcast transfer event via WebSocket
   */
  private broadcastTransferEvent(item: any, newLocation: any): void {
    const message = JSON.stringify({
      type: 'custody_transfer',
      item: {
        id: item.id,
        identifier: item.identifier,
        type: item.type
      },
      newLocation: {
        id: newLocation.id,
        name: newLocation.name
      },
      timestamp: new Date()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Simulate emergency recall scenario
   */
  async simulateEmergencyRecall(itemType: ItemType, reason: string): Promise<void> {
    console.log(`🚨 EMERGENCY RECALL SIMULATION: ${itemType} - ${reason}`);

    try {
      // Find all items of the specified type
      const affectedItems = await prisma.item.findMany({
        where: {
          type: itemType,
          status: ItemStatus.ACTIVE
        },
        include: { currentLocation: true }
      });

      console.log(`📋 Found ${affectedItems.length} affected items`);

      // Create workflow instance for recall
      const recallWorkflow = await prisma.workflow.findFirst({
        where: { name: { contains: 'Emergency Recall' } }
      });

      if (recallWorkflow) {
        await this.executeWorkflow(recallWorkflow, {
          recallType: itemType,
          reason,
          affectedCount: affectedItems.length,
          items: affectedItems.map(item => item.id)
        });
      }

      // Quarantine all affected items
      for (const item of affectedItems) {
        await prisma.item.update({
          where: { id: item.id },
          data: { status: ItemStatus.QUARANTINED }
        });

        console.log(`🔒 Quarantined: ${item.identifier}`);
      }

      // Broadcast recall alert
      this.broadcastRecallAlert(itemType, reason, affectedItems.length);

    } catch (error) {
      console.error('Failed to simulate emergency recall:', error);
    }
  }

  /**
   * Broadcast recall alert via WebSocket
   */
  private broadcastRecallAlert(itemType: ItemType, reason: string, affectedCount: number): void {
    const message = JSON.stringify({
      type: 'emergency_recall',
      itemType,
      reason,
      affectedCount,
      timestamp: new Date()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Simulate workflow triggers
   */
  private simulateWorkflowTriggers(config: SimulationConfig): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // Random workflow triggers for demo
      if (Math.random() < 0.1) { // 10% chance every interval
        await this.triggerRandomWorkflow();
      }
    }, 20000); // Every 20 seconds
  }

  /**
   * Trigger a random workflow for demo purposes
   */
  private async triggerRandomWorkflow(): Promise<void> {
    const workflows = ['High Value Transfer Approval', 'Daily Lab Transfer', 'Cold Chain Compliance'];
    const randomWorkflow = workflows[Math.floor(Math.random() * workflows.length)];
    
    const workflow = await prisma.workflow.findFirst({
      where: { name: { contains: randomWorkflow } }
    });

    if (workflow) {
      await this.executeWorkflow(workflow, {
        trigger: 'SCHEDULED_DEMO',
        timestamp: new Date()
      });
    }
  }

  /**
   * Utility: Create delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate demo performance metrics
   */
  generateMetrics(): any {
    return {
      systemUptime: '99.95%',
      totalTransfers: Math.floor(Math.random() * 1000) + 500,
      complianceRate: '99.8%',
      alertResponseTime: '47 seconds',
      tokensEarned: Math.floor(Math.random() * 10000) + 5000,
      devicesOnline: this.devices.filter(d => Math.random() > 0.05).length,
      totalDevices: this.devices.length,
      avgTemperature: '5.2°C',
      avgHumidity: '62%'
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSimulation();
    this.wss.close();
    prisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  const simulator = new DemoSimulator();
  
  const defaultConfig: SimulationConfig = {
    duration: 30, // 30 minutes
    iotDeviceCount: 8,
    temperatureRange: [2, 8],
    humidityRange: [45, 85],
    alertProbability: 0.05,
    transferProbability: 0.1
  };

  // Handle command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'start':
      simulator.startSimulation(defaultConfig);
      break;
    
    case 'recall':
      const itemType = (args[1] as ItemType) || ItemType.PHARMACEUTICAL;
      const reason = args[2] || 'Contamination detected in batch';
      simulator.simulateEmergencyRecall(itemType, reason);
      break;
    
    case 'metrics':
      console.log('📊 Current Demo Metrics:');
      console.log(JSON.stringify(simulator.generateMetrics(), null, 2));
      break;
    
    default:
      console.log(`
🎮 Healthcare Chain of Custody - Demo Simulator

Usage:
  npm run demo:simulate start     - Start full simulation
  npm run demo:simulate recall    - Trigger emergency recall
  npm run demo:simulate metrics   - Show current metrics

Examples:
  npm run demo:simulate start
  npm run demo:simulate recall PHARMACEUTICAL "Quality control failure"
  npm run demo:simulate metrics
      `);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down demo simulator...');
    simulator.destroy();
    process.exit(0);
  });
}

export default DemoSimulator;