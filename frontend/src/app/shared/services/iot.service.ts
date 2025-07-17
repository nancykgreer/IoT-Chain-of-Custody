import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IoTDevice {
  id: string;
  heliumDeviceId: string;
  deviceType: string;
  name: string;
  description?: string;
  isActive: boolean;
  batteryLevel?: number;
  lastSeen: string;
  lastTemperature?: number;
  lastHumidity?: number;
  lastLatitude?: number;
  lastLongitude?: number;
  thresholds?: any;
  item?: any;
  location?: any;
  status?: 'ONLINE' | 'OFFLINE' | 'WARNING';
  readingsLast24h?: number;
  activeAlerts?: number;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  latitude?: number;
  longitude?: number;
  batteryLevel?: number;
  rssi?: number;
  snr?: number;
}

export interface IoTAlert {
  id: string;
  deviceId: string;
  alertType: string;
  severity: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  isResolved: boolean;
  timestamp: string;
  device: {
    name: string;
    type: string;
    item?: any;
    location?: any;
  };
}

export interface IoTAnalytics {
  deviceCount: number;
  activeDevices: number;
  onlinePercentage: string;
  totalReadings: number;
  activeAlerts: number;
  averageTemperature?: string;
  averageHumidity?: string;
  timeframe: string;
}

@Injectable({
  providedIn: 'root'
})
export class IoTService {
  private apiUrl = `${environment.apiUrl}/iot`;

  constructor(private http: HttpClient) {}

  // Device management
  getDevices(organizationId?: string): Observable<{success: boolean, data: IoTDevice[]}> {
    const params = organizationId ? { organizationId } : {};
    return this.http.get<{success: boolean, data: IoTDevice[]}>(`${this.apiUrl}/devices`, { params });
  }

  getDevice(deviceId: string, hours?: number): Observable<{success: boolean, data: {device: IoTDevice, history: SensorReading[], status: string}}> {
    const params = hours ? { hours: hours.toString() } : {};
    return this.http.get<any>(`${this.apiUrl}/devices/${deviceId}`, { params });
  }

  createDevice(deviceData: Partial<IoTDevice>): Observable<{success: boolean, data: IoTDevice}> {
    return this.http.post<{success: boolean, data: IoTDevice}>(`${this.apiUrl}/devices`, deviceData);
  }

  updateDevice(deviceId: string, updates: Partial<IoTDevice>): Observable<{success: boolean, data: IoTDevice}> {
    return this.http.put<{success: boolean, data: IoTDevice}>(`${this.apiUrl}/devices/${deviceId}`, updates);
  }

  // Sensor data
  getDeviceReadings(deviceId: string, limit?: number, since?: string): Observable<{success: boolean, data: SensorReading[]}> {
    const params: any = {};
    if (limit) params.limit = limit.toString();
    if (since) params.since = since;
    
    return this.http.get<{success: boolean, data: SensorReading[]}>(`${this.apiUrl}/devices/${deviceId}/readings`, { params });
  }

  // Alerts
  getAlerts(resolved = false, severity?: string, deviceId?: string): Observable<{success: boolean, data: IoTAlert[]}> {
    const params: any = { resolved: resolved.toString() };
    if (severity) params.severity = severity;
    if (deviceId) params.deviceId = deviceId;
    
    return this.http.get<{success: boolean, data: IoTAlert[]}>(`${this.apiUrl}/alerts`, { params });
  }

  resolveAlert(alertId: string, resolutionNotes?: string): Observable<{success: boolean, data: IoTAlert}> {
    const body = resolutionNotes ? { resolutionNotes } : {};
    return this.http.patch<{success: boolean, data: IoTAlert}>(`${this.apiUrl}/alerts/${alertId}/resolve`, body);
  }

  // Analytics
  getAnalytics(timeframe = '24h'): Observable<{success: boolean, data: IoTAnalytics}> {
    return this.http.get<{success: boolean, data: IoTAnalytics}>(`${this.apiUrl}/analytics`, {
      params: { timeframe }
    });
  }

  // Device configuration helpers
  getDeviceTypeConfig(deviceType: string): any {
    const configs = {
      TEMP_SENSOR: {
        icon: 'thermostat',
        color: '#2196F3',
        thresholds: {
          tempMin: 2.0,
          tempMax: 8.0,
          humidityMax: 80.0
        }
      },
      GPS_TRACKER: {
        icon: 'gps_fixed',
        color: '#4CAF50',
        thresholds: {
          geofence: { radius: 1000 }
        }
      },
      SMART_CONTAINER: {
        icon: 'inventory_2',
        color: '#FF9800',
        thresholds: {
          tempMin: 2.0,
          tempMax: 8.0,
          tamperDetection: true
        }
      },
      FACILITY_MONITOR: {
        icon: 'business',
        color: '#9C27B0',
        thresholds: {
          tempMin: 18.0,
          tempMax: 25.0,
          humidityMin: 30.0,
          humidityMax: 70.0
        }
      }
    };

    return configs[deviceType as keyof typeof configs] || configs.TEMP_SENSOR;
  }

  getSeverityConfig(severity: string): {color: string, icon: string} {
    const configs = {
      LOW: { color: '#4CAF50', icon: 'info' },
      MEDIUM: { color: '#FF9800', icon: 'warning' },
      HIGH: { color: '#F44336', icon: 'error' },
      CRITICAL: { color: '#B71C1C', icon: 'crisis_alert' }
    };

    return configs[severity as keyof typeof configs] || configs.LOW;
  }
}