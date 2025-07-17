import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="welcome-section">
        <h1>Welcome, {{ currentUser?.firstName }}!</h1>
        <p>Healthcare Chain of Custody Dashboard</p>
      </div>
      
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">0</div>
            <div class="stat-label">Active Items</div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">0</div>
            <div class="stat-label">In Transit</div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">0</div>
            <div class="stat-label">Transfers Today</div>
          </mat-card-content>
        </mat-card>
        
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-number">0</div>
            <div class="stat-label">Alerts</div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .welcome-section {
      margin-bottom: 2rem;
      
      h1 {
        margin: 0 0 0.5rem 0;
        color: #333;
      }
      
      p {
        margin: 0;
        color: #666;
      }
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      text-align: center;
      
      .stat-number {
        font-size: 2rem;
        font-weight: bold;
        color: #2196F3;
      }
      
      .stat-label {
        color: #666;
        text-transform: uppercase;
        font-size: 0.9rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: any;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }
}