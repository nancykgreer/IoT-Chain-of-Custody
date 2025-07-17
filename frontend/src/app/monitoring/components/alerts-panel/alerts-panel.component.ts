import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IoTAlert } from '../../../shared/services/websocket.service';
import { IoTService } from '../../../shared/services/iot.service';

@Component({
  selector: 'app-alerts-panel',
  template: `
    <div class="alerts-panel">
      <div *ngIf="alerts.length === 0" class="no-alerts">
        <mat-icon>check_circle</mat-icon>
        <p>No active alerts</p>
        <small>All systems operating normally</small>
      </div>

      <div *ngFor="let alert of sortedAlerts; trackBy: trackByAlert" 
           class="alert-item" 
           [class]="'severity-' + alert.severity.toLowerCase()">
        
        <div class="alert-icon">
          <mat-icon>{{ getSeverityIcon(alert.severity) }}</mat-icon>
        </div>

        <div class="alert-content">
          <div class="alert-header">
            <span class="alert-type">{{ formatAlertType(alert.alertType) }}</span>
            <span class="alert-time">{{ alert.timestamp | relativeDate }}</span>
          </div>
          
          <div class="alert-message">{{ alert.message }}</div>
          
          <div class="alert-details">
            <span class="device-name">
              <mat-icon>{{ getDeviceIcon(alert.device.type) }}</mat-icon>
              {{ alert.device.name }}
            </span>
            
            <span *ngIf="alert.device.location" class="location">
              <mat-icon>place</mat-icon>
              {{ alert.device.location.name }}
            </span>
          </div>

          <div *ngIf="alert.threshold && alert.currentValue" class="threshold-info">
            <span class="current-value">Current: {{ alert.currentValue }}</span>
            <span class="threshold-value">Threshold: {{ alert.threshold }}</span>
          </div>
        </div>

        <div class="alert-actions" *ngIf="showResolveAction">
          <button mat-icon-button 
                  (click)="resolveAlert(alert)"
                  [disabled]="resolvingAlerts.has(alert.id)"
                  matTooltip="Mark as resolved">
            <mat-icon *ngIf="!resolvingAlerts.has(alert.id)">check</mat-icon>
            <mat-spinner *ngIf="resolvingAlerts.has(alert.id)" diameter="20"></mat-spinner>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alerts-panel {
      max-height: 400px;
      overflow-y: auto;
    }

    .no-alerts {
      text-align: center;
      padding: 2rem;
      color: #666;
      
      mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        color: #4CAF50;
        margin-bottom: 1rem;
      }
      
      p {
        margin: 0 0 0.5rem 0;
        font-weight: 500;
      }
      
      small {
        color: #999;
      }
    }

    .alert-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      border-left: 4px solid;
      background-color: #f8f9fa;
      transition: background-color 0.2s ease;
      
      &:hover {
        background-color: #f0f1f2;
      }
      
      &.severity-low {
        border-left-color: #4CAF50;
        
        .alert-icon mat-icon {
          color: #4CAF50;
        }
      }
      
      &.severity-medium {
        border-left-color: #FF9800;
        
        .alert-icon mat-icon {
          color: #FF9800;
        }
      }
      
      &.severity-high {
        border-left-color: #F44336;
        
        .alert-icon mat-icon {
          color: #F44336;
        }
      }
      
      &.severity-critical {
        border-left-color: #B71C1C;
        background-color: #FFEBEE;
        
        .alert-icon mat-icon {
          color: #B71C1C;
          animation: pulse 2s infinite;
        }
      }
    }

    .alert-icon {
      flex-shrink: 0;
      
      mat-icon {
        font-size: 1.5rem;
        width: 1.5rem;
        height: 1.5rem;
      }
    }

    .alert-content {
      flex: 1;
      
      .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        
        .alert-type {
          font-weight: 600;
          color: #333;
        }
        
        .alert-time {
          font-size: 0.8rem;
          color: #666;
        }
      }
      
      .alert-message {
        margin-bottom: 0.5rem;
        color: #555;
        line-height: 1.4;
      }
      
      .alert-details {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 0.5rem;
        
        .device-name,
        .location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.85rem;
          color: #666;
          
          mat-icon {
            font-size: 1rem;
            width: 1rem;
            height: 1rem;
          }
        }
      }
      
      .threshold-info {
        display: flex;
        gap: 1rem;
        font-size: 0.8rem;
        color: #777;
        
        .current-value {
          font-weight: 600;
        }
      }
    }

    .alert-actions {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      
      button {
        mat-icon {
          color: #4CAF50;
        }
        
        &:disabled {
          opacity: 0.6;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @media (max-width: 768px) {
      .alert-item {
        flex-direction: column;
        gap: 0.5rem;
        
        .alert-details {
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .alert-actions {
          align-self: flex-end;
        }
      }
    }
  `]
})
export class AlertsPanelComponent {
  @Input() alerts: IoTAlert[] = [];
  @Input() showResolveAction = false;
  @Output() alertResolve = new EventEmitter<string>();

  resolvingAlerts = new Set<string>();

  constructor(private iotService: IoTService) {}

  get sortedAlerts(): IoTAlert[] {
    return [...this.alerts].sort((a, b) => {
      // Sort by severity first, then by timestamp
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const severityDiff = (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                          (severityOrder[a.severity as keyof typeof severityOrder] || 0);
      
      if (severityDiff !== 0) return severityDiff;
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  trackByAlert(index: number, alert: IoTAlert): string {
    return alert.id;
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      LOW: 'info',
      MEDIUM: 'warning',
      HIGH: 'error',
      CRITICAL: 'crisis_alert'
    };
    return icons[severity as keyof typeof icons] || 'info';
  }

  getDeviceIcon(deviceType: string): string {
    const icons = {
      TEMP_SENSOR: 'thermostat',
      GPS_TRACKER: 'gps_fixed',
      SMART_CONTAINER: 'inventory_2',
      FACILITY_MONITOR: 'business'
    };
    return icons[deviceType as keyof typeof icons] || 'device_unknown';
  }

  formatAlertType(alertType: string): string {
    return alertType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  resolveAlert(alert: IoTAlert): void {
    if (this.resolvingAlerts.has(alert.id)) return;
    
    this.resolvingAlerts.add(alert.id);
    
    this.iotService.resolveAlert(alert.id).subscribe({
      next: () => {
        this.resolvingAlerts.delete(alert.id);
        this.alertResolve.emit(alert.id);
      },
      error: (error) => {
        console.error('Error resolving alert:', error);
        this.resolvingAlerts.delete(alert.id);
      }
    });
  }
}