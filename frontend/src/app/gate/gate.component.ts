import { Component, computed, inject } from '@angular/core';

import { GatewayService } from '../core/gateway.service';

interface GateContent {
  title: string;
  detail: string;
  spin: boolean;
}

function contentFor(state: string, position: number | null): GateContent {
  switch (state) {
    case 'connecting':
      return { title: 'Connecting...', detail: 'Reaching the server.', spin: true };
    case 'offline':
      return {
        title: 'App is warming up',
        detail: 'The app is starting or briefly offline. Retrying automatically.',
        spin: true,
      };
    case 'queued':
      return {
        title: `You are #${position ?? '-'} in line`,
        detail: 'You will join automatically when a slot frees up.',
        spin: true,
      };
    case 'maintenance':
      return {
        title: 'Back soon',
        detail: 'The app is in maintenance mode. Please check back shortly.',
        spin: false,
      };
    case 'expired':
      return {
        title: 'Session ended',
        detail: 'Your session reached its time limit.',
        spin: false,
      };
    default:
      return { title: '', detail: '', spin: false };
  }
}

/** Shown instead of the app while the gateway hasn't admitted this session yet. */
@Component({
  selector: 'app-gate',
  standalone: true,
  templateUrl: './gate.component.html',
  styleUrl: './gate.component.css',
})
export class GateComponent {
  protected readonly gateway = inject(GatewayService);

  protected readonly content = computed(() => contentFor(this.gateway.state(), this.gateway.position()));

  rejoin(): void {
    window.location.reload();
  }
}
