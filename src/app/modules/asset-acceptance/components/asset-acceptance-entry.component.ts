import { CommonModule } from '@angular/common';
import {
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
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import {
  DropDownFilterSettings,
  DropDownsModule,
} from '@progress/kendo-angular-dropdowns';
import { GridModule } from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { LabelModule } from '@progress/kendo-angular-label';
import {
  pencilIcon,
  plusCircleIcon,
  trashIcon,
} from '@progress/kendo-svg-icons';

import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';
import {
  ErpSaveConfirmDialogComponent as ActionConfirmDialogComponent,
  ErpSaveConfirmDialogData as ActionConfirmDialogData,
} from '../../../shared/NOTIFICATION-confirm-dialog/erp-save-confirm-dialog.component';
import {
  ErpSaveConfirmDialogComponent as SaveConfirmDialogComponent,
  ErpSaveConfirmDialogData as SaveConfirmDialogData,
} from '../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';
import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';
import { AssetAcceptanceFacade } from '../data-access/asset-acceptance.facade';
import {
  AcquisitionMode,
  AssetAcceptanceDetail,
  AssetAcceptanceDocument,
  AssetAcceptanceSaveDetail,
  AssetAcceptanceSaveRequest,
  AssetAcceptanceStatus,
  FixedAssetPoLineLookup,
  FixedAssetPoLookup,
  TrackingMode,
  WorkflowRequest,
} from '../models/asset-acceptance.models';

type WorkflowAction = 'submit' | 'accept' | 'post' | 'delete' | 'cancel';

@Component({
  selector: 'app-asset-acceptance-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    DialogModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    LabelModule,
    AppToolbarComponent,
  ],
  providers: [AssetAcceptanceFacade],
  templateUrl: './asset-acceptance-entry.component.html',
  styleUrl: './asset-acceptance-entry.component.scss',
})
export class AssetAcceptanceEntryComponent implements OnDestroy {
  readonly facade = inject(AssetAcceptanceFacade);
  readonly toolbar = inject(AppToolbarService);

  readonly plusIcon = plusCircleIcon;
  readonly trashIcon = trashIcon;
  readonly editIcon = pencilIcon;

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(DialogService);
  private readonly notify = inject(ErpNotificationService);
  private readonly auth = inject(AuthFacadeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<AssetAcceptanceStatus>('DRAFT');

  readonly rowVersion = signal<string | null>(null);

  readonly details = signal<AssetAcceptanceDetail[]>([]);

  readonly selectedPo = signal<FixedAssetPoLookup | null>(null);

  readonly selectedPoLine = signal<FixedAssetPoLineLookup | null>(null);

  readonly editingLineNo = signal<number | null>(null);

  readonly formValid = signal(false);
  readonly validationMessage = signal('');

  readonly accountFilterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains',
  };

  // readonly form = this.fb.group({
  //   assetAcceptanceNo: [''],
  //   acceptanceDate: [new Date(), Validators.required],
  //   poNo: ['', Validators.required],
  //   suppCode: ['', Validators.required],
  //   suppName: [''],
  //   assetCategoryCode: ['', Validators.required],
  //   branchName: ['', Validators.required],
  //   department: ['', Validators.required],
  //   receivedBy: ['', Validators.required],
  //   acceptedBy: ['', Validators.required],
  //   inServiceDate: [new Date(), Validators.required],
  //   assetLocationCode: ['', Validators.required],
  //   //acquisitionMode: ['CASH' as AcquisitionMode, Validators.required],
  //   acquisitionMode: ['NORMAL AP' as AcquisitionMode, Validators.required],
  //   downpaymentAmount: [0, [Validators.required, Validators.min(0)]],
  //   financedAmount: [0, [Validators.required, Validators.min(0)]],
  //   financingCompany: ['N/A'],
  //   loanReference: ['N/A'],
  //   remarks: [''],
  // });

