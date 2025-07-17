import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';
import { WebSocketService } from '../../../shared/services/websocket.service';
import { IoTService, SensorReading } from '../../../shared/services/iot.service';

// Register Chart.js components
Chart.register(...registerables);

interface ChartDataPoint {
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
}

@Component({
  selector: 'app-environmental-charts',
  template: `
    <div class="environmental-charts">
      <!-- Chart Controls -->
      <div class="chart-controls">
        <mat-form-field appearance="outline">
          <mat-label>Time Range</mat-label>
          <mat-select [(value)]="timeRange" (selectionChange)="onTimeRangeChange()">
            <mat-option value="1h">Last Hour</mat-option>
            <mat-option value="6h">Last 6 Hours</mat-option>
            <mat-option value="24h">Last 24 Hours</mat-option>
            <mat-option value="7d">Last 7 Days</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" *ngIf="devices.length > 0">
          <mat-label>Device Filter</mat-label>
          <mat-select [(value)]="selectedDeviceId" (selectionChange)="onDeviceChange()">
            <mat-option value="">All Devices</mat-option>
            <mat-option *ngFor="let device of devices" [value]="device.id">
              {{ device.name }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-icon-button 
                (click)="refreshData()"
                [disabled]="isLoading"
                matTooltip="Refresh Data">
          <mat-icon [class.spinning]="isLoading">refresh</mat-icon>
        </button>

        <button mat-icon-button
                (click)="exportData()"
                matTooltip="Export Data">
          <mat-icon>download</mat-icon>
        </button>
      </div>

      <!-- Charts Grid -->
      <div class="charts-grid">
        <!-- Temperature Chart -->
        <mat-card class="chart-card temperature-chart">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>thermostat</mat-icon>
              Temperature Trends
            </mat-card-title>
            <mat-card-subtitle>
              Current: {{ currentTemperature | number:'1.1-1' }}°C
              <span class="trend" [class]="getTemperatureTrend()">
                <mat-icon>{{ getTemperatureTrendIcon() }}</mat-icon>
              </span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas #temperatureChart></canvas>
            </div>
            <div class="chart-stats">
              <div class="stat">
                <span class="stat-label">Min</span>
                <span class="stat-value">{{ temperatureStats.min | number:'1.1-1' }}°C</span>
              </div>
              <div class="stat">
                <span class="stat-label">Max</span>
                <span class="stat-value">{{ temperatureStats.max | number:'1.1-1' }}°C</span>
              </div>
              <div class="stat">
                <span class="stat-label">Avg</span>
                <span class="stat-value">{{ temperatureStats.avg | number:'1.1-1' }}°C</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Humidity Chart -->
        <mat-card class="chart-card humidity-chart">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>water_drop</mat-icon>
              Humidity Levels
            </mat-card-title>
            <mat-card-subtitle>
              Current: {{ currentHumidity | number:'1.1-1' }}%
              <span class="trend" [class]="getHumidityTrend()">
                <mat-icon>{{ getHumidityTrendIcon() }}</mat-icon>
              </span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas #humidityChart></canvas>
            </div>
            <div class="chart-stats">
              <div class="stat">
                <span class="stat-label">Min</span>
                <span class="stat-value">{{ humidityStats.min | number:'1.1-1' }}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Max</span>
                <span class="stat-value">{{ humidityStats.max | number:'1.1-1' }}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Avg</span>
                <span class="stat-value">{{ humidityStats.avg | number:'1.1-1' }}%</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Pressure Chart -->
        <mat-card class="chart-card pressure-chart" *ngIf="showPressure">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>speed</mat-icon>
              Atmospheric Pressure
            </mat-card-title>
            <mat-card-subtitle>
              Current: {{ currentPressure | number:'1.1-1' }} hPa
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas #pressureChart></canvas>
            </div>
            <div class="chart-stats">
              <div class="stat">
                <span class="stat-label">Min</span>
                <span class="stat-value">{{ pressureStats.min | number:'1.1-1' }} hPa</span>
              </div>
              <div class="stat">
                <span class="stat-label">Max</span>
                <span class="stat-value">{{ pressureStats.max | number:'1.1-1' }} hPa</span>
              </div>
              <div class="stat">
                <span class="stat-label">Avg</span>
                <span class="stat-value">{{ pressureStats.avg | number:'1.1-1' }} hPa</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Combined Overview Chart -->
        <mat-card class="chart-card overview-chart full-width">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>insights</mat-icon>
              Environmental Overview
            </mat-card-title>
            <mat-card-subtitle>
              Temperature, Humidity & Pressure Correlation
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container large">
              <canvas #overviewChart></canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- No Data State -->
      <div *ngIf="chartData.length === 0 && !isLoading" class="no-data">
        <mat-icon>show_chart</mat-icon>
        <h3>No Environmental Data</h3>
        <p>Environmental data will appear here when IoT sensors start reporting</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-overlay">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Loading environmental data...</p>
      </div>
    </div>
  `,
  styles: [`
    .environmental-charts {
      .chart-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;

        mat-form-field {
          min-width: 180px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;

        .full-width {
          grid-column: 1 / -1;
        }

        .chart-card {
          min-height: 400px;

          &.overview-chart {
            min-height: 500px;
          }

          mat-card-header {
            mat-card-title {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              color: #333;

              mat-icon {
                color: #2196F3;
              }
            }

            mat-card-subtitle {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin-top: 0.5rem;

              .trend {
                display: flex;
                align-items: center;

                &.up {
                  color: #F44336;
                }

                &.down {
                  color: #4CAF50;
                }

                &.stable {
                  color: #666;
                }

                mat-icon {
                  font-size: 1rem;
                  width: 1rem;
                  height: 1rem;
                }
              }
            }
          }

          mat-card-content {
            .chart-container {
              position: relative;
              height: 250px;
              margin-bottom: 1rem;

              &.large {
                height: 350px;
              }

              canvas {
                max-width: 100%;
                max-height: 100%;
              }
            }

            .chart-stats {
              display: flex;
              justify-content: space-around;
              padding-top: 1rem;
              border-top: 1px solid #e0e0e0;

              .stat {
                text-align: center;

                .stat-label {
                  display: block;
                  font-size: 0.8rem;
                  color: #666;
                  text-transform: uppercase;
                  margin-bottom: 0.25rem;
                }

                .stat-value {
                  font-size: 1.1rem;
                  font-weight: 600;
                  color: #333;
                }
              }
            }
          }
        }
      }

      .no-data,
      .loading-overlay {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem;
        color: #666;

        mat-icon {
          font-size: 4rem;
          width: 4rem;
          height: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        p {
          margin: 0;
          text-align: center;
        }
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        z-index: 10;
      }
    }

    @media (max-width: 768px) {
      .environmental-charts {
        .chart-controls {
          flex-direction: column;
          align-items: stretch;

          mat-form-field {
            min-width: auto;
          }
        }

        .charts-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  `]
})
export class EnvironmentalChartsComponent implements OnInit, OnDestroy {
  @Input() devices: any[] = [];
  @Input() showPressure = true;

