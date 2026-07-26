import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthStatus {
  status: string;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  constructor(private readonly http: HttpClient) {}

  check(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>('/api/health');
  }
}
