import { CommonModule } from '@angular/common';

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

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';

import {
  DataStateChangeEvent,
  EditEvent,
  GridDataResult,
  GridModule,
} from '@progress/kendo-angular-grid';

import { InputsModule } from '@progress/kendo-angular-inputs';
import { State } from '@progress/kendo-data-query';

import {
  SVGIcon,
  cancelIcon,
  filterClearIcon,
  saveIcon,
} from '@progress/kendo-svg-icons';

import {
  Observable,
  debounceTime,
  distinctUntilChanged,
  take,
} from 'rxjs';

import {
  AuthFacadeService,
} from '../../../../../core/services/auth-facade.service';

import {
  ErpNotificationService,
} from '../../../../../shared/notification-card/erp-notification.service';

import {
  AppToolbarComponent,
} from '../../../../../shared/services/app-toolbar/app-toolbar.component';

import {
  AppToolbarService,
} from '../../../../../shared/services/app-toolbar/toolbar.service';

import {
  SupplierListFacade,
} from '../../facades/supplier-list.facade';

import {
  SUPPLIER_FIELD_LENGTHS,
  SupplierActiveFilter,
  SupplierActiveFlag,
  SupplierCommandResult,
  SupplierCreateRequest,
  SupplierDetail,
  SupplierListItem,
  SupplierListQuery,
  SupplierLookup,
  SupplierStatusRequest,
  SupplierUpdateRequest,
  SupplierWriteRequest,
} from '../../models/supplier.models';


interface StatusOption {
  value: SupplierActiveFilter;
  text: string;
}


type SupplierDialogControlName =
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
  | 'website'
  | 'termsCode'
  | 'currencyCode'
  | 'taxProfileCode'
  | 'tinNo'
  | 'specialties';


type ConfirmationAction =
  | 'save'
  | 'reset'
  | 'refresh'
  | 'activate'
  | 'deactivate'
  | 'close';


interface SupplierConfirmation {
  action: ConfirmationAction;
  title: string;
  message: string;
  confirmText: string;
  note?: string;
  danger?: boolean;
}