  readonly form = this.fb.group({
    assetAcceptanceNo: [''],

    acceptanceDate: [new Date(), Validators.required],

    poNo: ['', Validators.required],

    suppCode: ['', Validators.required],

    suppName: [''],

    assetCategoryCode: ['', Validators.required],

    branchName: ['', Validators.required],

    department: ['', Validators.required],

    receivedBy: ['', Validators.required],

    acceptedBy: ['', Validators.required],

    inServiceDate: [new Date(), Validators.required],

    assetLocationCode: ['', Validators.required],

    // ==========================================================
    // OLD CODE - COMMENTED ONLY
    // ==========================================================

    // acquisitionMode: [
    //   'CASH' as AcquisitionMode,
    //   Validators.required,
    // ],

    // ==========================================================
    // NEW CODE
    // ==========================================================

    acquisitionMode: ['NORMAL AP' as AcquisitionMode, Validators.required],

    downpaymentAmount: [0, [Validators.required, Validators.min(0)]],

    financedAmount: [0, [Validators.required, Validators.min(0)]],

    financingCompany: ['N/A'],
    loanReference: ['N/A'],
    remarks: [''],
  });

  readonly lineForm = this.fb.group({
    poSeq: [0, Validators.required],
    assetCode: ['', Validators.required],
    description: ['', Validators.required],
    qty: [1, [Validators.required, Validators.min(0.0001)]],
    openPoQty: [0],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    trackingMode: ['INDIVIDUAL' as TrackingMode, Validators.required],
    serialNo: [''],
    engineNo: [''],
    chassisNo: [''],
    plateNo: [''],
    warrantyInfo: [''],
    conditionStatus: ['GOOD', Validators.required],
    remarks: [''],
    depreciationMethodCode: ['', Validators.required],
    usefulLifeMonths: [60, [Validators.required, Validators.min(1)]],
    residualValue: [0, [Validators.required, Validators.min(0)]],
    depreciationStartDate: [new Date(), Validators.required],
    assetCostAccount: ['', Validators.required],
    depreciationExpenseAccount: ['', Validators.required],
    accumulatedDepreciationAccount: ['', Validators.required],
    custodianCode: ['', Validators.required],
    assetLocationCode: ['', Validators.required],
  });

  readonly isEditable = computed(
    () => this.status() === 'DRAFT' && !this.facade.commandBusy(),
  );

  readonly canSave = computed(
    () => this.isEditable() && this.formValid() && this.details().length > 0,
  );

  readonly canPost = computed(
    () =>
      this.status() === 'ACCEPTED' &&
      !!this.documentNo() &&
      !this.facade.commandBusy(),
  );

  readonly totalQty = computed(() =>
    this.details().reduce((sum, row) => sum + Number(row.qty || 0), 0),
  );

  readonly totalCost = computed(() =>
    this.details().reduce(
      (sum, row) => sum + Number(row.qty || 0) * Number(row.unitCost || 0),
      0,
    ),
  );

