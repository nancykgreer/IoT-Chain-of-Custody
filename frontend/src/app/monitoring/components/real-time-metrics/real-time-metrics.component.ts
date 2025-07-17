import { Component, Input } from '@angular/core';
import { IoTAnalytics } from '../../../shared/services/iot.service';

@Component({
  selector: 'app-real-time-metrics',
  template: `
    <div class="metrics-container">
      <div class="metric-card devices">
        <div class="metric-icon">
          <mat-icon>devices</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ devicesCount }}</div>
          <div class="metric-label">Total Devices</div>
          <div class="metric-status">
            <span class="online">{{ onlineCount }} online</span>
            <span class="offline">{{ devicesCount - onlineCount }} offline</span>
          </div>
        </div>
      </div>

      <div class="metric-card readings">
        <div class="metric-icon">
          <mat-icon>trending_up</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ analytics?.totalReadings || 0 | number }}</div>
          <div class="metric-label">Readings ({{ analytics?.timeframe || '24h' }})</div>
          <div class="metric-status">
            <span>{{ getReadingsRate() }} per hour</span>
          </div>
        </div>
      </div>

      <div class="metric-card alerts" [class.critical]="criticalAlerts > 0">
        <div class="metric-icon">
          <mat-icon>{{ criticalAlerts > 0 ? 'crisis_alert' : 'notifications' }}</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ alertsCount }}</div>
          <div class="metric-label">Active Alerts</div>
          <div class="metric-status" *ngIf="criticalAlerts > 0">
            <span class="critical">{{ criticalAlerts }} critical</span>
          </div>
        </div>
      </div>

      <div class="metric-card temperature">
        <div class="metric-icon">
          <mat-icon>thermostat</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            {{ analytics?.averageTemperature ? (analytics.averageTemperature + '°C') : 'N/A' }}
          </div>
          <div class="metric-label">Avg Temperature</div>
          <div class="metric-status">
            <span>{{ getTemperatureStatus() }}</span>
          </div>
        </div>
      </div>

      <div class="metric-card humidity">
        <div class="metric-icon">
          <mat-icon>water_drop</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">
            {{ analytics?.averageHumidity ? (analytics.averageHumidity + '%') : 'N/A' }}
          </div>
          <div class="metric-label">Avg Humidity</div>
          <div class="metric-status">
            <span>{{ getHumidityStatus() }}</span>
          </div>
        </div>
      </div>

      <div class="metric-card uptime">
        <div class="metric-icon">
          <mat-icon>schedule</mat-icon>
        </div>
        <div class="metric-content">
          <div class="metric-value">{{ analytics?.onlinePercentage || 0 }}%</div>
          <div class="metric-label">Network Uptime</div>
          <div class="metric-status">
            <span>{{ getUptimeStatus() }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .metrics-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }
      
      &.critical {
        border-left: 4px solid #F44336;
        
        .metric-icon mat-icon {
          color: #F44336;
          animation: pulse 2s infinite;
        }
      }
    }

    .metric-icon {
      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
        color: #2196F3;
      }
    }

    .metric-content {
      flex: 1;
    }

    .metric-value {
      font-size: 1.8rem;
      font-weight: 700;
      color: #333;
      line-height: 1;
    }

    .metric-label {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.25rem;
      text-transform: uppercase;
      font-weight: 500;
    }

    .metric-status {
      font-size: 0.8rem;
      margin-top: 0.5rem;
      
      span {
        &.online {
          color: #4CAF50;
        }
        
        &.offline {
          color: #F44336;
        }
        
        &.critical {
          color: #F44336;
          font-weight: 600;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @media (max-width: 768px) {
      .metrics-container {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 0.5rem;
      }
      
      .metric-card {
        padding: 1rem;
        
        .metric-value {
          font-size: 1.4rem;
        }
      }
    }
  `]
})
export class RealTimeMetricsComponent {
  @Input() analytics: IoTAnalytics | null = null;
  @Input() devicesCount: number = 0;
  @Input() onlineCount: number = 0;
  @Input() alertsCount: number = 0;
  @Input() criticalAlerts: number = 0;

  getReadingsRate(): string {
    if (!this.analytics?.totalReadings) return '0';
    
    const hours = this.getTimeframeHours();
    const rate = Math.round(this.analytics.totalReadings / hours);
    return rate.toString();
  }

  getTemperatureStatus(): string {
    if (!this.analytics?.averageTemperature) return 'No data';
    
    const temp = parseFloat(this.analytics.averageTemperature);
    if (temp < 2) return 'Too Cold';
    if (temp > 8) return 'Too Warm';
    return 'Normal';
  }

  getHumidityStatus(): string {
    if (!this.analytics?.averageHumidity) return 'No data';
    
    const humidity = parseFloat(this.analytics.averageHumidity);
    if (humidity > 80) return 'High';
    if (humidity < 30) return 'Low';
    return 'Normal';
  }

  getUptimeStatus(): string {
    if (!this.analytics?.onlinePercentage) return 'Unknown';
    
    const uptime = parseFloat(this.analytics.onlinePercentage);
    if (uptime >= 95) return 'Excellent';
    if (uptime >= 85) return 'Good';
    if (uptime >= 70) return 'Fair';
    return 'Poor';
  }

  private getTimeframeHours(): number {
    switch (this.analytics?.timeframe) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }
}