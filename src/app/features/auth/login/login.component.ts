import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { KENDO_LABELS } from '@progress/kendo-angular-label';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS, SVGIcon } from '@progress/kendo-angular-icons';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { eyeIcon, eyeSlashIcon, lockIcon, usersIcon } from '@progress/kendo-svg-icons';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KENDO_INPUTS,
    KENDO_LABELS,
    KENDO_BUTTONS,
    KENDO_ICONS
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
})
export class LoginComponent {
  public eyeSvg: SVGIcon = eyeIcon;
  public eyeSlashSvg: SVGIcon = eyeSlashIcon;
  public usersSolidIcon: SVGIcon = usersIcon;
  public lockSvg: SVGIcon = lockIcon;

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  readonly auth = inject(AuthFacadeService);

  readonly showPassword = signal(false);

  public togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  readonly form = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  // readonly canSubmit = computed(() => this.form.valid);
  //  readonly canSubmit = computed(() => this.form.valid && !this.auth.loading());

  get canSubmit(): boolean {
    return this.form.valid && !this.auth.loading();
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { userId, password } = this.form.getRawValue();

    // ADDED:
    // Get original page before redirect to login.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';

    //  this.auth.login(this.form.getRawValue());
    this.auth.login({
      userId,
      password
    }, returnUrl);
  }
}