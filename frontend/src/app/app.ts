import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { HealthService } from './core/health.service';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly health = inject(HealthService);
  protected readonly auth = inject(AuthService);

  protected readonly title = signal('Mortgage Borrower Portal');
  protected readonly backendStatus = signal<'checking' | 'ok' | 'unreachable'>('checking');

  ngOnInit(): void {
    this.health.check().subscribe({
      next: () => this.backendStatus.set('ok'),
      error: () => this.backendStatus.set('unreachable')
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
