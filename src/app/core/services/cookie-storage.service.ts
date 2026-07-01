import { inject, Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { AuthUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class CookieStorageService {
  private readonly cookie = inject(CookieService);

  private readonly AUTH_COOKIE = 'tb_auth';
  private readonly USERID_COOKIE = 'tb_userid';
  private readonly BRANCH_COOKIE = 'tb_branch';

  // ADDED:
  // localStorage is better for the full user object because cookies have small size limit.
  private readonly AUTH_STORAGE_KEY = 'tb_auth_user';

  setAuth(user: AuthUser): void {
    const days = 7;

    // ADDED:
    // Save full auth user sa localStorage para dili mawala after refresh.
    this.setLocalAuthUser(user);

    // ADDED:
    // Clear old large auth cookie if naa pa from previous version.
    this.cookie.delete(this.AUTH_COOKIE, '/');

    // Keep small cookies only.
    this.cookie.set(this.USERID_COOKIE, user.userId ?? '', days, '/');
    this.cookie.set(this.BRANCH_COOKIE, user.branch ?? '', days, '/');
  }

  clearAuth(): void {
    // ADDED:
    // Clear localStorage auth.
    this.removeLocalAuthUser();

    this.cookie.delete(this.AUTH_COOKIE, '/');
    this.cookie.delete(this.USERID_COOKIE, '/');
    this.cookie.delete(this.BRANCH_COOKIE, '/');
  }

  getAuthUser(): AuthUser | null {
    // ADDED:
    // First priority: localStorage.
    const localUser = this.getLocalAuthUser();
    if (localUser) return localUser;

    // Fallback:
    // Support old cookie-based saved auth if naa pa.
    const raw = this.cookie.get(this.AUTH_COOKIE);
    if (!raw) return null;

    return this.parseAuthUser(raw);
  }

  getUserId(): string {
    return this.getAuthUser()?.userId ?? this.cookie.get(this.USERID_COOKIE) ?? '';
  }

  getBranch(): string {
    return this.getAuthUser()?.branch ?? this.cookie.get(this.BRANCH_COOKIE) ?? '';
  }

  private setLocalAuthUser(user: AuthUser): void {
    try {
      window.localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Do nothing.
      // If localStorage is blocked, app will simply not restore after refresh.
    }
  }

  private getLocalAuthUser(): AuthUser | null {
    try {
      const raw = window.localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (!raw) return null;

      return this.parseAuthUser(raw);
    } catch {
      return null;
    }
  }

  private removeLocalAuthUser(): void {
    try {
      window.localStorage.removeItem(this.AUTH_STORAGE_KEY);
    } catch {
      // Do nothing.
    }
  }

  private parseAuthUser(raw: string): AuthUser | null {
    const candidates = new Set<string>();

    candidates.add(raw);

    try {
      candidates.add(decodeURIComponent(raw));
    } catch {
      // Ignore decode error.
    }

    for (const value of candidates) {
      try {
        return JSON.parse(value) as AuthUser;
      } catch {
        // Try next candidate.
      }
    }

    return null;
  }
}