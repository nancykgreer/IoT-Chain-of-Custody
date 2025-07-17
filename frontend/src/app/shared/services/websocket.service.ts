import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';

export interface SensorData {
  deviceId: string;
  reading: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    batteryLevel?: number;
    timestamp: string;
  };
  device: {
    id: string;
    name: string;
    type: string;
  };
}

export interface IoTAlert {
  id: string;
  deviceId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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

export interface DeviceStatus {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private baseUrl = environment.apiUrl.replace('/api', '');
  
  // Observables for real-time data
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private sensorDataSubject = new BehaviorSubject<SensorData | null>(null);
  private alertsSubject = new BehaviorSubject<IoTAlert[]>([]);
  private deviceStatusSubject = new BehaviorSubject<DeviceStatus | null>(null);
  
  public connected$ = this.connectedSubject.asObservable();
  public sensorData$ = this.sensorDataSubject.asObservable();
  public alerts$ = this.alertsSubject.asObservable();
  public deviceStatus$ = this.deviceStatusSubject.asObservable();
  
  private currentAlerts: IoTAlert[] = [];

  constructor(private authService: AuthService) {
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(this.baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      retries: 3
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connectedSubject.next(false);
    });

    this.socket.on('connection:confirmed', (data) => {
      console.log('WebSocket connection confirmed:', data);
    });

    // Sensor data events
    this.socket.on('sensor:data', (data: SensorData) => {
      this.sensorDataSubject.next(data);
    });

    // Alert events
    this.socket.on('alert:new', (alert: IoTAlert) => {
      this.currentAlerts.unshift(alert);
      this.alertsSubject.next([...this.currentAlerts]);
    });

    this.socket.on('alert:resolved', (data: any) => {
      this.currentAlerts = this.currentAlerts.filter(alert => alert.id !== data.alertId);
      this.alertsSubject.next([...this.currentAlerts]);
    });

    // Device status events
    this.socket.on('device:status', (status: DeviceStatus) => {
      this.deviceStatusSubject.next(status);
    });

    this.socket.on('device:status_change', (status: DeviceStatus) => {
      this.deviceStatusSubject.next(status);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectedSubject.next(false);
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
    }
  }

  // Subscription methods
  public subscribeToDevice(deviceId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:device', deviceId);
    }
  }

  public unsubscribeFromDevice(deviceId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:device', deviceId);
    }
  }

  public subscribeToLocation(locationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:location', locationId);
    }
  }

  public unsubscribeFromLocation(locationId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:location', locationId);
    }
  }

  // Alert management
  public acknowledgeAlert(alertId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('acknowledge:alert', alertId);
    }
  }

  public getCurrentAlerts(): IoTAlert[] {
    return [...this.currentAlerts];
  }

  public getAlertsCount(): number {
    return this.currentAlerts.length;
  }

  public getCriticalAlertsCount(): number {
    return this.currentAlerts.filter(alert => alert.severity === 'CRITICAL').length;
  }

  // Connection status
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Listen for specific events
  public on(event: string): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on(event, (data) => observer.next(data));
      }
      
      return () => {
        if (this.socket) {
          this.socket.off(event);
        }
      };
    });
  }

  // Emit events
  public emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }
}