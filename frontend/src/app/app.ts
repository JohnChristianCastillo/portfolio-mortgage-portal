import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HealthService } from './core/health.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Mortgage Borrower Portal');
  protected readonly backendStatus = signal<'checking' | 'ok' | 'unreachable'>('checking');

  constructor(private readonly health: HealthService) {}

  ngOnInit(): void {
    this.health.check().subscribe({
      next: () => this.backendStatus.set('ok'),
      error: () => this.backendStatus.set('unreachable')
    });
  }
}
