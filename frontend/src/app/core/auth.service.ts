import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { clearStoredToken, getStoredToken, storeToken } from './token-storage';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: number;
  email: string;
}

/**
 * Holds the borrower's JWT and profile in memory, synced with localStorage
 * via token-storage.ts. authInterceptor reads the token independently for
 * outgoing requests; this service is what components read to render login
 * state and to trigger signup/login/logout.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly token = signal<string | null>(getStoredToken());
  readonly currentUser = signal<CurrentUser | null>(null);

  constructor() {
    if (this.token()) {
      this.refreshCurrentUser();
    }
  }

  signup(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>('/api/auth/signup', { email, password })
      .pipe(tap((res) => this.onTokenReceived(res.access_token)));
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.onTokenReceived(res.access_token)));
  }

  logout(): void {
    clearStoredToken();
    this.token.set(null);
    this.currentUser.set(null);
  }

  private onTokenReceived(token: string): void {
    storeToken(token);
    this.token.set(token);
    this.refreshCurrentUser();
  }

  private refreshCurrentUser(): void {
    this.http.get<CurrentUser>('/api/auth/me').subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout(),
    });
  }
}
