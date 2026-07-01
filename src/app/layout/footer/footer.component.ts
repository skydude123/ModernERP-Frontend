import { Component, computed, inject } from '@angular/core';
import { AuthFacadeService } from '../../core/services/auth-facade.service';
import { TitleCasePipe } from '@angular/common';


@Component({
  selector: 'app-footer',
  imports: [TitleCasePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  standalone: true
})
export class FooterComponent {
 readonly auth = inject(AuthFacadeService);

  readonly userName = computed(() => this.auth.displayName() || 'Neil Flores');
  readonly branch = computed(() => this.auth.branch() || 'Main / Cebu');
  readonly department = computed(() => this.auth.department() || 'ACCOUNTING');
  //readonly apiStatus = computed(() => 'Connected');
  readonly year = new Date().getFullYear();

  readonly apiStatus = 'Connected';
  readonly companyCopyright = '© ' + this.year + ' TwinBee Print Ads Corp.';

}
