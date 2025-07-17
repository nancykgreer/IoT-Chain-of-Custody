import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-compliance-indicator',
  template: `
    <div class="compliance-indicators">
      <span *ngFor="let flag of flags" 
            class="compliance-indicator" 
            [ngClass]="getIndicatorClass(flag)"
            [matTooltip]="getTooltip(flag)">
        <mat-icon>{{ getIcon(flag) }}</mat-icon>
        {{ getLabel(flag) }}
      </span>
    </div>
  `,
  styles: [`
    .compliance-indicators {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .compliance-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
      
      &.hipaa {
        background-color: #E3F2FD;
        color: #1976D2;
      }
      
      &.gdpr {
        background-color: #F3E5F5;
        color: #7B1FA2;
      }
      
      &.critical {
        background-color: #FFEBEE;
        color: #C62828;
      }
      
      &.security {
        background-color: #FFF3E0;
        color: #F57C00;
      }
    }
  `]
})
export class ComplianceIndicatorComponent {
  @Input() flags: string[] = [];

  getIndicatorClass(flag: string): string {
    switch (flag.toLowerCase()) {
      case 'hipaa_patient_data':
        return 'hipaa';
      case 'gdpr_personal_data':
        return 'gdpr';
      case 'critical_operation':
        return 'critical';
      case 'security_violation':
        return 'security';
      default:
        return 'default';
    }
  }

  getIcon(flag: string): string {
    switch (flag.toLowerCase()) {
      case 'hipaa_patient_data':
        return 'local_hospital';
      case 'gdpr_personal_data':
        return 'privacy_tip';
      case 'critical_operation':
        return 'warning';
      case 'security_violation':
        return 'security';
      default:
        return 'info';
    }
  }

  getLabel(flag: string): string {
    switch (flag.toLowerCase()) {
      case 'hipaa_patient_data':
        return 'HIPAA';
      case 'gdpr_personal_data':
        return 'GDPR';
      case 'critical_operation':
        return 'Critical';
      case 'security_violation':
        return 'Security';
      default:
        return flag.replace(/_/g, ' ').toUpperCase();
    }
  }

  getTooltip(flag: string): string {
    switch (flag.toLowerCase()) {
      case 'hipaa_patient_data':
        return 'Contains protected health information (PHI)';
      case 'gdpr_personal_data':
        return 'Processes personal data under GDPR';
      case 'critical_operation':
        return 'Critical healthcare operation';
      case 'security_violation':
        return 'Security policy violation detected';
      default:
        return 'Compliance flag: ' + flag;
    }
  }
}