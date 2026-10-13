

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';

import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';

import { DropDownsModule } from '@progress/kendo-angular-dropdowns';

import { InputsModule } from '@progress/kendo-angular-inputs';

import { LabelModule } from '@progress/kendo-angular-label';

import {
  Observable,
  filter,
  map,
  merge,
  switchMap,
  take,
} from 'rxjs';

import { AuthFacadeService } from '../../../../../core/services/auth-facade.service';

import { ErpNotificationService } from '../../../../../shared/notification-card/erp-notification.service';

import { ErpSaveConfirmDialogComponent as ActionConfirmDialogComponent } from '../../../../../shared/NOTIFICATION-confirm-dialog/erp-save-confirm-dialog.component';

import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';

import { AppToolbarComponent } from '../../../../../shared/services/app-toolbar/app-toolbar.component';

import { AppToolbarService } from '../../../../../shared/services/app-toolbar/toolbar.service';

import { SupplierEntryFacade } from '../../facades/supplier-entry.facade';

import {
  SUPPLIER_FIELD_LENGTHS,
  SupplierActiveFlag,
  SupplierCommandResult,
  SupplierCreateRequest,
  SupplierDetail,
  SupplierLookup,
  SupplierStatusRequest,
  SupplierUpdateRequest,
  SupplierWriteRequest,
} from '../../models/supplier.models';

type SupplierControlName =
  | 'supplierCode'
  | 'supplierName'
  | 'supplierGroupCode'
  | 'addressLine1'
  | 'addressLine2'
  | 'addressLine3'
  | 'contactPerson'
  | 'positionTitle'
  | 'telephone'
  | 'fax'
  | 'email'
  | 'tinNo'
  | 'termsCode'
  | 'currencyCode'
  | 'website'
  | 'specialties'
  | 'taxProfileCode';

