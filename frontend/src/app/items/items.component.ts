import { Component } from '@angular/core';

@Component({
  selector: 'app-items',
  template: `
    <div class="items-container">
      <h1>Items Management</h1>
      <p>Item tracking and management interface coming soon...</p>
    </div>
  `,
  styles: [`
    .items-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class ItemsComponent { }