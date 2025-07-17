import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IoTService, IoTDevice, IoTAnalytics } from '../../shared/services/iot.service';
import { WebSocketService, IoTAlert } from '../../shared/services/websocket.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-monitoring-dashboard',
  templateUrl: './monitoring-dashboard.component.html',
  styleUrls: ['./monitoring-dashboard.component.scss']
})
export class MonitoringDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  devices: IoTDevice[] = [];
  analytics: IoTAnalytics | null = null;
  alerts: IoTAlert[] = [];
  isConnected = false;
  isLoading = true;

  // Dashboard state
  selectedTimeframe = '24h';
  refreshInterval: any;
  lastUpdate: Date = new Date();

  constructor(
    private iotService: IoTService,
    private websocketService: WebSocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeWebSocket();
    this.loadDashboardData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private initializeWebSocket(): void {
    // Monitor connection status
    this.websocketService.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        if (connected) {
          console.log('WebSocket connected - subscribing to organization updates');
        }
      });

    // Listen for real-time alerts
    this.websocketService.alerts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(alerts => {
        this.alerts = alerts;
        this.lastUpdate = new Date();
      });

    // Listen for device status changes
    this.websocketService.deviceStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(statusChange => {
        if (statusChange) {
          this.updateDeviceStatus(statusChange.deviceId, statusChange.status);
          this.lastUpdate = new Date();
        }
      });

    // Listen for sensor data updates
    this.websocketService.sensorData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sensorData => {
        if (sensorData) {
          this.updateDeviceData(sensorData);
          this.lastUpdate = new Date();
        }
      });
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    // Load devices
    this.iotService.getDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.devices = response.data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading devices:', error);
          this.isLoading = false;
        }
      });

    // Load analytics
    this.loadAnalytics();

    // Load current alerts
    this.loadAlerts();
  }

  private loadAnalytics(): void {
    this.iotService.getAnalytics(this.selectedTimeframe)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.analytics = response.data;
        },
        error: (error) => {
          console.error('Error loading analytics:', error);
        }
      });
  }

  private loadAlerts(): void {
    this.iotService.getAlerts(false) // Get unresolved alerts
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.alerts = response.data;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });
  }

  private setupAutoRefresh(): void {
    // Refresh analytics every 5 minutes
    this.refreshInterval = setInterval(() => {
      this.loadAnalytics();
    }, 5 * 60 * 1000);
  }

  private updateDeviceStatus(deviceId: string, status: string): void {
    const device = this.devices.find(d => d.heliumDeviceId === deviceId);
    if (device) {
      device.status = status as any;
    }
  }

  private updateDeviceData(sensorData: any): void {
    const device = this.devices.find(d => d.heliumDeviceId === sensorData.deviceId);
    if (device && sensorData.reading) {
      device.lastTemperature = sensorData.reading.temperature;
      device.lastHumidity = sensorData.reading.humidity;
      device.batteryLevel = sensorData.reading.batteryLevel;
      device.lastSeen = sensorData.reading.timestamp;
    }
  }

  // Event handlers
  onTimeframeChange(timeframe: string): void {
    this.selectedTimeframe = timeframe;
    this.loadAnalytics();
  }

  onRefreshData(): void {
    this.loadDashboardData();
    this.lastUpdate = new Date();
  }

  onDeviceSelect(device: IoTDevice): void {
    // Subscribe to device-specific updates
    this.websocketService.subscribeToDevice(device.heliumDeviceId);
  }

  onAlertResolve(alertId: string): void {
    this.iotService.resolveAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        },
        error: (error) => {
          console.error('Error resolving alert:', error);
        }
      });
  }

  // Getters for template
  get onlineDevicesCount(): number {
    return this.devices.filter(d => d.status === 'ONLINE').length;
  }

  get offlineDevicesCount(): number {
    return this.devices.filter(d => d.status === 'OFFLINE').length;
  }

  get warningDevicesCount(): number {
    return this.devices.filter(d => d.status === 'WARNING').length;
  }

  get criticalAlertsCount(): number {
    return this.alerts.filter(alert => alert.severity === 'CRITICAL').length;
  }

  get highAlertsCount(): number {
    return this.alerts.filter(alert => alert.severity === 'HIGH').length;
  }

  get averageTemperature(): number | null {
    const temps = this.devices
      .filter(d => d.lastTemperature !== null && d.lastTemperature !== undefined)
      .map(d => d.lastTemperature!);
    
    return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  }

  get averageHumidity(): number | null {
    const humidity = this.devices
      .filter(d => d.lastHumidity !== null && d.lastHumidity !== undefined)
      .map(d => d.lastHumidity!);
    
    return humidity.length > 0 ? humidity.reduce((a, b) => a + b, 0) / humidity.length : null;
  }
}