import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IoTDevice } from '../../../shared/services/iot.service';

@Component({
  selector: 'app-device-status',
  template: `
    <div class="device-status-overview">
      <!-- Status Summary -->
      <div class="status-summary">
        <div class="status-item online" (click)="filterByStatus('ONLINE')">
          <div class="status-count">{{ onlineDevices.length }}</div>
          <div class="status-label">Online</div>
        </div>
        
        <div class="status-item warning" (click)="filterByStatus('WARNING')">
          <div class="status-count">{{ warningDevices.length }}</div>
          <div class="status-label">Warning</div>
        </div>
        
        <div class="status-item offline" (click)="filterByStatus('OFFLINE')">
          <div class="status-count">{{ offlineDevices.length }}</div>
          <div class="status-label">Offline</div>
        </div>
      </div>

      <!-- Device List -->
      <div class="device-list">
        <div class="list-header">
          <span>Recent Activity</span>
          <button mat-button class="view-all-btn" (click)="viewAllDevices()">
            View All
          </button>
        </div>

        <div *ngIf="filteredDevices.length === 0" class="no-devices">
          <mat-icon>devices</mat-icon>
          <p>No devices found</p>
        </div>

        <div *ngFor="let device of recentDevices; trackBy: trackByDevice" 
             class="device-item"
             [class]="'status-' + device.status?.toLowerCase()"
             (click)="selectDevice(device)">
          
          <div class="device-icon">
            <mat-icon>{{ getDeviceIcon(device.deviceType) }}</mat-icon>
          </div>

          <div class="device-info">
            <div class="device-name">{{ device.name }}</div>
            <div class="device-details">
              <span class="device-type">{{ formatDeviceType(device.deviceType) }}</span>
              <span class="last-seen">{{ device.lastSeen | relativeDate }}</span>
            </div>
          </div>

          <div class="device-metrics">
            <div *ngIf="device.lastTemperature !== null && device.lastTemperature !== undefined" 
                 class="metric temperature">
              <mat-icon>thermostat</mat-icon>
              <span>{{ device.lastTemperature | number:'1.1-1' }}°C</span>
            </div>
            
            <div *ngIf="device.batteryLevel !== null && device.batteryLevel !== undefined" 
                 class="metric battery"
                 [class.low]="device.batteryLevel! < 20">
              <mat-icon>{{ getBatteryIcon(device.batteryLevel!) }}</mat-icon>
              <span>{{ device.batteryLevel }}%</span>
            </div>
          </div>

          <div class="device-status">
            <div class="status-indicator" [class]="'status-' + device.status?.toLowerCase()"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .device-status-overview {
      .status-summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        
        .status-item {
          text-align: center;
          padding: 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          
          &.online {
            background-color: #E8F5E8;
            color: #2E7D32;
            
            &:hover {
              background-color: #C8E6C9;
            }
          }
          
          &.warning {
            background-color: #FFF3E0;
            color: #F57C00;
            
            &:hover {
              background-color: #FFE0B2;
            }
          }
          
          &.offline {
            background-color: #FFEBEE;
            color: #C62828;
            
            &:hover {
              background-color: #FFCDD2;
            }
          }
          
          .status-count {
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1;
          }
          
          .status-label {
            font-size: 0.8rem;
            margin-top: 0.25rem;
            text-transform: uppercase;
            font-weight: 500;
          }
        }
      }
      
      .device-list {
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          
          span {
            font-weight: 600;
            color: #333;
          }
          
          .view-all-btn {
            font-size: 0.85rem;
          }
        }
        
        .no-devices {
          text-align: center;
          padding: 2rem;
          color: #666;
          
          mat-icon {
            font-size: 2.5rem;
            width: 2.5rem;
            height: 2.5rem;
            margin-bottom: 1rem;
            opacity: 0.5;
          }
          
          p {
            margin: 0;
          }
        }
        
        .device-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: background-color 0.2s ease;
          
          &:hover {
            background-color: #f5f5f5;
          }
          
          &.status-online {
            border-left: 3px solid #4CAF50;
          }
          
          &.status-warning {
            border-left: 3px solid #FF9800;
          }
          
          &.status-offline {
            border-left: 3px solid #F44336;
          }
          
          .device-icon {
            flex-shrink: 0;
            
            mat-icon {
              color: #666;
              font-size: 1.25rem;
              width: 1.25rem;
              height: 1.25rem;
            }
          }
          
          .device-info {
            flex: 1;
            min-width: 0;
            
            .device-name {
              font-weight: 500;
              color: #333;
              margin-bottom: 0.25rem;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            .device-details {
              display: flex;
              gap: 0.5rem;
              font-size: 0.8rem;
              color: #666;
              
              .device-type {
                white-space: nowrap;
              }
              
              .last-seen {
                white-space: nowrap;
              }
            }
          }
          
          .device-metrics {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            align-items: flex-end;
            
            .metric {
              display: flex;
              align-items: center;
              gap: 0.25rem;
              font-size: 0.8rem;
              color: #666;
              
              mat-icon {
                font-size: 1rem;
                width: 1rem;
                height: 1rem;
              }
              
              &.temperature {
                color: #2196F3;
              }
              
              &.battery {
                color: #4CAF50;
                
                &.low {
                  color: #F44336;
                }
              }
            }
          }
          
          .device-status {
            flex-shrink: 0;
            
            .status-indicator {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              
              &.status-online {
                background-color: #4CAF50;
              }
              
              &.status-warning {
                background-color: #FF9800;
              }
              
              &.status-offline {
                background-color: #F44336;
              }
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      .device-status-overview {
        .status-summary {
          .status-item {
            padding: 0.75rem;
            
            .status-count {
              font-size: 1.25rem;
            }
          }
        }
        
        .device-list .device-item {
          .device-metrics {
            display: none;
          }
        }
      }
    }
  `]
})
export class DeviceStatusComponent {
  @Input() devices: IoTDevice[] = [];
  @Output() deviceSelect = new EventEmitter<IoTDevice>();

  selectedFilter: string | null = null;

  get onlineDevices(): IoTDevice[] {
    return this.devices.filter(d => d.status === 'ONLINE');
  }

  get warningDevices(): IoTDevice[] {
    return this.devices.filter(d => d.status === 'WARNING');
  }

  get offlineDevices(): IoTDevice[] {
    return this.devices.filter(d => d.status === 'OFFLINE');
  }

  get filteredDevices(): IoTDevice[] {
    if (!this.selectedFilter) return this.devices;
    return this.devices.filter(d => d.status === this.selectedFilter);
  }

  get recentDevices(): IoTDevice[] {
    return this.filteredDevices
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 5);
  }

  trackByDevice(index: number, device: IoTDevice): string {
    return device.id;
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

  getBatteryIcon(batteryLevel: number): string {
    if (batteryLevel > 75) return 'battery_full';
    if (batteryLevel > 50) return 'battery_3_bar';
    if (batteryLevel > 25) return 'battery_2_bar';
    if (batteryLevel > 10) return 'battery_1_bar';
    return 'battery_alert';
  }

  formatDeviceType(deviceType: string): string {
    return deviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  filterByStatus(status: string): void {
    this.selectedFilter = this.selectedFilter === status ? null : status;
  }

  selectDevice(device: IoTDevice): void {
    this.deviceSelect.emit(device);
  }

  viewAllDevices(): void {
    // Emit event to show all devices or navigate to devices page
    console.log('View all devices clicked');
  }
}