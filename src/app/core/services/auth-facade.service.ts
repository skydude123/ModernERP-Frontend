import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from './auth-api.service';
import { CookieStorageService } from './cookie-storage.service';
import { AuthUser, LoginRequest } from '../models/auth.model';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthFacadeService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly cookies = inject(CookieStorageService);

  readonly user = signal<AuthUser | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly drawerExpanded = signal(true);

  // ADDED:
  // Para dili mag balik-balik og restore every guard check.
  private sessionRestored = false;

  constructor() {
    // ADDED:
    // Important kaayo ni.
    // Once ma-create ang AuthFacadeService after browser refresh,
    // i-restore dayon ang saved user before mo-check ang guard.
    this.restoreFromCookies();
  }

  readonly isAuthenticated = computed(() => !!this.user());

  // readonly displayName = computed(() => this.user()?.fullName ?? 'Guest');
  //    readonly displayName = computed(() =>
  //   `${this.user()?.firstName ?? ''} ${this.user()?.lastName ?? ''}`.trim() || 'Guest'
  // );
  /* UPDATED 04-05-2026 */
  readonly displayName = computed(() => this.user()?.fullName ?? 'Guest');
  /* end of update */

  readonly branch = computed(() => this.user()?.branch ?? this.cookies.getBranch());
  readonly department = computed(() => (this.user()?.dept ?? '').trim().toUpperCase());
  readonly userId = computed(() => this.user()?.userId ?? this.cookies.getUserId());

  /* UPDATED 04-05-2026 */
  readonly userRights = computed(() => (this.user()?.userights ?? '').trim().toUpperCase());
  readonly permissions = computed(() => this.user()?.permissions ?? []);
  /* end of update */

  readonly role = computed(() => {
    const rights = normalize(readUserRight(this.user()));
    if (rights) return rights;

    if (normalize(readAdminFlag(this.user())) === 'Y') {
      return 'ADMIN';
    }

    return this.user() ? 'USER' : '';
  });

  readonly isAdmin = computed(() => {
    const u = this.user();
    if (!u) return false;
    return u.administrator === 'Y' || (u.dept ?? '').trim().toUpperCase() === 'ACCOUNTING';
  });

  login(payload: LoginRequest, returnUrl?: string): void {
    this.loading.set(true);
    this.error.set('');

    /* Invoking login Service */
    this.api.login(payload)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.user) {
            this.error.set(res.message || 'Login failed.');
            return;
          }

          this.user.set(res.user);
          this.cookies.setAuth(res.user);

          // ADDED:
          // After successful login, mark session restored na.
          this.sessionRestored = true;

          // UPDATED:
          // If gikan siya sa guard redirect, balik siya sa original page.
          // Otherwise dashboard gihapon.
          void this.router.navigateByUrl(returnUrl || '/dashboard');
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Unable to login.');
        }
      });
    /* end of invoke to service */
  }

  logout(): void {
    this.user.set(null);
    this.error.set('');
    this.sessionRestored = false;
    this.cookies.clearAuth();
    void this.router.navigateByUrl('/login');
  }

  restoreFromCookies(): void {
    // ADDED:
    // Avoid duplicate restore.
    if (this.sessionRestored) return;

    const restored = this.cookies.getAuthUser();

    this.sessionRestored = true;

    if (!restored) return;

    this.user.set(restored);
  }

  toggleDrawer(): void {
    this.drawerExpanded.update(v => !v);
  }
}

function readUserRight(user: any): string {
  return user?.userRights ?? user?.userights ?? '';
}

function readDepartment(user: any): string {
  return user?.DEPT ?? user?.dept ?? user?.department ?? '';
}

function readAdminFlag(user: any): string {
  return user?.administrator ?? '';
}

function readUserId(user: any): string {
  return user?.userId ?? user?.userid ?? '';
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}