  @ViewChild('temperatureChart') temperatureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('humidityChart') humidityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pressureChart') pressureCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overviewChart') overviewCanvas!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private charts: Chart[] = [];

  timeRange = '24h';
  selectedDeviceId = '';
  isLoading = false;
  chartData: ChartDataPoint[] = [];

  // Current values
  currentTemperature = 0;
  currentHumidity = 0;
  currentPressure = 0;

  // Statistics
  temperatureStats = { min: 0, max: 0, avg: 0 };
  humidityStats = { min: 0, max: 0, avg: 0 };
  pressureStats = { min: 0, max: 0, avg: 0 };

  // Previous values for trend calculation
  private previousTemperature = 0;
  private previousHumidity = 0;

  constructor(
    private iotService: IoTService,
    private websocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadChartData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is ready
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  private setupRealTimeUpdates(): void {
    // Listen for real-time sensor data
    this.websocketService.on('sensor:data').pipe(
      takeUntil(this.destroy$)
    ).subscribe((data: any) => {
      this.updateRealTimeData(data);
    });
  }

  private updateRealTimeData(data: any): void {
    if (this.selectedDeviceId && data.deviceId !== this.selectedDeviceId) {
      return; // Filter by selected device
    }

    // Store previous values for trend calculation
    this.previousTemperature = this.currentTemperature;
    this.previousHumidity = this.currentHumidity;

    // Update current values
    if (data.temperature !== undefined) this.currentTemperature = data.temperature;
    if (data.humidity !== undefined) this.currentHumidity = data.humidity;
    if (data.pressure !== undefined) this.currentPressure = data.pressure;

    // Add new data point
    const newDataPoint: ChartDataPoint = {
      timestamp: data.timestamp || new Date().toISOString(),
      temperature: data.temperature,
      humidity: data.humidity,
      pressure: data.pressure
    };

    this.chartData.push(newDataPoint);

    // Keep only last N points based on time range
    const maxPoints = this.getMaxDataPoints();
    if (this.chartData.length > maxPoints) {
      this.chartData = this.chartData.slice(-maxPoints);
    }

    // Update charts
    this.updateCharts();
    this.calculateStats();
  }

  private loadChartData(): void {
    this.isLoading = true;
    
    const params: any = {
      timeframe: this.timeRange,
      limit: this.getMaxDataPoints()
    };

    if (this.selectedDeviceId) {
      params.deviceId = this.selectedDeviceId;
    }

    this.iotService.getSensorReadings(params).subscribe({
      next: (readings: SensorReading[]) => {
        this.chartData = readings.map(reading => ({
          timestamp: reading.timestamp,
          temperature: reading.temperature || undefined,
          humidity: reading.humidity || undefined,
          pressure: reading.pressure || undefined
        }));

        // Set current values from latest reading
        const latest = readings[readings.length - 1];
        if (latest) {
          this.currentTemperature = latest.temperature || 0;
          this.currentHumidity = latest.humidity || 0;
          this.currentPressure = latest.pressure || 0;
        }

        this.calculateStats();
        this.initializeCharts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chart data:', error);
        this.isLoading = false;
      }
    });
  }

  private getMaxDataPoints(): number {
    switch (this.timeRange) {
      case '1h': return 60; // 1 point per minute
      case '6h': return 72; // 1 point per 5 minutes
      case '24h': return 144; // 1 point per 10 minutes
      case '7d': return 168; // 1 point per hour
      default: return 144;
    }
  }

  private calculateStats(): void {
    const temperatures = this.chartData.map(d => d.temperature).filter(t => t !== undefined) as number[];
    const humidities = this.chartData.map(d => d.humidity).filter(h => h !== undefined) as number[];
    const pressures = this.chartData.map(d => d.pressure).filter(p => p !== undefined) as number[];

    this.temperatureStats = this.calculateMetricStats(temperatures);
    this.humidityStats = this.calculateMetricStats(humidities);
    this.pressureStats = this.calculateMetricStats(pressures);
  }

  private calculateMetricStats(values: number[]): { min: number; max: number; avg: number } {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return { min, max, avg };
  }

  private initializeCharts(): void {
    this.destroyCharts();

    if (this.temperatureCanvas) {
      this.createTemperatureChart();
    }
    if (this.humidityCanvas) {
      this.createHumidityChart();
    }
    if (this.pressureCanvas && this.showPressure) {
      this.createPressureChart();
    }
    if (this.overviewCanvas) {
      this.createOverviewChart();
    }
  }

  private createTemperatureChart(): void {
    const ctx = this.temperatureCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [{
          label: 'Temperature (°C)',
          data: this.chartData.map(d => d.temperature),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6
        }]
      },
      options: this.getChartOptions('Temperature (°C)', true)
    });

    this.charts.push(chart);
  }

  private createHumidityChart(): void {
    const ctx = this.humidityCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [{
          label: 'Humidity (%)',
          data: this.chartData.map(d => d.humidity),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6
        }]
      },
      options: this.getChartOptions('Humidity (%)', true)
    });

    this.charts.push(chart);
  }

  private createPressureChart(): void {
    const ctx = this.pressureCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [{
          label: 'Pressure (hPa)',
          data: this.chartData.map(d => d.pressure),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6
        }]
      },
      options: this.getChartOptions('Pressure (hPa)', true)
    });

    this.charts.push(chart);
  }

  private createOverviewChart(): void {
    const ctx = this.overviewCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.map(d => new Date(d.timestamp).toLocaleTimeString()),
        datasets: [
          {
            label: 'Temperature (°C)',
            data: this.chartData.map(d => d.temperature),
            borderColor: '#2196F3',
            backgroundColor: 'transparent',
            yAxisID: 'y'
          },
          {
            label: 'Humidity (%)',
            data: this.chartData.map(d => d.humidity),
            borderColor: '#4CAF50',
            backgroundColor: 'transparent',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Humidity (%)'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });

    this.charts.push(chart);
  }

  private getChartOptions(yAxisLabel: string, showThresholds = false): ChartConfiguration['options'] {
    const options: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yAxisLabel
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    };

    // Add threshold lines for temperature
    if (showThresholds && yAxisLabel.includes('Temperature')) {
      options.plugins!.annotation = {
        annotations: {
          line1: {
            type: 'line',
            yMin: 2,
            yMax: 2,
            borderColor: '#F44336',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              content: 'Min Threshold (2°C)',
              enabled: true,
              position: 'start'
            }
          },
          line2: {
            type: 'line',
            yMin: 8,
            yMax: 8,
            borderColor: '#F44336',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              content: 'Max Threshold (8°C)',
              enabled: true,
              position: 'start'
            }
          }
        }
      };
    }

    return options;
  }

  private updateCharts(): void {
    const labels = this.chartData.map(d => new Date(d.timestamp).toLocaleTimeString());

    this.charts.forEach((chart, index) => {
      chart.data.labels = labels;
      
      switch (index) {
        case 0: // Temperature chart
          chart.data.datasets[0].data = this.chartData.map(d => d.temperature);
          break;
        case 1: // Humidity chart
          chart.data.datasets[0].data = this.chartData.map(d => d.humidity);
          break;
        case 2: // Pressure chart
          chart.data.datasets[0].data = this.chartData.map(d => d.pressure);
          break;
        case 3: // Overview chart
          chart.data.datasets[0].data = this.chartData.map(d => d.temperature);
          chart.data.datasets[1].data = this.chartData.map(d => d.humidity);
          break;
      }
      
      chart.update('none'); // Update without animation for real-time
    });
  }

  private destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  onTimeRangeChange(): void {
    this.loadChartData();
  }

  onDeviceChange(): void {
    this.loadChartData();
  }

  refreshData(): void {
    this.loadChartData();
  }

  exportData(): void {
    const csvData = this.chartData.map(d => ({
      timestamp: d.timestamp,
      temperature: d.temperature || '',
      humidity: d.humidity || '',
      pressure: d.pressure || ''
    }));

    const csv = [
      ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)'],
      ...csvData.map(d => [d.timestamp, d.temperature, d.humidity, d.pressure])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `environmental-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  getTemperatureTrend(): string {
    const diff = this.currentTemperature - this.previousTemperature;
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  getTemperatureTrendIcon(): string {
    const trend = this.getTemperatureTrend();
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getHumidityTrend(): string {
    const diff = this.currentHumidity - this.previousHumidity;
    if (Math.abs(diff) < 1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  getHumidityTrendIcon(): string {
    const trend = this.getHumidityTrend();
    switch (trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      default: return 'trending_flat';
    }
  }
}