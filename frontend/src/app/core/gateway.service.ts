import { Injectable, signal } from '@angular/core';

const APP_SLUG = 'mortgage';

// Admission is only meaningful behind the gateway (production). In local dev
// there is no gateway - ng serve's own proxy talks straight to the backend -
// so this stays a no-op there. Reuses the same signal the base-href fix
// already gives us for free: only the gateway serves this app under
// /mortgage/, ng serve always serves it at "/".
const ENABLED = typeof document !== 'undefined' && document.baseURI.includes('/mortgage/');

export type GateState = 'connecting' | 'queued' | 'admitted' | 'maintenance' | 'offline' | 'expired';

type ServerMsg =
  | { type: 'queued'; position: number; eta_seconds: number }
  | { type: 'admitted'; session_id: string; tier: string; heartbeat_interval_seconds: number }
  | { type: 'maintenance' }
  | { type: 'expired'; reason?: string }
  | { type: 'error'; reason?: string };

const RECONNECT_MS = 4000;

/**
 * Gateway admission handshake, mirroring the pattern already used by the
 * other apps in this stack (see portfolio-trading-helper/frontend/src/
 * useGateway.ts and portfolio-bartender's equivalent): open the gateway's
 * /ws?app=mortgage socket, track queued/admitted state, hold the slot with
 * heartbeats, and reconnect on drops. Every /api/* call is gated behind an
 * admitted session at the gateway - without this handshake the gateway
 * itself 403s every request before it ever reaches this app's backend.
 */
@Injectable({ providedIn: 'root' })
export class GatewayService {
  readonly state = signal<GateState>(ENABLED ? 'connecting' : 'admitted');
  readonly position = signal<number | null>(null);
  readonly sessionId = signal<string | null>(null);
  readonly tier = signal<string | null>(null);

  private ws: WebSocket | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor() {
    if (ENABLED) {
      this.connect();
    }
  }

  private wsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws?app=${APP_SLUG}`;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatHandle !== null) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }
  }

  private connect(): void {
    if (this.disposed) return;
    if (this.state() !== 'admitted') this.state.set('connecting');
    const ws = new WebSocket(this.wsUrl());
    this.ws = ws;

    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'queued') {
        this.state.set('queued');
        this.position.set(msg.position);
      } else if (msg.type === 'admitted') {
        this.state.set('admitted');
        this.sessionId.set(msg.session_id);
        this.tier.set(msg.tier);
        this.position.set(null);
        this.stopHeartbeat();
        const interval = (msg.heartbeat_interval_seconds || 15) * 1000;
        this.heartbeatHandle = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, interval);
      } else if (msg.type === 'maintenance') {
        this.state.set('maintenance');
      } else if (msg.type === 'expired') {
        this.state.set('expired');
        this.sessionId.set(null);
        this.stopHeartbeat();
      }
    };

    ws.onclose = () => {
      this.stopHeartbeat();
      if (this.disposed) return;
      if (this.state() === 'maintenance' || this.state() === 'expired') return;
      this.state.set('offline');
      this.sessionId.set(null);
      this.reconnectHandle = setTimeout(() => this.connect(), RECONNECT_MS);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // onclose handles the resulting state transition
      }
    };
  }
}
