// Single source of truth for the JWT's localStorage key, shared by AuthService
// (writes on login/logout) and authInterceptor (reads on every request) so
// they can never drift apart.
const TOKEN_KEY = 'mortgage_portal_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
