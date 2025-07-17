import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';

// Components
import { MonitoringDashboardComponent } from './dashboard/monitoring-dashboard.component';
import { DeviceListComponent } from './components/device-list/device-list.component';
import { DeviceDetailComponent } from './components/device-detail/device-detail.component';
import { AlertsPanelComponent } from './components/alerts-panel/alerts-panel.component';
import { EnvironmentalChartComponent } from './components/environmental-chart/environmental-chart.component';
import { DeviceStatusComponent } from './components/device-status/device-status.component';
import { RealTimeMetricsComponent } from './components/real-time-metrics/real-time-metrics.component';

const routes: Routes = [
  {
    path: '',
    component: MonitoringDashboardComponent
  },
  {
    path: 'device/:deviceId',
    component: DeviceDetailComponent
  }
];

@NgModule({
  declarations: [
    MonitoringDashboardComponent,
    DeviceListComponent,
    DeviceDetailComponent,
    AlertsPanelComponent,
    EnvironmentalChartComponent,
    DeviceStatusComponent,
    RealTimeMetricsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class MonitoringModule { }