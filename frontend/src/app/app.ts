import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { HealthService } from './core/health.service';
import { AuthService } from './core/auth.service';
import { GatewayService } from './core/gateway.service';
import { GatewayStatusService } from './core/gateway-status.service';
import { GateComponent } from './gate/gate.component';
import { TierBadgeComponent } from './shared/tier-badge.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, GateComponent, TierBadgeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly health = inject(HealthService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly gateway = inject(GatewayService);
  protected readonly gatewayStatus = inject(GatewayStatusService);

  protected readonly title = signal('Mortgage Borrower Portal');
  protected readonly backendStatus = signal<'checking' | 'ok' | 'unreachable'>('checking');

  constructor() {
    // Only meaningful behind the real gateway, and only once admitted - /status
    // is public but there is nothing useful to poll in local dev or pre-admission.
    effect(() => {
      if (this.gateway.enabled && this.gateway.state() === 'admitted') {
        this.gatewayStatus.startPolling();
      }
    });
  }

  ngOnInit(): void {
    this.health.check().subscribe({
      next: () => this.backendStatus.set('ok'),
      error: () => this.backendStatus.set('unreachable')
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