@Component({
  selector: 'app-supplier-entry-page',

  standalone: true,

  imports: [
    ReactiveFormsModule,
    ButtonsModule,
    DialogModule,
    DropDownsModule,
    InputsModule,
    LabelModule,
    AppToolbarComponent
  ],

  providers: [SupplierEntryFacade],

  templateUrl: './supplier-entry-page.component.html',

  styleUrls: ['./supplier-entry-page.component.scss'],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierEntryPageComponent implements OnDestroy {
  readonly facade = inject(SupplierEntryFacade);

  readonly toolbarService = inject(AppToolbarService);

  private readonly route = inject(ActivatedRoute);

  private readonly formBuilder = inject(FormBuilder);

  private readonly router = inject(Router);

  private readonly dialogs = inject(DialogService);

  private readonly notifications = inject(ErpNotificationService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly auth = inject(AuthFacadeService);

  readonly lengths = SUPPLIER_FIELD_LENGTHS;

  readonly isExisting = signal(false);

  readonly activeFlag = signal<SupplierActiveFlag>('Y');

  readonly formValid = signal(false);

  readonly requiredLookupDefault: SupplierLookup = {
    code: '',
    description: '',
    displayName: 'Select a value',
  };

  readonly optionalLookupDefault: SupplierLookup = {
    code: '',
    description: '',
    displayName: 'None',
  };

  readonly form = this.formBuilder.nonNullable.group({
    supplierCode: [
      '',
      [
        Validators.required,

        Validators.maxLength(SUPPLIER_FIELD_LENGTHS.supplierCode),
      ],
    ],

    supplierName: [
      '',
      [
        Validators.required,

        Validators.maxLength(SUPPLIER_FIELD_LENGTHS.supplierName),
      ],
    ],

    supplierGroupCode: [
      '',
      [
        Validators.required,

        Validators.maxLength(SUPPLIER_FIELD_LENGTHS.supplierGroupCode),
      ],
    ],

    activeFlag: [
      {
        value: 'Y',
        disabled: true,
      },
    ],

    addressLine1: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.addressLine1),
    ],

    addressLine2: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.addressLine2),
    ],

    addressLine3: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.addressLine3),
    ],

    contactPerson: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.contactPerson),
    ],

    positionTitle: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.positionTitle),
    ],

    telephone: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.telephone)],

    fax: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.fax)],

    email: [
      '',
      [Validators.email, Validators.maxLength(SUPPLIER_FIELD_LENGTHS.email)],
    ],

    website: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.website)],

    termsCode: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.termsCode)],

    currencyCode: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.currencyCode),
    ],

    taxProfileCode: [
      '',

      Validators.maxLength(SUPPLIER_FIELD_LENGTHS.taxProfileCode),
    ],

    tinNo: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.tinNo)],

    specialties: ['', Validators.maxLength(SUPPLIER_FIELD_LENGTHS.specialties)],

    modifiedBy: [
      {
        value: '',
        disabled: true,
      },
    ],

    modifiedDate: [
      {
        value: '',
        disabled: true,
      },
    ],
  });

  readonly mayCreate = computed(() =>
    this.auth.hasPermission('SUPPLIER_CREATE'),
  );

  readonly mayEdit = computed(() => this.auth.hasPermission('SUPPLIER_EDIT'));

  readonly mayActivate = computed(() =>
    this.auth.hasPermission('SUPPLIER_ACTIVATE'),
  );

  readonly mayDeactivate = computed(() =>
    this.auth.hasPermission('SUPPLIER_DEACTIVATE'),
  );

  readonly statusLabel = computed(() =>
    this.activeFlag() === 'Y' ? 'Active' : 'Inactive',
  );

  readonly canSave = computed(
    () =>
      this.formValid() &&
      !this.facade.loading() &&
      !this.facade.commandBusy(),

    // &&
    // (this.isExisting() ? this.mayEdit() : this.mayCreate()),
  );

  readonly canActivate = computed(
    () =>
      this.isExisting() &&
      this.activeFlag() === 'N' &&
      this.mayActivate() &&
      !this.facade.commandBusy(),
  );

  readonly canDeactivate = computed(
    () =>
      this.isExisting() &&
      this.activeFlag() === 'Y' &&
      this.mayDeactivate() &&
      !this.facade.commandBusy(),
  );

  private readonly detailEffect = effect(() => {
    const supplier = this.facade.supplier();

    if (supplier) {
      this.applySupplier(supplier);
    }
  });

  private readonly toolbarEffect = effect(() => {
    this.toolbarService.setConfig({
      showBack: true,

      showNew: this.mayCreate(),

      showSave: this.mayCreate() || this.mayEdit(),

      showRefresh: true,

      showActivate: this.mayActivate(),

      showDeactivate: this.mayDeactivate(),
    });
  });

  constructor() {
    const routeCode = this.route.snapshot.paramMap.get('supplierCode');

    this.isExisting.set(!!routeCode);

    this.facade.setSupplierCode(routeCode);

    if (!routeCode) {
      this.resetNewForm();
    } else {
      this.syncFormAccess();
    }

    this.formValid.set(this.form.valid);

    merge(
      this.form.statusChanges,
      this.form.valueChanges,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formValid.set(this.form.valid);
      });
  }

  ngOnDestroy(): void {
    this.detailEffect.destroy();
    this.toolbarEffect.destroy();

    this.toolbarService.reset();
  }

  newSupplier(): void {
    void this.router.navigate(['/master-data/suppliers/new']);
  }

  backToList(): void {
    void this.router.navigate(['/master-data/suppliers']);
  }

  refresh(): void {
    if (this.isExisting()) {
      this.facade.reloadSupplier();
      return;
    }

    this.resetNewForm();
    this.facade.reloadLookups();
  }

  normalizeSupplierCode(): void {
    if (this.isExisting()) {
      return;
    }

    this.form.controls.supplierCode.setValue(
      this.form.controls.supplierCode.value.trim().toUpperCase(),
    );
  }

  save(): void {
    console.log('SUPPLIER SAVE CLICKED');
    /*
     * Prevent duplicate save/update requests.
     */
    if (this.facade.commandBusy()) {
      this.notifications.warning(
        'Another Supplier command is still running.',
        'Save In Progress',
      );

      return;
    }

    this.form.markAllAsTouched();

    this.form.updateValueAndValidity({
      emitEvent: false,
    });

    this.formValid.set(this.form.valid);

    if (!this.canSave()) {
      this.notifications.warning(
        'Complete the required supplier fields and correct validation errors before saving.',
        'Supplier Validation',
      );

      return;
    }

    const existing = this.isExisting();

    const supplierCode = this.form.controls.supplierCode.value
      .trim()
      .toUpperCase();

    const userId = this.currentLoggedInUserId();

    if (!supplierCode) {
      this.notifications.error(
        'Supplier Code is required.',
        existing ? 'Update Failed' : 'Save Failed',
        undefined,
        'Supplier Master',
      );

      return;
    }

    if (!userId) {
      this.notifications.error(
        'The current logged-in user ID could not be determined. Please log out and log in again.',
        existing ? 'Update Failed' : 'Save Failed',
        supplierCode,
        'Supplier Master',
      );

      return;
    }

    if (userId.length > SUPPLIER_FIELD_LENGTHS.userId) {
      this.notifications.error(
        `The current user ID cannot exceed ${SUPPLIER_FIELD_LENGTHS.userId} characters.`,
        existing ? 'Update Failed' : 'Save Failed',
        supplierCode,
        'Supplier Master',
      );

      return;
    }

    const confirmation: ErpSaveConfirmDialogData = {
      title: existing
        ? 'Update Supplier'
        : 'Create Supplier',

      message: existing
        ? 'You are about to update this supplier master record.'
        : 'You are about to create this supplier master record.',

      moduleName: 'Supplier Master',

      documentNo: supplierCode,

      status: this.statusLabel().toUpperCase(),

      effectText: existing
        ? 'The current supplier identity, contact, commercial, and tax defaults will be updated.'
        : 'A new active supplier will be available to authorized ERP transactions.',

      note: 'Supplier code cannot be changed after creation.',

      questionText: 'Do you want to proceed?',

      confirmText: existing
        ? 'Update Supplier'
        : 'Create Supplier',

      cancelText: 'Back to Entry',
    };

    this.confirm(confirmation)
      .pipe(
        filter(Boolean),

        switchMap(() => {
          try {
            /*
             * buildWriteRequest() can throw a local error
             * before the HTTP request is sent.
             */
            const writeRequest = this.buildWriteRequest();

            if (!writeRequest.supplierName) {
              throw new Error(
                'Supplier Name is required.',
              );
            }

            if (!writeRequest.supplierGroupCode) {
              throw new Error(
                'Supplier Group is required.',
              );
            }

            if (existing) {
              const request: SupplierUpdateRequest = {
                ...writeRequest,
                supplierCode,
                userId,
              };

              return this.facade.update(
                supplierCode,
                request,
              );
            }

            const request: SupplierCreateRequest = {
              ...writeRequest,
              supplierCode,
              userId,
            };

            return this.facade.create(
              request,
            );
          } catch (error: unknown) {
            /*
             * Convert local synchronous errors into an
             * Observable error so the subscribe error
             * handler below can display the notification.
             */
            return new Observable<SupplierCommandResult>(
              (subscriber) => {
                subscriber.error(error);
              },
            );
          }
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          try {
            if (!result?.supplier) {
              this.notifications.error(
                'The API did not return the saved Supplier information.',
                existing
                  ? 'Update Failed'
                  : 'Save Failed',
                supplierCode,
                'Supplier Master',
              );

              return;
            }

            const savedSupplierCode = String(
              result.supplier.supplierCode ?? '',
            )
              .trim()
              .toUpperCase();

            if (!savedSupplierCode) {
              this.notifications.error(
                'The API did not return a Supplier Code.',
                existing
                  ? 'Update Failed'
                  : 'Save Failed',
                supplierCode,
                'Supplier Master',
              );

              return;
            }

            this.handleCommandSuccess(
              result,
              existing,
            );
          } catch (error: unknown) {
            this.notifications.error(
              this.getSaveErrorMessage(
                error,
                'The Supplier was saved, but the returned response could not be processed.',
              ),
              existing
                ? 'Update Failed'
                : 'Save Failed',
              supplierCode,
              'Supplier Master',
            );
          }
        },

        /*
         * Handles API validation, SQL, authorization,
         * HTTP, network, and local request-building errors.
         */
        error: (error: unknown) => {
          this.notifications.error(
            this.getSaveErrorMessage(
              error,
              this.facade.errorMessage(error),
            ),
            existing
              ? 'Update Failed'
              : 'Save Failed',
            supplierCode,
            'Supplier Master',
          );
        },
      });
  }

  private getSaveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    /*
     * Normal JavaScript or local validation error.
     */
    if (error instanceof Error) {
      const message = String(
        error.message ?? '',
      ).trim();

      if (message) {
        return message;
      }
    }

    if (
      typeof error === 'object' &&
      error !== null
    ) {
      const response = error as {
        status?: number;

        statusText?: string;

        message?: string;

        error?:
        | string
        | {
          success?: boolean;
          message?: string;
          detail?: string;
          error?: string;
          title?: string;

          errors?: Record<
            string,
            string[] | string
          >;
        };
      };

      /*
       * Backend returned a plain text error.
       */
      if (typeof response.error === 'string') {
        const message = response.error.trim();

        if (message) {
          return message;
        }
      }

      /*
       * Backend returned an error response object.
       */
      if (
        typeof response.error === 'object' &&
        response.error !== null
      ) {
        const apiMessage =
          response.error.message ||
          response.error.detail ||
          response.error.error;

        if (apiMessage?.trim()) {
          return apiMessage.trim();
        }

        /*
         * ASP.NET Core ValidationProblemDetails.
         */
        if (response.error.errors) {
          const validationMessages = Object.values(
            response.error.errors,
          )
            .flatMap((entry) =>
              Array.isArray(entry)
                ? entry
                : [entry],
            )
            .map((entry) =>
              String(entry ?? '').trim(),
            )
            .filter(
              (entry) =>
                entry.length > 0,
            );

          if (validationMessages.length > 0) {
            return validationMessages.join(' ');
          }
        }

        if (response.error.title?.trim()) {
          return response.error.title.trim();
        }
      }

      /*
       * Angular uses status 0 for network, CORS,
       * unavailable API, or connection failures.
       */
      if (response.status === 0) {
        return 'Unable to connect to the server. Check your network connection and confirm that the API is running.';
      }

      if (response.message?.trim()) {
        return response.message.trim();
      }

      if (response.statusText?.trim()) {
        return response.statusText.trim();
      }
    }

    return fallback;
  }

  activate(): void {
    this.changeStatus('activate');
  }

  deactivate(): void {
    this.changeStatus('deactivate');
  }

  isInvalid(controlName: SupplierControlName): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.touched || control.dirty);
  }

  validationText(controlName: SupplierControlName): string {
    const control = this.form.controls[controlName];

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control.hasError('maxlength')) {
      const limit = control.getError('maxlength') as {
        requiredLength?: number;
      } | null;

      return (
        `Maximum length is ` + `${limit?.requiredLength ?? 0} ` + `characters.`
      );
    }

    return 'The value is invalid.';
  }

  private resetNewForm(): void {
    this.isExisting.set(false);
    this.activeFlag.set('Y');

    this.form.reset(
      {
        supplierCode: '',
        supplierName: '',
        supplierGroupCode: '',
        activeFlag: 'Y',

        addressLine1: '',
        addressLine2: '',
        addressLine3: '',

        contactPerson: '',
        positionTitle: '',
        telephone: '',
        fax: '',
        email: '',
        website: '',

        termsCode: '',
        currencyCode: '',
        taxProfileCode: '',
        tinNo: '',
        specialties: '',

        modifiedBy: this.currentLoggedInUserId(),

        modifiedDate: 'Assigned after saving',
      },
      {
        emitEvent: false,
      },
    );

    this.syncFormAccess();

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.formValid.set(this.form.valid);
  }

  private applySupplier(supplier: SupplierDetail): void {
    this.isExisting.set(true);

    this.activeFlag.set(supplier.activeFlag);

    this.form.reset(
      {
        supplierCode: supplier.supplierCode,

        supplierName: supplier.supplierName,

        supplierGroupCode: supplier.supplierGroupCode,

        activeFlag: supplier.activeFlag,

        addressLine1: supplier.addressLine1 ?? '',

        addressLine2: supplier.addressLine2 ?? '',

        addressLine3: supplier.addressLine3 ?? '',

        contactPerson: supplier.contactPerson ?? '',

        positionTitle: supplier.positionTitle ?? '',

        telephone: supplier.telephone ?? '',

        fax: supplier.fax ?? '',

        email: supplier.email ?? '',

        website: supplier.website ?? '',

        termsCode: supplier.termsCode ?? '',

        currencyCode: supplier.currencyCode ?? '',

        taxProfileCode: supplier.taxProfileCode ?? '',

        tinNo: supplier.tinNo ?? '',

        specialties: supplier.specialties ?? '',

        modifiedBy: supplier.modifiedBy,

        modifiedDate: this.formatModifiedDate(supplier.modifiedDate),
      },
      {
        emitEvent: false,
      },
    );

    this.syncFormAccess();

    this.form.markAsPristine();
    this.form.markAsUntouched();

    this.formValid.set(this.form.valid);
  }

  private syncFormAccess(): void {
    // Enable all editable supplier fields
    this.form.enable({
      emitEvent: false,
    });

    // Supplier Code cannot be changed once supplier already exists
    if (this.isExisting()) {
      this.form.controls.supplierCode.disable({
        emitEvent: false,
      });
    }

    // System controlled fields
    this.form.controls.activeFlag.disable({
      emitEvent: false,
    });

    this.form.controls.modifiedBy.disable({
      emitEvent: false,
    });

    this.form.controls.modifiedDate.disable({
      emitEvent: false,
    });
  }

  // private syncFormAccess(): void {
  //   const editable = this.isExisting() ? this.mayEdit() : this.mayCreate();

  //   if (editable) {
  //     this.form.enable({
  //       emitEvent: false,
  //     });
  //   } else {
  //     this.form.disable({
  //       emitEvent: false,
  //     });
  //   }

  //   if (this.isExisting()) {
  //     this.form.controls.supplierCode.disable({
  //       emitEvent: false,
  //     });
  //   }

  //   this.form.controls.activeFlag.disable({
  //     emitEvent: false,
  //   });

  //   this.form.controls.modifiedBy.disable({
  //     emitEvent: false,
  //   });

  //   this.form.controls.modifiedDate.disable({
  //     emitEvent: false,
  //   });
  // }

  private buildWriteRequest(): SupplierWriteRequest {
    const raw = this.form.getRawValue();

    return {
      supplierName: raw.supplierName.trim(),

      supplierGroupCode: raw.supplierGroupCode.trim().toUpperCase(),

      addressLine1: this.optional(raw.addressLine1),

      addressLine2: this.optional(raw.addressLine2),

      // addressLine3: this.optional(raw.addressLine3),

      contactPerson: this.optional(raw.contactPerson),

      positionTitle: this.optional(raw.positionTitle),

      telephone: this.optional(raw.telephone),

      fax: this.optional(raw.fax),

      email: this.optional(raw.email),

      tinNo: this.optional(raw.tinNo),

      termsCode: this.optionalUpper(raw.termsCode),

      // currencyCode: this.optionalUpper(raw.currencyCode),

      website: this.optional(raw.website),

      // specialties: this.optional(raw.specialties),

      // taxProfileCode: this.optionalUpper(raw.taxProfileCode),
    };
  }

  private changeStatus(action: 'activate' | 'deactivate'): void {
    const supplierCode = this.form.controls.supplierCode.value
      .trim()
      .toUpperCase();

    const allowed =
      action === 'activate' ? this.canActivate() : this.canDeactivate();

    if (!allowed) {
      return;
    }

    const request: SupplierStatusRequest = {};

    const verb = action === 'activate' ? 'Activate' : 'Deactivate';

    const data: ErpSaveConfirmDialogData = {
      title: `${verb} Supplier`,

      message: `You are about to ${action} this supplier.`,

      moduleName: 'Supplier Master',

      documentNo: supplierCode,

      status: this.statusLabel().toUpperCase(),

      effectText:
        action === 'activate'
          ? 'The supplier will again be selectable in normal new-transaction lookups.'
          : 'The supplier will remain readable historically but will be excluded from normal new-transaction lookups.',

      note: 'No supplier or historical transaction will be deleted.',

      questionText: 'Do you want to proceed?',

      confirmText: `${verb} Supplier`,

      cancelText: 'Cancel',
    };

    this.confirm(data, ActionConfirmDialogComponent)
      .pipe(
        filter(Boolean),

        switchMap(() =>
          action === 'activate'
            ? this.facade.activate(supplierCode, request)
            : this.facade.deactivate(supplierCode, request),
        ),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.handleCommandSuccess(result, true);
        },

        error: (error) => {
          this.notifications.error(
            this.facade.errorMessage(error),
            `${verb} Failed`,
            supplierCode,
            'Supplier Master',
          );
        },
      });
  }

  private handleCommandSuccess(
    result: SupplierCommandResult,

    wasExisting: boolean,
  ): void {
    this.applySupplier(result.supplier);

    this.notifications.success(
      result.message,

      wasExisting ? 'Supplier Updated' : 'Supplier Created',

      result.supplier.supplierCode,
      'Supplier Master',
    );

    if (result.warningMessage) {
      this.notifications.warning(
        result.warningMessage,
        'Possible Similar Supplier',
        result.supplier.supplierCode,
        'Supplier Master',
      );
    }

    if (!wasExisting) {
      void this.router.navigate(
        ['/master-data/suppliers', result.supplier.supplierCode],
        {
          replaceUrl: true,
        },
      );
    }
  }

  private confirm(
    data: ErpSaveConfirmDialogData,

    content:
      | typeof ErpSaveConfirmDialogComponent
      | typeof ActionConfirmDialogComponent = ErpSaveConfirmDialogComponent,
  ): Observable<boolean> {
    const dialog: DialogRef = this.dialogs.open({
      content,
      width: 680,
      minWidth: 360,
      cssClass: 'erp-confirm-dialog-host',
    });

    const component =
      dialog.content.instance as ErpSaveConfirmDialogComponent;

    component.data = data;

    return dialog.result.pipe(
      take(1),

      map((result) => {
        /*
         * Closed using X / Cancel.
         */
        if (result instanceof DialogCloseResult) {
          return false;
        }

        /*
         * Cast to unknown first because Kendo types
         * dialog.result as DialogResult.
         */
        const dialogResult: unknown = result;

        /*
         * Support dialogs that directly return true.
         */
        if (dialogResult === true) {
          return true;
        }

        /*
         * Support object-based dialog results.
         */
        if (
          typeof dialogResult === 'object' &&
          dialogResult !== null
        ) {
          const action = String(
            (
              dialogResult as {
                action?: unknown;
              }
            ).action ?? '',
          )
            .trim()
            .toLowerCase();

          return [
            'confirm',
            'save',
            'create',
            'update',
            'yes',
            'ok',
          ].includes(action);
        }

        return false;
      }),
    );
  }

  private currentLoggedInUserId(): string {
    return (this.auth.userId() ?? '').trim().toUpperCase();
  }

  private optional(value: string): string | null {
    const cleanValue = value.trim();

    return cleanValue || null;
  }

  private optionalUpper(value: string): string | null {
    const cleanValue = value.trim().toUpperCase();

    return cleanValue || null;
  }

  private formatModifiedDate(value?: string | null): string {
    if (!value) {
      return 'Not provided by API';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
