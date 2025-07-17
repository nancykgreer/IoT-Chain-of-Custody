import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { criticalOpsRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { IoTDeviceModel, IoTDeviceData } from '../models/iotDevice';
import { WorkflowService } from '../services/workflowService';
import { AuditService } from '../services/auditService';
import { NotificationService } from '../services/notificationService';
import { WebSocketService } from '../services/websocketService';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Initialize services
const auditService = new AuditService(prisma);
const notificationService = new NotificationService();
const websocketService = new WebSocketService();
const workflowService = new WorkflowService(prisma, auditService, notificationService, websocketService);

// Apply authentication to protected routes
const protectedRouter = Router();
protectedRouter.use(authenticateToken);

// Helium webhook endpoint (no auth - verified by secret)
router.post('/helium/webhook/:webhookId', async (req, res, next) => {
  try {
    const { webhookId } = req.params;
    const signature = req.get('X-Helium-Signature');
    const payload = req.body;

    // Verify webhook
    const webhook = await prisma.heliumWebhook.findUnique({
      where: { webhookId }
    });

    if (!webhook || !webhook.isActive) {
      return res.status(404).json({ error: 'Webhook not found or inactive' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature:', { webhookId, signature });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process the payload
    await processHeliumPayload(payload);

    // Update webhook statistics
    await prisma.heliumWebhook.update({
      where: { id: webhook.id },
      data: {
        lastReceived: new Date(),
        totalReceived: { increment: 1 }
      }
    });

    res.json({ success: true, message: 'Payload processed' });
  } catch (error) {
    logger.error('Helium webhook error:', error);
    
    // Update error count
    const { webhookId } = req.params;
    await prisma.heliumWebhook.update({
      where: { webhookId },
      data: { totalErrors: { increment: 1 } }
    }).catch(() => {});

    next(error);
  }
});

// Get all IoT devices
protectedRouter.get('/devices', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { organizationId } = req.query;
    
    // Check permissions
    const targetOrgId = organizationId || req.user?.organizationId;
    if (organizationId && organizationId !== req.user?.organizationId && 
        !['ADMIN', 'COMPLIANCE_OFFICER'].includes(req.user?.role!)) {
      return res.status(403).json({ error: 'Cannot access devices from different organization' });
    }

    const devices = await IoTDeviceModel.getDeviceStatus(targetOrgId as string);

    res.json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
});

// Get device details and history
protectedRouter.get('/devices/:deviceId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { deviceId } = req.params;
    const { hours = 24 } = req.query;

    const device = await prisma.ioTDevice.findUnique({
      where: { heliumDeviceId: deviceId },
      include: {
        item: true,
        location: true,
        organization: true
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check permissions
    if (device.organizationId !== req.user?.organizationId && 
        !['ADMIN', 'COMPLIANCE_OFFICER'].includes(req.user?.role!)) {
      return res.status(403).json({ error: 'Cannot access device from different organization' });
    }

    const history = await IoTDeviceModel.getDeviceHistory(deviceId, Number(hours));

    res.json({
      success: true,
      data: {
        device,
        history,
        status: getDeviceStatus(device.lastSeen)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create new IoT device
protectedRouter.post('/devices', 
  requireRole('ADMIN', 'LAB_TECHNICIAN', 'NURSE'),
  criticalOpsRateLimiter,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        heliumDeviceId,
        deviceType,
        name,
        description,
        locationId,
        itemId,
        thresholds,
        transmissionInterval
      } = req.body;

      if (!heliumDeviceId || !deviceType || !name) {
        return res.status(400).json({
          error: 'Helium device ID, device type, and name are required'
        });
      }

      const device = await IoTDeviceModel.createDevice({
        heliumDeviceId,
        deviceType,
        name,
        locationId,
        itemId,
        organizationId: req.user!.organizationId,
        thresholds
      });

      logger.info('IoT device created:', {
        deviceId: device.id,
        heliumDeviceId,
        deviceType,
        createdBy: req.user!.id
      });

      res.status(201).json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }
);

// Update device configuration
protectedRouter.put('/devices/:deviceId',
  requireRole('ADMIN', 'LAB_TECHNICIAN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { deviceId } = req.params;
      const updateData = { ...req.body };

      // Remove immutable fields
      delete updateData.heliumDeviceId;
      delete updateData.organizationId;
      delete updateData.createdAt;

      const device = await prisma.ioTDevice.update({
        where: { heliumDeviceId: deviceId },
        data: updateData
      });

      logger.info('IoT device updated:', {
        deviceId,
        updatedBy: req.user!.id,
        changes: Object.keys(updateData)
      });

      res.json({ success: true, data: device });
    } catch (error) {
      next(error);
    }
  }
);

// Get device alerts
protectedRouter.get('/alerts', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { resolved = 'false', severity, deviceId } = req.query;

    const where: any = {
      isResolved: resolved === 'true',
      device: { organizationId: req.user?.organizationId }
    };

    if (severity) where.severity = severity;
    if (deviceId) where.deviceId = deviceId;

    const alerts = await prisma.ioTAlert.findMany({
      where,
      include: {
        device: {
          include: { item: true, location: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
});

// Resolve alert
protectedRouter.patch('/alerts/:alertId/resolve',
  requireRole('ADMIN', 'LAB_TECHNICIAN', 'NURSE'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { alertId } = req.params;
      const { resolutionNotes } = req.body;

      const alert = await IoTDeviceModel.resolveAlert(alertId, req.user!.id);

      if (resolutionNotes) {
        await prisma.ioTAlert.update({
          where: { id: alertId },
          data: { resolutionNotes }
        });
      }

      logger.info('IoT alert resolved:', {
        alertId,
        resolvedBy: req.user!.id
      });

      res.json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }
);

// Get real-time sensor data
protectedRouter.get('/devices/:deviceId/readings', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, since } = req.query;

    const where: any = { deviceId };
    if (since) {
      where.timestamp = { gte: new Date(since as string) };
    }

    const readings = await prisma.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });

    res.json({ success: true, data: readings });
  } catch (error) {
    next(error);
  }
});

// Get IoT analytics
protectedRouter.get('/analytics', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { timeframe = '24h' } = req.query;
    const hours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720; // 30d
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [
      deviceCount,
      activeDevices,
      totalReadings,
      activeAlerts,
      averageTemp,
      averageHumidity
    ] = await Promise.all([
      prisma.ioTDevice.count({
        where: { organizationId: req.user?.organizationId }
      }),
      prisma.ioTDevice.count({
        where: {
          organizationId: req.user?.organizationId,
          lastSeen: { gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 min
        }
      }),
      prisma.sensorReading.count({
        where: {
          device: { organizationId: req.user?.organizationId },
          timestamp: { gte: since }
        }
      }),
      prisma.ioTAlert.count({
        where: {
          device: { organizationId: req.user?.organizationId },
          isResolved: false
        }
      }),
      prisma.sensorReading.aggregate({
        where: {
          device: { organizationId: req.user?.organizationId },
          timestamp: { gte: since },
          temperature: { not: null }
        },
        _avg: { temperature: true }
      }),
      prisma.sensorReading.aggregate({
        where: {
          device: { organizationId: req.user?.organizationId },
          timestamp: { gte: since },
          humidity: { not: null }
        },
        _avg: { humidity: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        deviceCount,
        activeDevices,
        onlinePercentage: deviceCount > 0 ? (activeDevices / deviceCount * 100).toFixed(1) : '0',
        totalReadings,
        activeAlerts,
        averageTemperature: averageTemp._avg.temperature?.toFixed(1) || null,
        averageHumidity: averageHumidity._avg.humidity?.toFixed(1) || null,
        timeframe
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to process Helium payloads
async function processHeliumPayload(payload: any) {
  try {
    const deviceId = payload.device_id;
    const timestamp = new Date(payload.timestamp || Date.now());
    
    // Parse payload data
    const deviceData: IoTDeviceData = {
      deviceId,
      timestamp,
      temperature: payload.temperature,
      humidity: payload.humidity,
      pressure: payload.pressure,
      battery: payload.battery,
      location: payload.location ? {
        lat: payload.location.lat,
        lng: payload.location.lng,
        accuracy: payload.location.accuracy
      } : undefined,
      alerts: payload.alerts || [],
      metadata: {
        rssi: payload.rssi,
        snr: payload.snr,
        spreading_factor: payload.spreading_factor
      }
    };

    // Record sensor data
    await IoTDeviceModel.recordSensorData(deviceId, deviceData);

    // Check thresholds and create alerts
    const alerts = await IoTDeviceModel.checkThresholds(deviceId, deviceData);

    // Trigger workflows for each alert
    for (const alert of alerts) {
      try {
        await workflowService.evaluateIoTAlert(
          deviceId,
          alert.alertType,
          alert.currentValue || 0,
          alert.threshold || 0
        );
      } catch (error) {
        logger.error('Error triggering workflow for IoT alert:', {
          alertId: alert.id,
          deviceId,
          error: error.message
        });
      }
    }

    // Send real-time notifications via WebSocket
    if (alerts.length > 0) {
      // Get device info for the alert
      const device = await prisma.ioTDevice.findUnique({
        where: { heliumDeviceId: deviceId },
        include: {
          organization: true,
          location: true,
          item: true,
        },
      });

      if (device) {
        // Emit real-time alert to organization
        websocketService.emitToOrganization(device.organizationId, 'alert:new', {
          deviceId: device.id,
          deviceName: device.name,
          alertType: alerts[0].alertType,
          severity: alerts[0].severity,
          message: alerts[0].message,
          location: device.location?.name,
          item: device.item?.name,
          timestamp: new Date().toISOString(),
        });

        // Emit sensor data update
        websocketService.emitToOrganization(device.organizationId, 'sensor:data', {
          deviceId: device.id,
          temperature: deviceData.temperature,
          humidity: deviceData.humidity,
          pressure: deviceData.pressure,
          battery: deviceData.battery,
          timestamp: deviceData.timestamp.toISOString(),
        });
      }
    }

    // Log processing
    logger.info('Helium payload processed:', {
      deviceId,
      timestamp,
      alertsGenerated: alerts.length,
      workflowsTriggered: alerts.length
    });

  } catch (error) {
    logger.error('Error processing Helium payload:', error);
    throw error;
  }
}

function getDeviceStatus(lastSeen: Date): 'ONLINE' | 'OFFLINE' | 'WARNING' {
  const minutesAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60);
  
  if (minutesAgo < 15) return 'ONLINE';
  if (minutesAgo < 60) return 'WARNING';
  return 'OFFLINE';
}

// Mount protected routes
router.use('/api/iot', protectedRouter);

export { router as iotRoutes };