import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthStatus {
  status: string;
}

/**
 * Thin wrapper around GET /health, used to show backend reachability in the
 * shell. Deliberately NOT under /api: the gateway only gates /api/* behind an
 * admitted session, and a health check must work before any session exists.
 */
@Injectable({ providedIn: 'root' })
export class HealthService {
  constructor(private readonly http: HttpClient) {}

  check(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>('/health');
  }
}
