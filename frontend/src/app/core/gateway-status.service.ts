import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface GatewayStatus {
  maintenance: boolean;
  active: { anonymous: number; invited: number; total: number };
  capacity: { anonymous: number; invited: number; invite_link_max_concurrent: number };
  queue: { anonymous: number; invited: number };
}

/**
 * Polls the gateway's public /status snapshot (no session needed), mirroring
 * the trading-helper app's own "poll the gateway load" behavior. This is a
 * gateway-wide count shared across every app riding the default admission
 * policy (this app has no app_policy row of its own, same as job-compass),
 * not a per-app number - same caveat trading-helper's own status view has.
 */
@Injectable({ providedIn: 'root' })
export class GatewayStatusService {
  private readonly http = inject(HttpClient);
  readonly status = signal<GatewayStatus | null>(null);

  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  startPolling(): void {
    if (this.intervalHandle !== null) return;
    this.refresh();
    this.intervalHandle = setInterval(() => this.refresh(), 5000);
  }

  stopPolling(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private refresh(): void {
    // Deliberately a LEADING-slash path here, the opposite of this app's own
    // api/* calls: a reference starting with "/" resolves against the origin
    // and skips <base href="/mortgage/"> entirely, which is exactly what is
    // wanted for the gateway's own top-level /status route (not proxied
    // per-app). A relative "status" (no leading slash) would instead resolve
    // under /mortgage/ and get misrouted through the app proxy to this app's
    // own backend, which has no such route.
    this.http.get<GatewayStatus>('/status').subscribe({
      next: (status) => this.status.set(status),
      error: () => {
        // Transient - the next poll will retry. Not worth surfacing to the user.
      },
    });
  }
}
