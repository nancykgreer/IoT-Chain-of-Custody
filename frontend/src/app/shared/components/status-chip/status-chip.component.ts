import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-chip',
  template: `
    <span class="status-chip" [ngClass]="getStatusClass()">
      {{ status }}
    </span>
  `,
  styles: [`
    .status-chip {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .status-collected { background-color: #E8F5E8; color: #2E7D32; }
    .status-in-transit { background-color: #FFF3E0; color: #F57C00; }
    .status-received { background-color: #E3F2FD; color: #1976D2; }
    .status-processing { background-color: #F3E5F5; color: #7B1FA2; }
    .status-stored { background-color: #E8EAF6; color: #3F51B5; }
    .status-tested { background-color: #E0F2F1; color: #00695C; }
    .status-disposed { background-color: #F5F5F5; color: #616161; }
    .status-expired { background-color: #FFEBEE; color: #C62828; }
    .status-quarantined { background-color: #FFF8E1; color: #FF8F00; }
    .status-default { background-color: #F5F5F5; color: #666; }
  `]
})
export class StatusChipComponent {
  @Input() status: string = '';

  getStatusClass(): string {
    const normalizedStatus = this.status.toLowerCase().replace(/[_\s]/g, '-');
    return `status-${normalizedStatus}` || 'status-default';
  }
}