  readonly financingBalance = computed(
    () =>
      Number(this.form.controls.downpaymentAmount.value || 0) +
      Number(this.form.controls.financedAmount.value || 0),
  );

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showSave: true,
      showPost: true,
      showList: true,
    });

    this.formValid.set(this.form.valid);

    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formValid.set(this.form.valid);
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const documentNo = params.get('assetAcceptanceNo');

        if (documentNo) {
          this.facade.loadDocument(documentNo);
        } else {
          this.reset();
        }
      });

    effect(() => {
      const document = this.facade.document();

      if (document) {
        this.applyDocument(document);
      }
    });
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  // documentNo(): string {
  //   return this.form.controls.assetAcceptanceNo.value?.trim() || '';
  // }

  documentNo(): string {
    const routeDocumentNo = String(
      this.route.snapshot.paramMap.get('assetAcceptanceNo') ?? '',
    ).trim();

    if (
      routeDocumentNo &&
      routeDocumentNo.toLowerCase() !== 'new'
    ) {
      return routeDocumentNo;
    }

    return String(
      this.form.controls.assetAcceptanceNo.value ?? '',
    ).trim();
  }

  newDocument(): void {
    this.reset();

    void this.router.navigate(['/acceptance/new']);
  }

  goToList(): void {
    void this.router.navigate(['/acceptance']);
  }

  print(): void {
    if (!this.documentNo()) {
      this.notify.warning('Save the document before printing.', 'Print');

      return;
    }

    window.print();
  }

  poChanged(po: FixedAssetPoLookup | null): void {
    if (!this.isEditable()) {
      return;
    }

    const currentPoNo = this.form.controls.poNo.value?.trim() || '';

    const nextPoNo = po?.poNo?.trim() || '';

    if (currentPoNo === nextPoNo) {
      this.selectedPo.set(po);
      this.facade.selectPo(nextPoNo);
      return;
    }

    if (currentPoNo && this.details().length > 0) {
      const data: ActionConfirmDialogData = {
        title: 'Change Fixed Asset PO',
        message: 'Changing the PO will remove all configured acceptance lines.',
        moduleName: 'Asset Acceptance',
        documentNo: this.documentNo() || 'DRAFT',
        status: this.status(),
        effectText: 'All currently configured asset lines will be cleared.',
        confirmText: 'Change PO',
        cancelText: 'Keep Current PO',
      };

      this.openDialog(ActionConfirmDialogComponent, data, () =>
        this.applySelectedPo(po),
      );

      return;
    }

    this.applySelectedPo(po);
  }

  poLineChanged(line: FixedAssetPoLineLookup | null): void {
    this.selectedPoLine.set(line);
  }

  preparePoLine(): void {
    const line = this.selectedPoLine();

    if (!line || !this.isEditable()) {
      return;
    }

    const alreadyConfigured = this.usedQtyForPoLine(line.poSeq, null);

    const remaining = Number(line.openQty) - alreadyConfigured;

    if (remaining <= 0) {
      this.notify.warning(
        'This PO line has no remaining quantity available in the current document.',
        'No Open Quantity',
      );

      return;
    }

    this.editingLineNo.set(null);

    this.lineForm.enable({
      emitEvent: false,
    });

    this.lineForm.reset({
      poSeq: line.poSeq,
      assetCode: line.assetCode,
      description: line.description,
      qty: Math.min(1, remaining),
      openPoQty: line.openQty,
      unitCost: line.unitCost,
      trackingMode: 'INDIVIDUAL',
      serialNo: '',
      engineNo: '',
      chassisNo: '',
      plateNo: '',
      warrantyInfo: '',
      conditionStatus: 'GOOD',
      remarks: '',
      depreciationMethodCode: '',
      usefulLifeMonths: 60,
      residualValue: 0,
      depreciationStartDate:
        this.form.controls.inServiceDate.value ?? new Date(),
      assetCostAccount: '',
      depreciationExpenseAccount: '',
      accumulatedDepreciationAccount: '',
      custodianCode: '',
      assetLocationCode: this.form.controls.assetLocationCode.value ?? '',
    });
  }

  saveLine(): void {
    this.validationMessage.set('');

    if (!this.isEditable()) {
      return;
    }

    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();

      this.validationMessage.set(
        'Complete all required asset, depreciation, account, custodian, and location fields.',
      );

      return;
    }

    const value = this.lineForm.getRawValue();

    const requestedQty = Number(value.qty);

    const capacity = Number(value.openPoQty);

    if (value.trackingMode === 'INDIVIDUAL' && requestedQty !== 1) {
      this.validationMessage.set('Individual tracking requires quantity 1.');

      return;
    }

    const lineNo = this.editingLineNo() ?? this.nextLineNo();

    const alreadyUsed = this.usedQtyForPoLine(Number(value.poSeq), lineNo);

    if (alreadyUsed + requestedQty > capacity) {
      this.validationMessage.set(
        `The total accepted quantity for PO sequence ${value.poSeq} cannot exceed ${capacity}.`,
      );

      return;
    }

    const row: AssetAcceptanceDetail = {
      lineNo,
      poSeq: Number(value.poSeq),
      assetCode: value.assetCode?.trim() ?? '',
      description: value.description?.trim() ?? '',
      qty: requestedQty,
      openPoQty: capacity,
      unitCost: Number(value.unitCost),
      trackingMode: value.trackingMode as TrackingMode,
      serialNo: value.serialNo?.trim() ?? '',
      engineNo: value.engineNo?.trim() ?? '',
      chassisNo: value.chassisNo?.trim() ?? '',
      plateNo: value.plateNo?.trim() ?? '',
      warrantyInfo: value.warrantyInfo?.trim() ?? '',
      conditionStatus: value.conditionStatus?.trim() ?? '',
      remarks: value.remarks?.trim() ?? '',
      depreciationMethodCode: value.depreciationMethodCode?.trim() ?? '',
      usefulLifeMonths: Number(value.usefulLifeMonths),
      residualValue: Number(value.residualValue),
      depreciationStartDate: this.dateOnly(value.depreciationStartDate),
      assetCostAccount: value.assetCostAccount?.trim() ?? '',
      depreciationExpenseAccount:
        value.depreciationExpenseAccount?.trim() ?? '',
      accumulatedDepreciationAccount:
        value.accumulatedDepreciationAccount?.trim() ?? '',
      custodianCode: value.custodianCode?.trim() ?? '',
      assetLocationCode: value.assetLocationCode?.trim() ?? '',
    };

    const duplicate = this.duplicateIdentifier(row, lineNo);

    if (duplicate) {
      this.validationMessage.set(
        `${duplicate} is already used by another detail line.`,
      );

      return;
    }

    this.details.update((rows) =>
      [...rows.filter((item) => item.lineNo !== lineNo), row].sort(
        (a, b) => a.lineNo - b.lineNo,
      ),
    );

    this.clearLineEditor();
  }

  editLine(row: AssetAcceptanceDetail): void {
    if (!this.isEditable()) {
      return;
    }

    this.editingLineNo.set(row.lineNo);

    this.lineForm.enable({
      emitEvent: false,
    });

    this.lineForm.reset({
      ...row,
      depreciationStartDate: this.asDate(row.depreciationStartDate),
    });
  }

  removeLine(row: AssetAcceptanceDetail): void {
    if (!this.isEditable()) {
      return;
    }

    this.confirmAction(
      'delete',
      `Remove detail line ${row.lineNo}?`,
      'Remove Line',
      () => {
        this.details.update((rows) =>
          rows.filter((item) => item.lineNo !== row.lineNo),
        );
      },
      true,
    );
  }

  clearLineEditor(): void {
    this.editingLineNo.set(null);
    this.selectedPoLine.set(null);
    this.validationMessage.set('');

    this.lineForm.reset({
      poSeq: 0,
      assetCode: '',
      description: '',
      qty: 1,
      openPoQty: 0,
      unitCost: 0,
      trackingMode: 'INDIVIDUAL',
      serialNo: '',
      engineNo: '',
      chassisNo: '',
      plateNo: '',
      warrantyInfo: '',
      conditionStatus: 'GOOD',
      remarks: '',
      depreciationMethodCode: '',
      usefulLifeMonths: 60,
      residualValue: 0,
      depreciationStartDate: new Date(),
      assetCostAccount: '',
      depreciationExpenseAccount: '',
      accumulatedDepreciationAccount: '',
      custodianCode: '',
      assetLocationCode: '',
    });
  }

  requestSave(): void {
    if (this.facade.commandBusy()) {
      return;
    }

    if (!this.isEditable()) {
      this.notify.warning(
        'Only Draft documents can be edited and saved.',
        'Read-only Document',
      );

      return;
    }

    const validation = this.validateDocument();

    if (validation) {
      this.notify.warning(validation, 'Review Asset Acceptance');

      return;
    }

    const data: SaveConfirmDialogData = {
      title: this.documentNo()
        ? 'Update Asset Acceptance'
        : 'Save Asset Acceptance',
      moduleName: 'Asset Acceptance',
      documentNo: this.documentNo() || 'AUTO-GENERATED / DRAFT',
      status: this.status(),
      effectText:
        'This saves the draft header, physical identifiers, depreciation setup, and GL mappings.',
      confirmText: this.documentNo() ? 'Update Draft' : 'Save Draft',
    };

    this.openDialog(
      SaveConfirmDialogComponent,
      data,
      () => this.executeSave(),
    );
  }

  requestWorkflow(action: WorkflowAction): void {
    if (this.facade.commandBusy()) {
      return;
    }

    const no = this.documentNo();

    if (!no) {
      this.notify.warning('Save the document first.', 'Workflow');

      return;
    }

    const messages: Record<WorkflowAction, string> = {
      submit: 'Submit this Draft document for acceptance review?',
      accept: 'Accept this inspected fixed-asset delivery?',
      post: 'Post this acceptance and create Asset Master records?',
      delete: 'Permanently delete this Draft document?',
      cancel: 'Cancel this document? Cancellation is final for this workflow.',
    };

    this.confirmAction(
      action,
      messages[action],
      `${this.actionLabel(action)} Asset Acceptance`,
      () => this.executeWorkflow(action),
    );
  }

  private applySelectedPo(po: FixedAssetPoLookup | null): void {
    this.selectedPo.set(po);
    this.selectedPoLine.set(null);
    this.details.set([]);
    this.clearLineEditor();

    this.form.patchValue({
      poNo: po?.poNo ?? '',
      suppCode: po?.suppCode ?? '',
      suppName: po?.suppName ?? '',
      branchName: po?.branchName ?? this.form.controls.branchName.value,
    });

    this.facade.selectPo(po?.poNo ?? '');
  }

  // private executeSave(): void {
  //   const no = this.documentNo();
  //   const request = this.buildRequest();

  //   const source = no
  //     ? this.facade.update(no, request)
  //     : this.facade.create(request);

  //   source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
  //     next: (result) => {
  //       this.status.set(result.status);

  //       this.rowVersion.set(result.rowVersion);

  //       this.form.controls.assetAcceptanceNo.setValue(result.assetAcceptanceNo);

  //       this.notify.success(
  //         result.message || 'Asset acceptance saved.',
  //         'Save Successful',
  //         result.assetAcceptanceNo,
  //         'Asset Acceptance',
  //       );

  //       if (!no) {
  //         void this.router.navigate(['/acceptance', result.assetAcceptanceNo]);
  //       } else {
  //         this.facade.reloadDocument();
  //       }
  //     },
  //     error: (error) =>
  //       this.notify.error(
  //         this.facade.errorMessage(error),
  //         'Save Failed',
  //         no,
  //         'Asset Acceptance',
  //       ),
  //   });
  // }

  // ============================================================
  // SAVE WITH LOCAL AND API ERROR HANDLING
  // ============================================================

  private executeSave(): void {
    const documentNo = this.documentNo();

    const isUpdate = documentNo.length > 0;

    try {
      /*
       * Prevent duplicate save requests.
       */
      if (this.facade.commandBusy()) {
        this.notify.warning(
          'Another Asset Acceptance command is still running.',
          isUpdate ? 'Update In Progress' : 'Save In Progress',
          documentNo || undefined,
          'Asset Acceptance',
        );

        return;
      }

      /*
       * An existing record must contain its current Row Version.
       */
      if (isUpdate && !this.rowVersion()) {
        this.notify.error(
          'The current Row Version is missing. Reload the existing document before updating.',
          'Update Failed',
          documentNo,
          'Asset Acceptance',
        );

        return;
      }

      /*
       * This can throw a local error when a required date
       * or another request value is invalid.
       */
      const request = this.buildRequest();

      const source = isUpdate
        ? this.facade.update(
            documentNo,
            request,
          )
        : this.facade.create(
            request,
          );

      source
        .pipe(
          takeUntilDestroyed(
            this.destroyRef,
          ),
        )
        .subscribe({
          next: (result) => {
            try {
              const savedDocumentNo = String(
                result?.assetAcceptanceNo ?? '',
              ).trim();

              /*
               * The API must return the saved document number.
               */
              if (!savedDocumentNo) {
                this.notify.error(
                  'The API did not return an Asset Acceptance Number.',
                  isUpdate
                    ? 'Update Failed'
                    : 'Save Failed',
                  documentNo || undefined,
                  'Asset Acceptance',
                );

                return;
              }

              /*
               * Save the latest Row Version returned by the API.
               */
              const savedRowVersion = String(
                result?.rowVersion ?? '',
              ).trim();

              this.status.set(result.status);

              this.rowVersion.set(
                savedRowVersion || null,
              );

              this.form.controls.assetAcceptanceNo.setValue(
                savedDocumentNo,
                {
                  emitEvent: false,
                },
              );

              this.notify.success(
                result.message ||
                  (
                    isUpdate
                      ? 'Asset acceptance updated successfully.'
                      : 'Asset acceptance created successfully.'
                  ),
                isUpdate
                  ? 'Update Successful'
                  : 'Save Successful',
                savedDocumentNo,
                'Asset Acceptance',
              );

              /*
               * CREATE:
               * Replace /new with the generated document number.
               */
              if (!isUpdate) {
                this.facade.loadDocument(
                  savedDocumentNo,
                );

                void this.router.navigate(
                  [
                    '/acceptance',
                    savedDocumentNo,
                  ],
                  {
                    replaceUrl: true,
                  },
                );

                return;
              }

              /*
               * UPDATE:
               * Reload the document and latest Row Version.
               */
              this.facade.loadDocument(
                savedDocumentNo,
              );

              this.facade.reloadDocument();
            } catch (error: unknown) {
              this.notify.error(
                this.getSaveErrorMessage(
                  error,
                  'The server returned an invalid Asset Acceptance save response.',
                ),
                isUpdate
                  ? 'Update Failed'
                  : 'Save Failed',
                documentNo || undefined,
                'Asset Acceptance',
              );
            }
          },

          /*
           * Handles API, HTTP, SQL, authorization,
           * validation, network and server errors.
           */
          error: (error: unknown) => {
            this.notify.error(
              this.facade.errorMessage(
                error,
              ),
              isUpdate
                ? 'Update Failed'
                : 'Save Failed',
              documentNo || undefined,
              'Asset Acceptance',
            );
          },
        });
    } catch (error: unknown) {
      /*
       * Handles synchronous errors occurring before
       * the HTTP request is sent.
       */
      this.notify.error(
        this.getSaveErrorMessage(
          error,
          isUpdate
            ? 'Unable to prepare the Asset Acceptance update request.'
            : 'Unable to prepare the Asset Acceptance save request.',
        ),
        isUpdate
          ? 'Update Failed'
          : 'Save Failed',
        documentNo || undefined,
        'Asset Acceptance',
      );
    }
  }

  // ============================================================
  // SAVE ERROR MESSAGE HELPER
  // ============================================================

  private getSaveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
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
      const value = error as {
        error?:
          | string
          | {
              message?: string;
              detail?: string;
              error?: string;
              title?: string;
              errors?: Record<string, string[] | string>;
            };

        message?: string;
        statusText?: string;
      };

      if (typeof value.error === 'string') {
        const message = value.error.trim();

        if (message) {
          return message;
        }
      }

      if (
        typeof value.error === 'object' &&
        value.error !== null
      ) {
        const apiMessage =
          value.error.message ||
          value.error.detail ||
          value.error.error ||
          value.error.title;

        if (apiMessage?.trim()) {
          return apiMessage.trim();
        }

        if (value.error.errors) {
          const validationMessages = Object.values(
            value.error.errors,
          )
            .flatMap((entry) =>
              Array.isArray(entry)
                ? entry
                : [entry],
            )
            .map((entry) =>
              String(entry ?? '').trim(),
            )
            .filter((entry) => entry.length > 0);

          if (validationMessages.length > 0) {
            return validationMessages.join(' ');
          }
        }
      }

      if (value.message?.trim()) {
        return value.message.trim();
      }

      if (value.statusText?.trim()) {
        return value.statusText.trim();
      }
    }

    return fallback;
  }

  private executeWorkflow(action: WorkflowAction): void {
    const no = this.documentNo();

    const request: WorkflowRequest = {
      userId: this.currentUserId(),
      rowVersion: this.rowVersion(),
      reason: action === 'cancel' ? 'Cancelled by user.' : null,
    };

    const source =
      action === 'submit'
        ? this.facade.submit(no, request)
        : action === 'accept'
          ? this.facade.accept(no, request)
          : action === 'post'
            ? this.facade.post(no, request)
            : action === 'delete'
              ? this.facade.delete(no, request)
              : this.facade.cancel(no, request);

    source
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (result) => {
          this.status.set(result.status);

          this.rowVersion.set(result.rowVersion);

          this.syncReadOnly();

          this.notify.success(
            result.message,
            `${this.actionLabel(action)} Successful`,
            no,
            'Asset Acceptance',
          );

          if (action === 'delete') {
            this.goToList();

            return;
          }

          this.facade.reloadDocument();
        },

        error: (error) =>
          this.notify.error(
            this.facade.errorMessage(error),
            `${this.actionLabel(action)} Failed`,
            no,
            'Asset Acceptance',
          ),
      });
  }

  private buildRequest(): AssetAcceptanceSaveRequest {
    const value = this.form.getRawValue();

    const details: AssetAcceptanceSaveDetail[] = this.details().map((row) => {
      const {
        openPoQty: _openPoQty,
        ...saveRow
      } = row;

      return saveRow;
    });

    const acquisitionMode: AcquisitionMode =
      value.acquisitionMode ?? 'NORMAL AP';

    return {
      header: {
        assetAcceptanceNo: this.documentNo(),

        acceptanceDate: this.dateOnly(value.acceptanceDate),

        poNo: value.poNo?.trim() ?? '',

        suppCode: value.suppCode?.trim() ?? '',

        assetCategoryCode: value.assetCategoryCode?.trim() ?? '',

        branchName: value.branchName?.trim() ?? '',

        department: value.department?.trim() ?? '',

        receivedBy: value.receivedBy?.trim() ?? '',

        acceptedBy: value.acceptedBy?.trim() ?? '',

        inServiceDate: this.dateOnly(value.inServiceDate),

        assetLocationCode: value.assetLocationCode?.trim() ?? '',

        acquisitionMode,

        downpaymentAmount: Number(
          value.downpaymentAmount ?? 0,
        ),

        financedAmount: Number(
          value.financedAmount ?? 0,
        ),

        financingCompany:
          value.financingCompany?.trim() || null,

        loanReference:
          value.loanReference?.trim() || null,

        remarks:
          value.remarks?.trim() || null,

        userId: this.currentUserId(),

        rowVersion: this.rowVersion(),
      },

      details,
    };
  }

  private validateDocument(): string | null {
    if (!this.currentUserId()) {
      return 'The current user session does not contain a user ID.';
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return 'Complete all required header fields.';
    }

    if (!this.details().length) {
      return 'Add at least one open fixed-asset PO line.';
    }

    if (
      this.form.controls.acquisitionMode.value === 'FINANCED' &&
      (
        !this.form.controls.financingCompany.value?.trim() ||
        !this.form.controls.loanReference.value?.trim() ||
        Number(this.form.controls.financedAmount.value) <= 0
      )
    ) {
      return 'Financed acquisition requires a financing company, loan reference, and financed amount.';
    }

    const grouped = new Map<
      number,
      {
        total: number;
        capacity: number;
      }
    >();

    for (const row of this.details()) {
      if (
        row.trackingMode === 'INDIVIDUAL' &&
        row.qty !== 1
      ) {
        return `Line ${row.lineNo}: individual tracking requires quantity 1.`;
      }

      const current = grouped.get(row.poSeq) ?? {
        total: 0,
        capacity: Number(row.openPoQty),
      };

      current.total += Number(row.qty);

      current.capacity = Math.max(
        current.capacity,
        Number(row.openPoQty),
      );

      grouped.set(
        row.poSeq,
        current,
      );
    }

    for (const [poSeq, quantity] of grouped) {
      if (quantity.total > quantity.capacity) {
        return `PO sequence ${poSeq} exceeds its available quantity of ${quantity.capacity}.`;
      }
    }

    return null;
  }

  private applyDocument(
    document: AssetAcceptanceDocument,
  ): void {
    const h = document.header;

    this.status.set(h.status);
    this.rowVersion.set(h.rowVersion);
    this.details.set(document.details);

    this.selectedPo.set({
      poNo: h.poNo,
      poDate: '',
      suppCode: h.suppCode,
      suppName: h.suppName,
      branchName: h.branchName,
      openLineCount: 0,
      openAmount: 0,
    });

    this.form.reset({
      assetAcceptanceNo: h.assetAcceptanceNo,
      acceptanceDate: this.asDate(h.acceptanceDate),
      poNo: h.poNo,
      suppCode: h.suppCode,
      suppName: h.suppName,
      assetCategoryCode: h.assetCategoryCode,
      branchName: h.branchName,
      department: h.department,
      receivedBy: h.receivedBy,
      acceptedBy: h.acceptedBy,
      inServiceDate: this.asDate(h.inServiceDate),
      assetLocationCode: h.assetLocationCode,
      acquisitionMode: h.acquisitionMode,
      downpaymentAmount: h.downpaymentAmount,
      financedAmount: h.financedAmount,
      financingCompany: h.financingCompany ?? '',
      loanReference: h.loanReference ?? '',
      remarks: h.remarks ?? '',
    });

    this.facade.selectPo(h.poNo);

    this.syncReadOnly();
  }

  private syncReadOnly(): void {
    if (this.status() === 'DRAFT') {
      this.form.enable({
        emitEvent: false,
      });

      this.lineForm.enable({
        emitEvent: false,
      });
    } else {
      this.form.disable({
        emitEvent: false,
      });

      this.lineForm.disable({
        emitEvent: false,
      });

      this.clearLineEditor();
    }

    this.formValid.set(this.form.valid);
  }

  private reset(): void {
    this.status.set('DRAFT');
    this.rowVersion.set(null);
    this.details.set([]);
    this.selectedPo.set(null);
    this.selectedPoLine.set(null);

    this.facade.loadDocument(null);
    this.facade.setPoSearch('');
    this.facade.selectPo('');

    this.form.enable({
      emitEvent: false,
    });

    this.lineForm.enable({
      emitEvent: false,
    });

    this.form.reset({
      assetAcceptanceNo: '',
      acceptanceDate: new Date(),
      poNo: '',
      suppCode: '',
      suppName: '',
      assetCategoryCode: '',
      branchName: this.auth.branch(),
      department: this.auth.department(),
      receivedBy: this.auth.userId(),
      acceptedBy: '',
      inServiceDate: new Date(),
      assetLocationCode: '',
      acquisitionMode: 'NORMAL AP',
      downpaymentAmount: 0,
      financedAmount: 0,
      financingCompany: 'N/A',
      loanReference: 'N/A',
      remarks: '',
    });

    this.formValid.set(this.form.valid);

    this.clearLineEditor();
  }

  private usedQtyForPoLine(
    poSeq: number,
    excludeLineNo: number | null,
  ): number {
    return this.details()
      .filter(
        (row) =>
          row.poSeq === poSeq &&
          row.lineNo !== excludeLineNo,
      )
      .reduce(
        (total, row) =>
          total + Number(row.qty || 0),
        0,
      );
  }

  private duplicateIdentifier(
    row: AssetAcceptanceDetail,
    lineNo: number,
  ): string | null {
    const fields: Array<
      keyof Pick<
        AssetAcceptanceDetail,
        'serialNo' | 'engineNo' | 'chassisNo' | 'plateNo'
      >
    > = [
      'serialNo',
      'engineNo',
      'chassisNo',
      'plateNo',
    ];

    for (const field of fields) {
      const value = row[field]
        .trim()
        .toUpperCase();

      if (
        value &&
        this.details().some(
          (item) =>
            item.lineNo !== lineNo &&
            item[field]
              .trim()
              .toUpperCase() === value,
        )
      ) {
        return `${field} ${row[field]}`;
      }
    }

    return null;
  }

  private nextLineNo(): number {
    return Math.max(
      0,
      ...this.details().map(
        (row) => row.lineNo,
      ),
    ) + 1;
  }

  private currentUserId(): string {
    return String(
      this.auth.userId() ?? '',
    ).trim();
  }

  private dateOnly(
    value: Date | string | null,
  ): string {
    if (!value) {
      throw new Error(
        'A required date is missing.',
      );
    }

    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `Invalid date value: ${value}`,
      );
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  private asDate(value: string): Date {
    const parts = String(value ?? '')
      .substring(0, 10)
      .split('-')
      .map(Number);

    if (
      parts.length !== 3 ||
      parts.some(
        (part) => !Number.isFinite(part),
      )
    ) {
      return new Date();
    }

    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
    );
  }

  private actionLabel(
    action: WorkflowAction,
  ): string {
    return (
      action.charAt(0).toUpperCase() +
      action.slice(1)
    );
  }

  private confirmAction(
    action: WorkflowAction,
    message: string,
    title: string,
    confirmed: () => void,
    lineAction = false,
  ): void {
    const data: ActionConfirmDialogData = {
      title,
      message,
      moduleName: 'Asset Acceptance',
      documentNo: lineAction
        ? this.documentNo() || 'DRAFT'
        : this.documentNo(),
      status: this.status(),
      effectText: message,
      confirmText: lineAction
        ? 'Remove Line'
        : this.actionLabel(action),
      cancelText: 'Go Back',
    };

    this.openDialog(
      ActionConfirmDialogComponent,
      data,
      confirmed,
    );
  }

  private openDialog(
    component:
      | typeof SaveConfirmDialogComponent
      | typeof ActionConfirmDialogComponent,
    data:
      | SaveConfirmDialogData
      | ActionConfirmDialogData,
    confirmed: () => void,
  ): void {
    const dialog: DialogRef = this.dialogs.open({
      content: component,
      width: 620,
      minWidth: 320,
      cssClass: 'erp-confirm-dialog-host',
    });

    const instance = dialog.content.instance as {
      data:
        | SaveConfirmDialogData
        | ActionConfirmDialogData;
    };

    instance.data = data;

    dialog.result
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((result) => {
        if (
          !(result instanceof DialogCloseResult) &&
          (
            result as {
              action?: string;
            }
          ).action === 'confirm'
        ) {
          confirmed();
        }
      });
  }
}