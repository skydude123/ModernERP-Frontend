import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthFacadeService } from '../../core/services/auth-facade.service';

@Component({
  selector: 'app-unauthorized',
  imports: [],
  templateUrl: './unauthorized.component.html',
  styleUrl: './unauthorized.component.scss'
})
export class UnauthorizedComponent {
 private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthFacadeService);

  readonly returnUrl = computed(() => this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard');

  goBack(): void {
    void this.router.navigateByUrl('/dashboard');
  }

  logout(): void {
    this.auth.logout();
  }
}
