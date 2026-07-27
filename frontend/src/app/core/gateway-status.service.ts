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
    // Built as an absolute origin+path URL, deliberately NOT a plain relative
    // "/status": this page's <base href="/mortgage/"> gets prepended to
    // relative paths (confirmed against the real deployment - it is not just
    // asset tags, HttpClient calls get it too), which would send this through
    // the /mortgage/* app proxy to OUR OWN backend instead of the gateway's
    // real top-level /status route. GatewayService's wsUrl() sidesteps the
    // same trap the same way.
    const url = `${window.location.protocol}//${window.location.host}/status`;
    this.http.get<GatewayStatus>(url).subscribe({
      next: (status) => this.status.set(status),
      error: () => {
        // Transient - the next poll will retry. Not worth surfacing to the user.
      },
    });
  }
}
