import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IoTDeviceData {
  deviceId: string;
  timestamp: Date;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  battery?: number;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  alerts?: string[];
  metadata?: {
    rssi?: number;
    snr?: number;
    spreading_factor?: number;
  };
}

export interface DeviceAlert {
  type: 'TEMP_HIGH' | 'TEMP_LOW' | 'HUMIDITY_HIGH' | 'HUMIDITY_LOW' | 
        'BATTERY_LOW' | 'LOCATION_VIOLATION' | 'TAMPER_DETECTED' | 'OFFLINE';
  threshold?: number;
  currentValue?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export class IoTDeviceModel {
  
  static async createDevice(data: {
    heliumDeviceId: string;
    deviceType: string;
    name: string;
    locationId?: string;
    itemId?: string;
    organizationId: string;
    thresholds?: any;
  }) {
    return await prisma.ioTDevice.create({
      data: {
        heliumDeviceId: data.heliumDeviceId,
        deviceType: data.deviceType,
        name: data.name,
        locationId: data.locationId,
        itemId: data.itemId,
        organizationId: data.organizationId,
        thresholds: data.thresholds || {},
        isActive: true,
        batteryLevel: 100,
        lastSeen: new Date()
      }
    });
  }

  static async recordSensorData(deviceId: string, data: IoTDeviceData) {
    // Create sensor reading
    const reading = await prisma.sensorReading.create({
      data: {
        deviceId,
        timestamp: data.timestamp,
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
        latitude: data.location?.lat,
        longitude: data.location?.lng,
        locationAccuracy: data.location?.accuracy,
        batteryLevel: data.battery,
        rssi: data.metadata?.rssi,
        snr: data.metadata?.snr,
        rawData: data
      }
    });

    // Update device status
    const device = await prisma.ioTDevice.update({
      where: { heliumDeviceId: deviceId },
      data: {
        batteryLevel: data.battery,
        lastSeen: data.timestamp,
        lastTemperature: data.temperature,
        lastHumidity: data.humidity,
        lastLatitude: data.location?.lat,
        lastLongitude: data.location?.lng
      },
      include: {
        organization: true,
        item: true,
        location: true
      }
    });

    // Emit real-time data via WebSocket
    try {
      const { websocketService } = await import('../services/websocketService');
      if (websocketService) {
        websocketService.emitSensorData(deviceId, {
          reading,
          device: {
            id: device.id,
            name: device.name,
            type: device.deviceType
          }
        });
      }
    } catch (error) {
      // WebSocket service might not be initialized yet, continue without error
    }

    return reading;
  }

  static async checkThresholds(deviceId: string, data: IoTDeviceData): Promise<DeviceAlert[]> {
    const device = await prisma.ioTDevice.findUnique({
      where: { heliumDeviceId: deviceId },
      include: { item: true, location: true }
    });

    if (!device || !device.thresholds) return [];

    const alerts: DeviceAlert[] = [];
    const thresholds = device.thresholds as any;

    // Temperature checks
    if (data.temperature !== undefined) {
      if (thresholds.tempMax && data.temperature > thresholds.tempMax) {
        alerts.push({
          type: 'TEMP_HIGH',
          threshold: thresholds.tempMax,
          currentValue: data.temperature,
          severity: 'HIGH',
          message: `Temperature ${data.temperature}°C exceeds maximum threshold ${thresholds.tempMax}°C`
        });
      }
      
      if (thresholds.tempMin && data.temperature < thresholds.tempMin) {
        alerts.push({
          type: 'TEMP_LOW',
          threshold: thresholds.tempMin,
          currentValue: data.temperature,
          severity: 'HIGH',
          message: `Temperature ${data.temperature}°C below minimum threshold ${thresholds.tempMin}°C`
        });
      }
    }

    // Humidity checks
    if (data.humidity !== undefined) {
      if (thresholds.humidityMax && data.humidity > thresholds.humidityMax) {
        alerts.push({
          type: 'HUMIDITY_HIGH',
          threshold: thresholds.humidityMax,
          currentValue: data.humidity,
          severity: 'MEDIUM',
          message: `Humidity ${data.humidity}% exceeds maximum threshold ${thresholds.humidityMax}%`
        });
      }
    }

    // Battery checks
    if (data.battery !== undefined) {
      if (data.battery < 20) {
        alerts.push({
          type: 'BATTERY_LOW',
          currentValue: data.battery,
          severity: data.battery < 10 ? 'HIGH' : 'MEDIUM',
          message: `Device battery at ${data.battery}%`
        });
      }
    }

    // Location checks (geofencing)
    if (data.location && thresholds.geofence) {
      const distance = this.calculateDistance(
        data.location.lat,
        data.location.lng,
        thresholds.geofence.centerLat,
        thresholds.geofence.centerLng
      );

      if (distance > thresholds.geofence.radius) {
        alerts.push({
          type: 'LOCATION_VIOLATION',
          severity: 'HIGH',
          message: `Device moved outside authorized area (${distance.toFixed(0)}m from center)`
        });
      }
    }

    // Store alerts in database and emit via WebSocket
    for (const alert of alerts) {
      const dbAlert = await prisma.ioTAlert.create({
        data: {
          deviceId,
          alertType: alert.type,
          severity: alert.severity,
          message: alert.message,
          threshold: alert.threshold,
          currentValue: alert.currentValue,
          isResolved: false,
          timestamp: data.timestamp
        },
        include: {
          device: {
            include: {
              organization: true,
              item: true,
              location: true
            }
          }
        }
      });

      // Emit alert via WebSocket
      try {
        const { websocketService } = await import('../services/websocketService');
        if (websocketService) {
          websocketService.emitAlert(dbAlert);
        }
      } catch (error) {
        // Continue without WebSocket if not available
      }
    }

    return alerts;
  }

  static async getDeviceHistory(deviceId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await prisma.sensorReading.findMany({
      where: {
        deviceId,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });
  }

  static async getActiveAlerts(organizationId?: string) {
    const where: any = { isResolved: false };
    
    if (organizationId) {
      where.device = { organizationId };
    }

    return await prisma.ioTAlert.findMany({
      where,
      include: {
        device: {
          include: { item: true, location: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async resolveAlert(alertId: string, resolvedBy: string) {
    return await prisma.ioTAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy
      }
    });
  }

  static async getDeviceStatus(organizationId?: string) {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const devices = await prisma.ioTDevice.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, barcode: true } },
        location: { select: { id: true, name: true } },
        _count: {
          select: {
            sensorReadings: {
              where: {
                timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            },
            alerts: {
              where: { isResolved: false }
            }
          }
        }
      }
    });

    return devices.map(device => ({
      ...device,
      status: this.getDeviceStatus(device.lastSeen),
      readingsLast24h: device._count.sensorReadings,
      activeAlerts: device._count.alerts
    }));
  }

  private static getDeviceStatusFromLastSeen(lastSeen: Date): 'ONLINE' | 'OFFLINE' | 'WARNING' {
    const minutesAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60);
    
    if (minutesAgo < 15) return 'ONLINE';
    if (minutesAgo < 60) return 'WARNING';
    return 'OFFLINE';
  }

  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}