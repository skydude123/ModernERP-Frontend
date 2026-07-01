import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import {
  DrawerItemExpandedFn,
  DrawerMode,
  DrawerSelectEvent,
  KENDO_LAYOUT
} from '@progress/kendo-angular-layout';

import { debounceTime, filter, fromEvent, startWith, Subject, takeUntil } from 'rxjs';

import { AuthFacadeService } from '../../core/services/auth-facade.service';
import { AppDrawerItem } from '../../app-menu.config';
import { MenuAccessService } from '../../menu-access.service';

type DrawerModeSignal = DrawerMode;

@Component({
  selector: 'app-sidebar',
  imports: [KENDO_LAYOUT, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  standalone: true
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly auth = inject(AuthFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly menuAccess = inject(MenuAccessService);
  private readonly destroy$ = new Subject<void>();

  public readonly selectedPath: WritableSignal<string> = signal('');
  public readonly mode: WritableSignal<DrawerModeSignal> = signal<DrawerModeSignal>('push');

  // MODIFIED:
  // false = full close jud ang sidebar.
  // true = mini rail/icon rail ang mabilin.
  public readonly mini: WritableSignal<boolean> = signal(false);

  public readonly expandedIndices: WritableSignal<number[]> = signal<number[]>([]);

  public readonly items = computed<AppDrawerItem[]>(() => {
    const path = this.selectedPath();

    // MODIFIED:
    // Find one exact/best matched item only.
    // Reason:
    // /hris-biometrix/dtr-listing should select DTR Listing only,
    // not HRIS Biometrix also.
    const activeItemId = this.getActiveItemId(path);

    return this.menuAccess.items().map(item => ({
      ...item,
      selected: item.id === activeItemId
    }));
  });

  public readonly isItemExpanded: DrawerItemExpandedFn = (item): boolean => {
    const id = item && item.id;

    if (!this.auth.drawerExpanded()) {
      return false;
    }

    return !!id && this.expandedIndices().includes(id);
  };

  ngOnInit(): void {
    this.menuAccess.refresh();

    const initialUrl = this.router.url || '';
    this.selectedPath.set(initialUrl);
    this.expandParentsForPath(initialUrl);

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((navEnd) => {
        const url = navEnd.urlAfterRedirects ?? navEnd.url;
        this.selectedPath.set(url);
        this.expandParentsForPath(url);
        this.cdr.markForCheck();
      });

    fromEvent(window, 'resize')
      .pipe(startWith(null), debounceTime(150), takeUntil(this.destroy$))
      .subscribe(() => this.setDrawerConfig());

    this.setDrawerConfig();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onSelect(ev: DrawerSelectEvent): void {
    const item = ev.item as AppDrawerItem | undefined;
    if (!item || item.separator) return;

    const hasChildren = this.hasChildren(item.id);

    if (hasChildren && item.id != null) {
      const isExpanded = this.expandedIndices().includes(item.id);

      // accordion behavior: one open at a time
      this.expandedIndices.set(isExpanded ? [] : [item.id]);

      // MODIFIED:
      // Parent menu should only expand/collapse.
      // Since BIOMETRIX has no path, no navigation needed.
      this.cdr.markForCheck();
      return;
    }

    const path = item.path;

    if (path) {
      // MODIFIED:
      // Update selectedPath immediately before navigation.
      // Reason:
      // Para mo-highlight dayon on first click.
      this.selectedPath.set(path);
      this.expandParentsForPath(path);
      this.cdr.markForCheck();

      if (this.normalizeUrl(this.router.url) !== this.normalizeUrl(path)) {
        void this.router.navigateByUrl(path);
      }
    }

    // Mobile overlay: close drawer after selecting child menu item.
    if (this.mode() === 'overlay' && this.auth.drawerExpanded()) {
      this.auth.toggleDrawer();
    }
  }

  private hasChildren(id?: number): boolean {
    return !!id && this.menuAccess.items().some(item => item.parentId === id);
  }

  private expandParentsForPath(path: string): void {
    const menuItems = this.menuAccess.items();

    const activeItemId = this.getActiveItemId(path);
    const matched = menuItems.find(item => item.id === activeItemId);

    if (!matched?.id) {
      this.expandedIndices.set([]);
      return;
    }

    const map = new Map<number, AppDrawerItem>(
      menuItems
        .filter(item => !!item.id)
        .map(item => [item.id!, item])
    );

    const parentChain: number[] = [];
    let current = map.get(matched.id);

    while (current?.parentId != null) {
      parentChain.unshift(current.parentId);
      current = map.get(current.parentId);
    }

    if (this.hasChildren(matched.id)) {
      parentChain.push(matched.id);
    }

    this.expandedIndices.set(parentChain);
  }

  private getActiveItemId(currentUrl: string): number | null {
    const current = this.normalizeUrl(currentUrl);

    const matched = this.menuAccess.items()
      .filter(item => !!item.id && !!item.path)
      .filter(item => this.isRouteMatch(current, item.path!))
      .sort((a, b) => (b.path?.length ?? 0) - (a.path?.length ?? 0))[0];

    return matched?.id ?? null;
  }

  private isRouteMatch(currentUrl: string, itemPath: string): boolean {
    const current = this.normalizeUrl(currentUrl);
    const target = this.normalizeUrl(itemPath);

    // Exact page match.
    if (current === target) {
      return true;
    }

    // MODIFIED:
    // Allow nested match only for real parent routes when needed.
    // But longest match wins in getActiveItemId().
    return current.startsWith(`${target}/`);
  }

  private normalizeUrl(url: string): string {
    return (url ?? '').split('?')[0].split('#')[0];
  }

  private setDrawerConfig(): void {
    const pageWidth = window.innerWidth || 1024;
    const isOverlay = pageWidth <= 840;

    this.mode.set(isOverlay ? 'overlay' : 'push');

    // MODIFIED:
    // Always false para full close/open.
    this.mini.set(false);
  }
}