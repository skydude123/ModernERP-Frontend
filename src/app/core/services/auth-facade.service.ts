import { computed, inject, Injectable, signal } from '@angular/core';

import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { CookieStorageService } from './cookie-storage.service';

import { AuthUser, LoginRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthFacadeService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly cookies = inject(CookieStorageService);

  /*
   * Store the complete authenticated user here.
   *
   * Reason:
   * The permissions array can become too large for a browser cookie.
   * localStorage is safer for restoring menu permissions after refresh.
   */
  private readonly authUserStorageKey = 'erp_auth_user';

  readonly user = signal<AuthUser | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly drawerExpanded = signal(true);

  /*
   * Prevent repeated restoration during guard checks and component loading.
   */
  private sessionRestored = false;

  constructor() {
    this.restoreSession();
  }

  readonly isAuthenticated = computed(() => {
    return !!this.user();
  });

  readonly displayName = computed(() => {
    const user = this.user();

    if (!user) {
      return 'Guest';
    }

    const fullName = String(user.fullName ?? '').trim();

    if (fullName) {
      return fullName;
    }

    const firstName = String(user.firstName ?? '').trim();
    const lastName = String(user.lastName ?? '').trim();

    return `${firstName} ${lastName}`.trim() || 'Guest';
  });

  readonly branch = computed(() => {
    const userBranch = String(this.user()?.branch ?? '').trim();

    if (userBranch) {
      return userBranch;
    }

    return String(this.cookies.getBranch() ?? '').trim();
  });

  readonly department = computed(() => {
    return normalize(readDepartment(this.user()));
  });

  readonly userId = computed(() => {
    const storedUserId = String(readUserId(this.user())).trim();

    if (storedUserId) {
      return storedUserId;
    }

    return String(this.cookies.getUserId() ?? '').trim();
  });

  readonly userRights = computed(() => {
    return normalize(readUserRight(this.user()));
  });

  readonly permissions = computed(() => {
    const permissions = this.user()?.permissions;

    return Array.isArray(permissions) ? permissions : [];
  });

  readonly role = computed(() => {
    const rights = normalize(readUserRight(this.user()));

    if (rights) {
      return rights;
    }

    if (normalize(readAdminFlag(this.user())) === 'Y') {
      return 'ADMIN';
    }

    return this.user() ? 'USER' : '';
  });

  readonly isAdmin = computed(() => {
    const currentUser = this.user();

    if (!currentUser) {
      return false;
    }

    const administrator = normalize(currentUser.administrator);

    const department = normalize(readDepartment(currentUser));

    return administrator === 'Y' || department === 'ACCOUNTING';
  });

  hasPermission(
    permissionKey: string,
    capability: 'view' | 'open' = 'open',
  ): boolean {
    if (this.isPrivilegedUser()) {
      return true;
    }

    const expectedPermissionKey = normalize(permissionKey);

    if (!expectedPermissionKey) {
      return false;
    }

    return this.permissions().some((permission) => {
      const actualPermissionKey = normalize(permission.permissionKey);

      if (actualPermissionKey !== expectedPermissionKey) {
        return false;
      }

      return capability === 'view'
        ? permission.canView === true
        : permission.canOpen === true;
    });
  }

  isPrivilegedUser(): boolean {
  const currentUser = this.user();

  if (!currentUser) {
    return false;
  }

  const administrator = normalize(
    currentUser.administrator
  );

  const userRights = normalize(
    readUserRight(currentUser)
  );

  return (
    administrator === 'Y' ||
    userRights === 'SUPER' ||
    userRights === 'ADMIN' ||
    userRights === 'ADMINISTRATOR'
  );
}

  login(payload: LoginRequest, returnUrl?: string): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .login(payload)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.user) {
            this.error.set(response.message || 'Login failed.');

            return;
          }

          /*
           * Keep the complete user in memory.
           */
          this.user.set(response.user);

          /*
           * Keep the existing cookie authentication behavior.
           */
          this.cookies.setAuth(response.user);

          /*
           * Save the complete user, including permissions.
           *
           * This is the important fix for the disappearing sidebar.
           */
          this.saveUserToLocalStorage(response.user);

          this.sessionRestored = true;

          void this.router.navigateByUrl(returnUrl || '/dashboard');
        },

        error: (error) => {
          this.error.set(error?.error?.message ?? 'Unable to login.');
        },
      });
  }

  logout(): void {
    this.api
      .logout()
      .pipe(
        finalize(() => {
          this.completeLogout();
        }),
      )
      .subscribe({
        error: () => {
          /*
           * Local cleanup still runs through finalize even when the
           * server session has already expired.
           */
        },
      });
  }

  /*
   * Retained for compatibility with existing guards/components.
   */
  restoreFromCookies(): void {
    this.restoreSession();
  }

  restoreSession(): void {
    if (this.sessionRestored) {
      return;
    }

    /*
     * Set immediately to prevent multiple guards from restoring at the
     * same time.
     */
    this.sessionRestored = true;

    /*
     * First choice:
     * Restore the complete user and permissions from localStorage.
     */
    const localUser = this.readUserFromLocalStorage();

    if (localUser) {
      this.user.set(localUser);
      return;
    }

    /*
     * Fallback:
     * Restore from the existing CookieStorageService.
     */
    const cookieUser = this.cookies.getAuthUser();

    if (!cookieUser) {
      this.user.set(null);
      return;
    }

    this.user.set(cookieUser);

    /*
     * Migrate an old cookie-restored session into localStorage.
     */
    this.saveUserToLocalStorage(cookieUser);
  }

  toggleDrawer(): void {
    this.drawerExpanded.update((expanded) => !expanded);
  }

  private saveUserToLocalStorage(user: AuthUser): void {
    try {
      localStorage.setItem(this.authUserStorageKey, JSON.stringify(user));
    } catch {
      /*
       * Authentication cookies can still continue working even when
       * browser storage is disabled.
       */
    }
  }

  private readUserFromLocalStorage(): AuthUser | null {
    try {
      const storedValue = localStorage.getItem(this.authUserStorageKey);

      if (!storedValue) {
        return null;
      }

      const parsedUser = JSON.parse(storedValue) as AuthUser;

      if (!parsedUser || !readUserId(parsedUser)) {
        localStorage.removeItem(this.authUserStorageKey);

        return null;
      }

      /*
       * Always normalize permissions into an array.
       */
      if (!Array.isArray(parsedUser.permissions)) {
        parsedUser.permissions = [];
      }

      return parsedUser;
    } catch {
      localStorage.removeItem(this.authUserStorageKey);

      return null;
    }
  }

  private completeLogout(): void {
    this.user.set(null);
    this.error.set('');
    this.sessionRestored = false;

    this.cookies.clearAuth();

    try {
      localStorage.removeItem(this.authUserStorageKey);
    } catch {
      // Ignore unavailable browser storage.
    }

    void this.router.navigateByUrl('/login');
  }
}

function readUserRight(user: AuthUser | null | undefined): string {
  const value = user as any;

  return value?.userRights ?? value?.userights ?? '';
}

function readDepartment(user: AuthUser | null | undefined): string {
  const value = user as any;

  return value?.DEPT ?? value?.dept ?? value?.department ?? '';
}

function readAdminFlag(user: AuthUser | null | undefined): string {
  const value = user as any;

  return value?.administrator ?? '';
}

function readUserId(user: AuthUser | null | undefined): string {
  const value = user as any;

  return value?.userId ?? value?.userid ?? '';
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}