@Component({
  selector: 'app-supplier-list-page',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    ButtonsModule,
    DialogModule,
    DropDownsModule,
    GridModule,
    InputsModule,

    AppToolbarComponent,
  ],

  providers: [
    SupplierListFacade,
  ],

  templateUrl:
    './supplier-list-page.component.html',

  styleUrls: [
    './supplier-list-page.component.scss',
  ],

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class SupplierListPageComponent
  implements OnDestroy {

  readonly facade =
    inject(SupplierListFacade);

  readonly toolbarService =
    inject(AppToolbarService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly auth =
    inject(AuthFacadeService);

  private readonly notifications =
    inject(ErpNotificationService);

  private readonly destroyRef =
    inject(DestroyRef);


  readonly filterClearIcon: SVGIcon =
    filterClearIcon;

  readonly saveIcon: SVGIcon =
    saveIcon;

  readonly cancelIcon: SVGIcon =
    cancelIcon;

  readonly lengths =
    SUPPLIER_FIELD_LENGTHS;

    readonly filteredTaxProfiles =
  signal<SupplierLookup[]>([]);


  readonly canCreate =
    computed(() =>
      this.auth.hasPermission(
        'SUPPLIER_CREATE',
      ),
    );


readonly canEdit =
  computed(() => true);


  readonly mayActivate =
    computed(() =>
      this.auth.hasPermission(
        'SUPPLIER_ACTIVATE',
      ),
    );


  readonly mayDeactivate =
    computed(() =>
      this.auth.hasPermission(
        'SUPPLIER_DEACTIVATE',
      ),
    );


  readonly allLookupOption:
    SupplierLookup = {
      code: '',
      description: '',
      displayName: 'All',
    };


  readonly requiredLookupDefault:
    SupplierLookup = {
      code: '',
      description: '',
      displayName: 'Select a value',
    };


  readonly optionalLookupDefault:
    SupplierLookup = {
      code: '',
      description: '',
      displayName: 'None',
    };


  readonly statusOptions:
    StatusOption[] = [
      {
        value: 'Y',
        text: 'Active',
      },
      {
        value: 'N',
        text: 'Inactive',
      },
      {
        value: 'ALL',
        text: 'All',
      },
    ];

    selectedSupplierKeys: string[] = [];

  readonly isEditDialogOpen =
    signal(false);

  readonly isNew =
    signal(true);

  readonly activeFlag =
    signal<SupplierActiveFlag>('Y');

  readonly confirmation =
    signal<SupplierConfirmation | null>(
      null,
    );


  readonly showActivateSupplier =
    computed(() =>
      !this.isNew() &&
      this.activeFlag() === 'N',
    );


  readonly showDeactivateSupplier =
    computed(() =>
      !this.isNew() &&
      this.activeFlag() === 'Y',
    );


  readonly canActivateSupplier =
    computed(() =>
      this.showActivateSupplier() &&
      this.mayActivate() &&
      !this.isDialogBusy(),
    );


  readonly canDeactivateSupplier =
    computed(() =>
      this.showDeactivateSupplier() &&
      this.mayDeactivate() &&
      !this.isDialogBusy(),
    );


  readonly filterForm =
    this.formBuilder.nonNullable.group({
      search: '',
      supplierGroupCode: '',
      termsCode: '',
      currencyCode: '',
      taxProfileCode: '',

      activeFlag:
        this.formBuilder.nonNullable
          .control<SupplierActiveFilter>(
            'Y',
          ),
    });


  readonly editForm =
    this.formBuilder.nonNullable.group({
      supplierCode: [
        '',
        [
          Validators.required,

          Validators.maxLength(
            SUPPLIER_FIELD_LENGTHS
              .supplierCode,
          ),
        ],
      ],

      supplierName: [
        '',
        [
          Validators.required,

          Validators.maxLength(
            SUPPLIER_FIELD_LENGTHS
              .supplierName,
          ),
        ],
      ],

      supplierGroupCode: [
        '',
        [
          Validators.required,

          Validators.maxLength(
            SUPPLIER_FIELD_LENGTHS
              .supplierGroupCode,
          ),
        ],
      ],

      addressLine1: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .addressLine1,
        ),
      ],

      addressLine2: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .addressLine2,
        ),
      ],

      addressLine3: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .addressLine3,
        ),
      ],

      contactPerson: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .contactPerson,
        ),
      ],

      positionTitle: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .positionTitle,
        ),
      ],

      telephone: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .telephone,
        ),
      ],

      fax: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .fax,
        ),
      ],

      email: [
        '',
        [
          Validators.email,

          Validators.maxLength(
            SUPPLIER_FIELD_LENGTHS
              .email,
          ),
        ],
      ],

      website: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .website,
        ),
      ],

      termsCode: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .termsCode,
        ),
      ],

      currencyCode: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .currencyCode,
        ),
      ],

      taxProfileCode: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .taxProfileCode,
        ),
      ],

      tinNo: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .tinNo,
        ),
      ],

      specialties: [
        '',

        Validators.maxLength(
          SUPPLIER_FIELD_LENGTHS
            .specialties,
        ),
      ],

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


  readonly gridState =
    signal<State>({
      skip: 0,
      take: 50,

      sort: [
        {
          field: 'supplierName',
          dir: 'asc',
        },
      ],
    });


  readonly gridData =
    computed<GridDataResult>(() => ({
      data:
        this.facade.suppliers(),

      total:
        this.facade.total(),
    }));

    private readonly taxProfileLookupEffect = effect(() => {
  this.filteredTaxProfiles.set(
    this.facade.lookups().taxProfiles,
  );
});


  constructor() {
    this.toolbarService.setConfig({
      showNew:
        this.canCreate(),

      showRefresh:
        true,
    });

    this.filterForm.valueChanges
      .pipe(
        debounceTime(350),

        distinctUntilChanged(
          (previous, current) =>
            JSON.stringify(previous) ===
            JSON.stringify(current),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.applyLiveFilters();
      });
  }


  ngOnDestroy(): void {
    this.toolbarService.reset();
  }


  newSupplier(): void {
    if (
      !this.canCreate() ||
      this.isDialogBusy()
    ) {
      return;
    }

    this.facade.clearDialogErrors();

    this.isNew.set(true);
    this.activeFlag.set('Y');

    this.resetNewSupplierForm();

    this.isEditDialogOpen.set(true);
  }


  editSupplierHandler(
    event: EditEvent,
  ): void {
    if (this.isDialogBusy()) {
      return;
    }

    event.sender.closeRow(
      event.rowIndex,
    );

    const selectedItem =
      event.dataItem as SupplierListItem;

    this.facade.clearDialogErrors();

    this.isNew.set(false);

    this.activeFlag.set(
      selectedItem.activeFlag,
    );

    this.seedEditForm(
      selectedItem,
    );

    this.editForm.disable({
      emitEvent: false,
    });

    this.isEditDialogOpen.set(true);

    this.loadDialogSupplier(
      selectedItem.supplierCode,
    );
  }


  requestSave(): void {
    if (this.isDialogBusy()) {
      return;
    }

    this.normalizeSupplierCode();

    this.editForm.markAllAsTouched();

    if (this.editForm.invalid) {
      this.notifications.warning(
        'Complete the required supplier fields and correct validation errors before saving.',
        'Supplier Validation',
      );

      return;
    }

    if (
      this.isNew() &&
      !this.canCreate()
    ) {
      return;
    }

    // if (
    //   !this.isNew() &&
    //   !this.canEdit()
    // ) {
    //   return;
    // }

    const supplierCode =
      this.currentSupplierCode();

    this.confirmation.set({
      action: 'save',

      title:
        this.isNew()
          ? 'Create Supplier'
          : 'Update Supplier',

      message:
        this.isNew()
          ? `Create supplier ${supplierCode}?`
          : `Save the changes made to supplier ${supplierCode}?`,

      confirmText:
        this.isNew()
          ? 'Create Supplier'
          : 'Save Changes',

      note:
        this.isNew()
          ? 'The supplier code cannot be changed after creation.'
          : 'The latest supplier values will replace the current saved values.',
    });
  }


  requestDialogRefresh(): void {
    if (this.isDialogBusy()) {
      return;
    }

    if (this.isNew()) {
      if (this.editForm.dirty) {
        this.confirmation.set({
          action: 'reset',
          title: 'Reset New Supplier',
          message:
            'Clear all unsaved supplier values?',
          confirmText:
            'Reset Form',
          note:
            'The values currently entered in the form will be discarded.',
        });

        return;
      }

      this.resetDialog();
      return;
    }

    if (this.editForm.dirty) {
      this.confirmation.set({
        action: 'refresh',
        title: 'Refresh Supplier',
        message:
          'Reload the latest supplier record from the server?',
        confirmText:
          'Refresh Supplier',
        note:
          'Unsaved changes in the form will be discarded.',
      });

      return;
    }

    this.refreshDialogSupplier();
  }


  requestActivate(): void {
    this.requestStatusChange(
      'activate',
    );
  }


  requestDeactivate(): void {
    this.requestStatusChange(
      'deactivate',
    );
  }


  closeEditDialog(): void {
    if (this.isDialogBusy()) {
      return;
    }

    if (this.editForm.dirty) {
      this.confirmation.set({
        action: 'close',
        title: 'Discard Changes',
        message:
          'Close the Supplier dialog without saving?',
        confirmText:
          'Discard and Close',
        note:
          'All unsaved supplier changes will be lost.',
        danger: true,
      });

      return;
    }

    this.finishEditing();
  }


  cancelConfirmation(): void {
    this.confirmation.set(null);
  }


  confirmDialogAction(): void {
    const pending =
      this.confirmation();

    this.confirmation.set(null);

    if (!pending) {
      return;
    }

    switch (pending.action) {
      case 'save':
        this.executeSave();
        break;

      case 'reset':
        this.resetDialog();
        break;

      case 'refresh':
        this.refreshDialogSupplier();
        break;

      case 'activate':
        this.executeStatusChange(
          'activate',
        );
        break;

      case 'deactivate':
        this.executeStatusChange(
          'deactivate',
        );
        break;

      case 'close':
        this.finishEditing();
        break;
    }
  }


  get editDialogTitle(): string {
    return this.isNew()
      ? 'Add New Supplier'
      : 'Edit Supplier';
  }


  get editDialogDescription(): string {
    return this.isNew()
      ? 'Create a new supplier master record.'
      : 'Review and update the selected supplier master record.';
  }


  get saveButtonText(): string {
    if (this.facade.commandBusy()) {
      return 'Processing...';
    }

    return this.isNew()
      ? 'Create Supplier'
      : 'Save Changes';
  }


  get statusLabel(): string {
    return this.activeFlag() === 'Y'
      ? 'Active'
      : 'Inactive';
  }


  isDialogBusy(): boolean {
    return (
      this.facade.commandBusy() ||
      this.facade.detailLoading()
    );
  }


  canSubmitDialog(): boolean {
  return (
    !this.isDialogBusy() &&
    this.editForm.valid
  );
}

  // canSubmitDialog(): boolean {
  //   if (
  //     this.isDialogBusy() ||
  //     this.editForm.invalid
  //   ) {
  //     return false;
  //   }

  //   return this.isNew()
  //     ? this.canCreate()
  //     : this.canEdit();
  // }


  isDialogControlInvalid(
    controlName:
      SupplierDialogControlName,
  ): boolean {
    const control =
      this.editForm.controls[
        controlName
      ];

    return (
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }


  dialogValidationText(
    controlName:
      SupplierDialogControlName,
  ): string {
    const control =
      this.editForm.controls[
        controlName
      ];

    if (
      control.hasError('required')
    ) {
      return 'This field is required.';
    }

    if (
      control.hasError('email')
    ) {
      return 'Enter a valid email address.';
    }

    if (
      control.hasError('maxlength')
    ) {
      const error =
        control.getError(
          'maxlength',
        ) as {
          requiredLength?: number;
        } | null;

      return (
        `Maximum length is ` +
        `${error?.requiredLength ?? 0} ` +
        `characters.`
      );
    }

    return 'The value is invalid.';
  }


  normalizeSupplierCode(): void {
    if (!this.isNew()) {
      return;
    }

    this.editForm.controls
      .supplierCode
      .setValue(
        this.currentSupplierCode(),
        {
          emitEvent: false,
        },
      );
  }

  filterTaxProfiles(value: string): void {
  const search = value
    .trim()
    .toLowerCase();

  const source =
    this.facade.lookups().taxProfiles;

  if (!search) {
    this.filteredTaxProfiles.set(source);
    return;
  }

  this.filteredTaxProfiles.set(
    source.filter(item =>
      item.code.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.displayName.toLowerCase().includes(search),
    ),
  );
}


  refresh(): void {
    this.facade.reload();
    this.facade.reloadLookups();
  }


  clearFilters(): void {
    this.filterForm.reset(
      {
        search: '',
        supplierGroupCode: '',
        termsCode: '',
        currencyCode: '',
        taxProfileCode: '',
        activeFlag: 'Y',
      },
      {
        emitEvent: false,
      },
    );

    this.gridState.set({
      skip: 0,
      take: 50,

      sort: [
        {
          field: 'supplierName',
          dir: 'asc',
        },
      ],
    });

    this.commitQuery();
  }


  dataStateChange(
    state: DataStateChangeEvent,
  ): void {
    this.gridState.set({
      skip:
        state.skip ?? 0,

      take:
        state.take ?? 50,

      sort:
        state.sort?.length
          ? state.sort
          : [
              {
                field: 'supplierName',
                dir: 'asc',
              },
            ],
    });

    this.commitQuery();
  }


  statusClass(
    activeFlag: string,
  ): string {
    return activeFlag === 'Y'
      ? 'status-chip status-chip--active'
      : 'status-chip status-chip--inactive';
  }


  private executeSave(): void {
    if (this.isDialogBusy()) {
      return;
    }

    const wasNew =
      this.isNew();

    const supplierCode =
      this.currentSupplierCode();

    const userId =
      this.currentLoggedInUserId();

    if (!userId) {
      this.notifications.error(
        'The current logged-in user ID could not be determined. Please log out and log in again.',
        wasNew
          ? 'Save Failed'
          : 'Update Failed',
        supplierCode,
        'Supplier Master',
      );

      return;
    }

    if (
      userId.length >
      this.lengths.userId
    ) {
      this.notifications.error(
        `The current user ID cannot exceed ${this.lengths.userId} characters.`,
        wasNew
          ? 'Save Failed'
          : 'Update Failed',
        supplierCode,
        'Supplier Master',
      );

      return;
    }

    const writeRequest =
      this.buildWriteRequest();

    let command:
      Observable<SupplierCommandResult>;

    if (wasNew) {
      const request:
        SupplierCreateRequest = {
          ...writeRequest,
          supplierCode,
          userId,
        };

      command =
        this.facade.create(
          request,
        );
    } else {
      const request:
        SupplierUpdateRequest = {
          ...writeRequest,
          supplierCode,
          userId,
        };

      command =
        this.facade.update(
          supplierCode,
          request,
        );
    }

    command
      .pipe(
        take(1),
      )
      .subscribe({
        next: result => {
          this.handleSaveSuccess(
            result,
            wasNew,
          );
        },

        error: error => {
          this.notifications.error(
            this.facade.errorMessage(
              error,
            ),

            wasNew
              ? 'Save Failed'
              : 'Update Failed',

            supplierCode,
            'Supplier Master',
          );
        },
      });
  }


  private applyLiveFilters(): void {
    this.gridState.update(
      state => ({
        ...state,
        skip: 0,
      }),
    );

    this.commitQuery();
  }


  private requestStatusChange(
    action:
      'activate' |
      'deactivate',
  ): void {
    const allowed =
      action === 'activate'
        ? this.canActivateSupplier()
        : this.canDeactivateSupplier();

    if (!allowed) {
      return;
    }

    if (this.editForm.dirty) {
      this.notifications.warning(
        'Save or refresh the supplier before changing its active status.',
        'Unsaved Supplier Changes',
      );

      return;
    }

    const activate =
      action === 'activate';

    this.confirmation.set({
      action,

      title:
        activate
          ? 'Activate Supplier'
          : 'Deactivate Supplier',

      message:
        activate
          ? 'Activate this supplier?'
          : 'Deactivate this supplier?',

      confirmText:
        activate
          ? 'Activate Supplier'
          : 'Deactivate Supplier',

      note:
        activate
          ? 'The supplier will become available in active supplier selections.'
          : 'The supplier will remain in historical records but will be excluded from active supplier selections.',

      danger:
        !activate,
    });
  }


  private executeStatusChange(
    action:
      'activate' |
      'deactivate',
  ): void {
    const supplierCode =
      this.currentSupplierCode();

    if (!supplierCode) {
      return;
    }

    const request:
      SupplierStatusRequest = {};

    const command =
      action === 'activate'
        ? this.facade.activate(
            supplierCode,
            request,
          )
        : this.facade.deactivate(
            supplierCode,
            request,
          );

    command
      .pipe(
        take(1),
      )
      .subscribe({
        next: result => {
          this.applySupplier(
            result.supplier,
          );

          this.facade.reload();

          this.notifications.success(
            result.message,

            action === 'activate'
              ? 'Supplier Activated'
              : 'Supplier Deactivated',

            supplierCode,
            'Supplier Master',
          );
        },

        error: error => {
          this.notifications.error(
            this.facade.errorMessage(
              error,
            ),

            action === 'activate'
              ? 'Activation Failed'
              : 'Deactivation Failed',

            supplierCode,
            'Supplier Master',
          );
        },
      });
  }


  private resetDialog(): void {
    this.facade.clearDialogErrors();

    this.isNew.set(true);
    this.activeFlag.set('Y');

    this.resetNewSupplierForm();
  }


  private refreshDialogSupplier(): void {
    const supplierCode =
      this.currentSupplierCode();

    if (!supplierCode) {
      return;
    }

    this.facade.clearDialogErrors();
    this.facade.reloadLookups();

    this.editForm.disable({
      emitEvent: false,
    });

    this.loadDialogSupplier(
      supplierCode,
    );
  }


  private loadDialogSupplier(
    supplierCode: string,
  ): void {
    this.facade
      .loadSupplierByCode(
        supplierCode,
      )
      .pipe(
        take(1),
      )
      .subscribe({
        next: supplier => {
          this.applySupplier(
            supplier,
          );
        },

        error: error => {
          this.syncDialogFormAccess();

          this.notifications.error(
            this.facade.errorMessage(
              error,
            ),
            'Supplier Load Failed',
            supplierCode,
            'Supplier Master',
          );
        },
      });
  }


  private handleSaveSuccess(
    result:
      SupplierCommandResult,

    wasNew:
      boolean,
  ): void {
    const supplierCode =
      result.supplier.supplierCode;

    this.notifications.success(
      result.message,

      wasNew
        ? 'Supplier Created'
        : 'Supplier Updated',

      supplierCode,
      'Supplier Master',
    );

    if (result.warningMessage) {
      this.notifications.warning(
        result.warningMessage,
        'Possible Similar Supplier',
        supplierCode,
        'Supplier Master',
      );
    }

    this.finishEditing();

    if (wasNew) {
      this.focusCreatedSupplier(
        supplierCode,
      );

      return;
    }

    this.facade.reload();
  }


  private resetNewSupplierForm(): void {
    this.editForm.reset(
      {
        supplierCode: '',
        supplierName: '',
        supplierGroupCode: '',

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

        modifiedBy:
          this.currentLoggedInUserId(),

        modifiedDate:
          'Assigned after saving',
      },
      {
        emitEvent: false,
      },
    );

    this.syncDialogFormAccess();

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }


  private seedEditForm(
    item: SupplierListItem,
  ): void {
    this.editForm.reset(
      {
        supplierCode:
          item.supplierCode,

        supplierName:
          item.supplierName,

        supplierGroupCode:
          item.supplierGroupCode,

        addressLine1: '',
        addressLine2: '',
        addressLine3: '',

        contactPerson:
          item.contactPerson ?? '',

        positionTitle: '',

        telephone:
          item.telephone ?? '',

        fax: '',

        email:
          item.email ?? '',

        website: '',

        termsCode:
          item.termsCode ?? '',

        currencyCode:
          item.currencyCode ?? '',

        taxProfileCode:
          item.taxProfileCode ?? '',

        tinNo:
          item.tinNo ?? '',

        specialties: '',

        modifiedBy:
          item.modifiedBy,

        modifiedDate:
          this.formatModifiedDate(
            item.modifiedDate,
          ),
      },
      {
        emitEvent: false,
      },
    );

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }


  private applySupplier(
    supplier: SupplierDetail,
  ): void {
    this.isNew.set(false);

    this.activeFlag.set(
      supplier.activeFlag,
    );

    this.editForm.reset(
      {
        supplierCode:
          supplier.supplierCode,

        supplierName:
          supplier.supplierName,

        supplierGroupCode:
          supplier.supplierGroupCode,

        addressLine1:
          supplier.addressLine1 ?? '',

        addressLine2:
          supplier.addressLine2 ?? '',

        addressLine3:
          supplier.addressLine3 ?? '',

        contactPerson:
          supplier.contactPerson ?? '',

        positionTitle:
          supplier.positionTitle ?? '',

        telephone:
          supplier.telephone ?? '',

        fax:
          supplier.fax ?? '',

        email:
          supplier.email ?? '',

        website:
          supplier.website ?? '',

        termsCode:
          supplier.termsCode ?? '',

        currencyCode:
          supplier.currencyCode ?? '',

        taxProfileCode:
          supplier.taxProfileCode ?? '',

        tinNo:
          supplier.tinNo ?? '',

        specialties:
          supplier.specialties ?? '',

        modifiedBy:
          supplier.modifiedBy,

        modifiedDate:
          this.formatModifiedDate(
            supplier.modifiedDate,
          ),
      },
      {
        emitEvent: false,
      },
    );

    this.syncDialogFormAccess();

    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }


  private syncDialogFormAccess(): void {
  // Always enable supplier fields
  this.editForm.enable({
    emitEvent: false,
  });

  // Existing Supplier Code must remain locked
  if (!this.isNew()) {
    this.editForm.controls.supplierCode.disable({
      emitEvent: false,
    });
  }

  // System-controlled fields
  this.editForm.controls.modifiedBy.disable({
    emitEvent: false,
  });

  this.editForm.controls.modifiedDate.disable({
    emitEvent: false,
  });
}

  // private syncDialogFormAccess(): void {
  //   const editable =
  //     this.isNew()
  //       ? this.canCreate()
  //       : this.canEdit();

  //   if (editable) {
  //     this.editForm.enable({
  //       emitEvent: false,
  //     });
  //   } else {
  //     this.editForm.disable({
  //       emitEvent: false,
  //     });
  //   }

  //   if (!this.isNew()) {
  //     this.editForm.controls
  //       .supplierCode
  //       .disable({
  //         emitEvent: false,
  //       });
  //   }

  //   this.editForm.controls
  //     .modifiedBy
  //     .disable({
  //       emitEvent: false,
  //     });

  //   this.editForm.controls
  //     .modifiedDate
  //     .disable({
  //       emitEvent: false,
  //     });
  // }


  private buildWriteRequest():
    SupplierWriteRequest {
    const raw =
      this.editForm.getRawValue();

    return {
      supplierName:
        raw.supplierName.trim(),

      supplierGroupCode:
        raw.supplierGroupCode
          .trim()
          .toUpperCase(),

      addressLine1:
        this.optional(
          raw.addressLine1,
        ),

      addressLine2:
        this.optional(
          raw.addressLine2,
        ),

      addressLine3:
        this.optional(
          raw.addressLine3,
        ),

      contactPerson:
        this.optional(
          raw.contactPerson,
        ),

      positionTitle:
        this.optional(
          raw.positionTitle,
        ),

      telephone:
        this.optional(
          raw.telephone,
        ),

      fax:
        this.optional(
          raw.fax,
        ),

      email:
        this.optional(
          raw.email,
        ),

      tinNo:
        this.optional(
          raw.tinNo,
        ),

      termsCode:
        this.optionalUpper(
          raw.termsCode,
        ),

      currencyCode:
        this.optionalUpper(
          raw.currencyCode,
        ),

      website:
        this.optional(
          raw.website,
        ),

      specialties:
        this.optional(
          raw.specialties,
        ),

      taxProfileCode:
        this.optionalUpper(
          raw.taxProfileCode,
        ),
    };
  }


  private focusCreatedSupplier(
    supplierCode: string,
  ): void {
    this.filterForm.reset(
      {
        search:
          supplierCode,

        supplierGroupCode: '',
        termsCode: '',
        currencyCode: '',
        taxProfileCode: '',
        activeFlag: 'Y',
      },
      {
        emitEvent: false,
      },
    );

    this.gridState.set({
      skip: 0,
      take: 50,

      sort: [
        {
          field: 'supplierName',
          dir: 'asc',
        },
      ],
    });

    this.commitQuery();
  }


  private commitQuery(): void {
    const raw =
      this.filterForm.getRawValue();

    const state =
      this.gridState();

    const sort =
      state.sort?.[0];

    const query:
      SupplierListQuery = {
        search:
          this.optional(
            raw.search,
          ),

        supplierGroupCode:
          this.optional(
            raw.supplierGroupCode,
          ),

        termsCode:
          this.optional(
            raw.termsCode,
          ),

        currencyCode:
          this.optional(
            raw.currencyCode,
          ),

        taxProfileCode:
          this.optional(
            raw.taxProfileCode,
          ),

        activeFlag:
          raw.activeFlag,

        skip:
          state.skip ?? 0,

        take:
          state.take ?? 50,

        sortField:
          typeof sort?.field ===
          'string'
            ? sort.field
            : 'supplierName',

        sortDirection:
          sort?.dir === 'desc'
            ? 'desc'
            : 'asc',
      };

    this.facade.commitQuery(
      query,
    );
  }


  private finishEditing(): void {
    this.confirmation.set(null);

    this.isEditDialogOpen.set(false);

    this.isNew.set(true);
    this.activeFlag.set('Y');

    this.facade.clearDialogErrors();

    this.resetNewSupplierForm();
  }


  private currentSupplierCode():
    string {
    return this.editForm.controls
      .supplierCode
      .value
      .trim()
      .toUpperCase();
  }


  private currentLoggedInUserId():
    string {
    return (
      this.auth.userId() ?? ''
    )
      .trim()
      .toUpperCase();
  }


  private optional(
    value: string,
  ): string | null {
    const cleanValue =
      value.trim();

    return cleanValue || null;
  }


  private optionalUpper(
    value: string,
  ): string | null {
    const cleanValue =
      value
        .trim()
        .toUpperCase();

    return cleanValue || null;
  }


  private formatModifiedDate(
    value?: string | null,
  ): string {
    if (!value) {
      return 'Not provided by API';
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime(),
    )
      ? value
      : date.toLocaleString();
  }
}