import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthFacadeService } from '../../core/services/auth-facade.service';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { bellIcon, logoutIcon, menuIcon } from '@progress/kendo-svg-icons';
import { filter, startWith } from 'rxjs';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, KENDO_BUTTONS, KENDO_ICONS,TitleCasePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
   changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly router = inject(Router);
  readonly auth = inject(AuthFacadeService);

  readonly menuSvg = menuIcon;
  readonly bellSvg = bellIcon;
  readonly logoutSvg = logoutIcon;

  readonly notificationCount = signal(3);
  readonly moduleTitle = signal('Dashboard');

  readonly userName = computed(() => this.auth.displayName() || 'Guest');
  readonly department = computed(() => this.auth.department() || 'N/A');
  readonly branch = computed(() => this.auth.branch() || 'Main / Cebu');
  readonly userId = computed(() => this.auth.userId() || '');

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null)
      )
      .subscribe(() => this.setModuleTitle());
  }

  toggleSidebar(): void {
    this.auth.toggleDrawer();
  }

  logout(): void {
    this.auth.logout();
  }

  private setModuleTitle(): void {
    const routeTitle = this.readDeepestRouteTitle(this.router.routerState.snapshot.root);

    if (routeTitle) {
      this.moduleTitle.set(routeTitle);
      return;
    }

    const url = this.normalizeUrl(this.router.url);
    this.moduleTitle.set(this.mapUrlToTitle(url));
  }

  private readDeepestRouteTitle(snapshot: ActivatedRouteSnapshot | null | undefined): string {
    let current = snapshot;

    while (current?.firstChild) {
      current = current.firstChild;
    }

    const rawTitle = current?.data?.['title'];
    return typeof rawTitle === 'string' ? rawTitle.trim() : '';
  }

  private normalizeUrl(url: string): string {
    return (url ?? '').split('?')[0].split('#')[0];
  }

  private mapUrlToTitle(url: string): string {
    if (url.startsWith('/dashboard')) return 'Dashboard';
    if (url.startsWith('/purchasing/purchase-orders')) return 'Purchase Order';
    if (url.startsWith('/purchasing/receiving-reports')) return 'Receiving Report';
    if (url.startsWith('/fuel-acceptance')) return 'Fuel Consumption Acceptance';
    if (url.startsWith('/service-acceptance')) return 'Service Acceptance';
    if (url.startsWith('/sales/sales-orders')) return 'Sales Order';
    if (url.startsWith('/sales/sales-list')) return 'Sales Order List';
    if (url.startsWith('/delivery/delivery-orders')) return 'Delivery Order';
    if (url.startsWith('/delivery/delivery-list')) return 'Delivery Order List';
    if (url.startsWith('/unauthorized')) return 'Access Denied';
    return 'Dashboard';
  }
}
function takeUntilDestroyed(): import("rxjs").OperatorFunction<NavigationEnd | null, unknown> {
  throw new Error('Function not implemented.');
}

