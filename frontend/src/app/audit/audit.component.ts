import { Component } from '@angular/core';

@Component({
  selector: 'app-audit',
  template: `
    <div class="audit-container">
      <h1>Audit & Compliance</h1>
      <p>Audit logs and compliance reporting interface coming soon...</p>
    </div>
  `,
  styles: [`
    .audit-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class AuditComponent { }