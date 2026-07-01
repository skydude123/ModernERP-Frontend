import { computed, inject, Injectable } from '@angular/core';

import { APP_DRAWER_ITEMS, AppDrawerItem } from './app-menu.config';
import { AuthFacadeService } from './core/services/auth-facade.service';

interface AccessContext {
  roles: string[];
  department: string;
}

@Injectable({
  providedIn: 'root',
})
export class MenuAccessService {
  private readonly auth = inject(AuthFacadeService);

  /* Update 04-05-2026 */
  readonly items = computed(() => {
    return this.cleanSeparators(this.filterItems(APP_DRAWER_ITEMS));
  });

  // readonly items = computed(() => {
  //   return this.cleanSeparators(
  //     this.filterItems(APP_DRAWER_ITEMS, this.access()),
  //   );
  // });
  /* end of update */

  private readonly access = computed<AccessContext>(() => {
    const user = this.auth.user();
    const normalizeValue = (value: string | null | undefined) =>
      (value ?? '').trim().toUpperCase();

    if (!user) {
      return { roles: [], department: '' };
    }

    const roles = new Set<string>();
    const userRights = normalizeValue(user.userights);
    const department = normalizeValue(user.dept);
    const adminFlag = normalizeValue(user.administrator);

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
      department,
    };
  });

  refresh(): void {
    // Kept for compatibility with existing SidebarComponent lifecycle.
    // The service is now signal-driven from AuthFacadeService,
    // so no manual refresh work is required.
  }

  /* Update 04-05-2026 */
  private filterItems(items: AppDrawerItem[]): AppDrawerItem[] {
    const byId = new Map<number, AppDrawerItem>(
      items
        .filter((item) => !item.separator && !!item.id)
        .map((item) => [item.id!, item]),
    );

    const visibleIds = new Set<number>();

    for (const item of items) {
      if (item.separator || !item.id) continue;

      if (this.canView(item)) {
        visibleIds.add(item.id);

        let currentParentId = item.parentId;
        while (currentParentId != null) {
          visibleIds.add(currentParentId);
          currentParentId = byId.get(currentParentId)?.parentId;
        }
      }
    }

    return items.filter(
      (item) => item.separator || (!!item.id && visibleIds.has(item.id)),
    );
  }

  private canView(item: AppDrawerItem): boolean {
    if (!item.permissionKey) {
      return true;
    }

    // ADDED:
    // Admin / IT bypass para makita dayon ang BIOMETRIX menus.
    // Proper DB permissions should still be added later.
    if (this.isAdminOrIt()) {
      return true;
    }

    const permissionKey = normalize(item.permissionKey);
    const permissions = this.auth.permissions();

    return permissions.some((p: any) => {
      const userPermissionKey = normalize(
        p.permissionKey ??
          p.PermissionKey ??
          p.moduleCode ??
          p.ModuleCode ??
          p.module_code ??
          p.Module_Code
      );

      const canView =
        p.canView === true ||
        p.CanView === true ||
        p.can_view === true ||
        p.canView === 1 ||
        p.CanView === 1 ||
        p.can_view === 1 ||
        p.canView === '1' ||
        p.CanView === '1' ||
        p.can_view === '1' ||
        normalize(String(p.canView ?? p.CanView ?? p.can_view ?? '')) === 'TRUE';

      return userPermissionKey === permissionKey && canView;
    });
  }

  private isAdminOrIt(): boolean {
    const user = this.auth.user();

    const administrator = normalize(user?.administrator);
    const userRights = normalize(user?.userights);
    const dept = normalize(user?.dept);
    const role = normalize(this.auth.role());

    return (
      administrator === 'Y' ||
      userRights === 'ADMIN' ||
      userRights === 'SUPER' ||
      role === 'ADMIN' ||
      role === 'SUPER' ||
      dept === 'IT' ||
      dept === 'ACCOUNTING'
    );
  }
  /* end of update */

  // private filterItems(
  //   items: AppDrawerItem[],
  //   access: AccessContext,
  // ): AppDrawerItem[] {
  //   const byId = new Map<number, AppDrawerItem>(
  //     items
  //       .filter((item) => !item.separator && !!item.id)
  //       .map((item) => [item.id!, item]),
  //   );

  //   const visibleIds = new Set<number>();

  //   for (const item of items) {
  //     if (item.separator || !item.id) continue;

  //     if (this.isAllowed(item, access)) {
  //       visibleIds.add(item.id);

  //       let currentParentId = item.parentId;
  //       while (currentParentId != null) {
  //         visibleIds.add(currentParentId);
  //         currentParentId = byId.get(currentParentId)?.parentId;
  //       }
  //     }
  //   }

  // //   return items.filter(
  // //     (item) => item.separator || (!!item.id && visibleIds.has(item.id)),
  // //   );
  // // }

  // // private isAllowed(item: AppDrawerItem, access: AccessContext): boolean {
  // //   const normalize = (value: string | null | undefined) =>
  // //     (value ?? '').trim().toUpperCase();

  // //   const roleOk =
  // //     !item.roles?.length ||
  // //     item.roles.map(normalize).some((role) => access.roles.includes(role));

  // //   const deptOk =
  // //     !item.departments?.length ||
  // //     item.departments.map(normalize).includes(access.department);

  // //   return roleOk && deptOk;
  // // }

  private cleanSeparators(items: AppDrawerItem[]): AppDrawerItem[] {
    const result: AppDrawerItem[] = [];

    for (const item of items) {
      if (item.separator) {
        if (!result.length || result[result.length - 1].separator) {
          continue;
        }
      }

      result.push(item);
    }

    while (result.length && result[result.length - 1].separator) {
      result.pop();
    }

    return result;
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}