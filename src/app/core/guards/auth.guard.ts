import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthFacadeService } from '../services/auth-facade.service';

interface AccessContext {
  roles: string[];
  department: string;
}

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthFacadeService);
  const router = inject(Router);

  // ADDED:
  // Important fallback.
  // On browser refresh, make sure ma-restore una ang saved session
  // before mo-decide ang guard nga not logged in.
  auth.restoreFromCookies();

  // 1. Not logged in
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // 2. No route restrictions => authenticated users are allowed
  const allowedRoles = (route.data?.['roles'] ?? []) as string[];
  const allowedDepartments = (route.data?.['departments'] ?? []) as string[];

  // 3. Check for permissionKey if specified
  /* UPDATED 04-05-2026   this is a permission key for the route */
  const permissionKey = route.data?.['permissionKey'] as string | undefined;

  if (permissionKey) {
    const allowed = auth.permissions().some(p =>
      normalize(p.permissionKey) === normalize(permissionKey) && p.canOpen
    );

    if (allowed) {
      return true;
    }
  }
  /* end of update */

  if (!allowedRoles.length && !allowedDepartments.length) {
    return true;
  }

  // 3. Resolve current user access from AuthFacadeService
  const access = buildAccessContext(auth);

  const roleOk =
    !allowedRoles.length ||
    allowedRoles.map(normalize).some(role => access.roles.includes(role));

  const departmentOk =
    !allowedDepartments.length ||
    allowedDepartments.map(normalize).includes(access.department);

  if (roleOk && departmentOk) {
    return true;
  }

  // 4. Logged in but not allowed => go to Unauthorized page
  return router.createUrlTree(['/unauthorized'], {
    queryParams: {
      returnUrl: state.url
    }
  });
};

function buildAccessContext(auth: AuthFacadeService): AccessContext {
  const user = auth.user();

  if (!user) {
    return { roles: [], department: '' };
  }

  const roles = new Set<string>();
  const userRights = normalize(user.userights);
  const department = normalize(user.dept);
  const adminFlag = normalize(user.administrator);

  if (userRights) {
    roles.add(userRights);
  }

  if (adminFlag === 'Y') {
    roles.add('ADMIN');
  }

  if (department === 'ACCOUNTING') {
    roles.add('ACCOUNTING');
  }

  if (!roles.size) {
    roles.add('USER');
  }

  return {
    roles: [...roles],
    department
  };
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}