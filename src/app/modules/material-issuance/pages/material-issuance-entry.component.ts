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
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import {
  AddEvent,
  CancelEvent,
  EditEvent,
  GridComponent,
  GridModule,
  RemoveEvent,
  SaveEvent,
} from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { TabStripModule } from '@progress/kendo-angular-layout';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';

import { AuthFacadeService } from '../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../shared/notification-card/erp-notification.service';

import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';

import { AppToolbarComponent } from '../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../shared/services/app-toolbar/toolbar.service';

import { MaterialIssuanceFacade } from '../data-access/material-issuance.facade';
import { MaterialIssuanceService } from '../data-access/material-issuance.service';

import { checkIcon, searchIcon, trashIcon } from '@progress/kendo-svg-icons';

import {
  FifoPreview,
  GlLine,
  IssueDetail,
  IssueDocument,
  IssueLot,
  IssueSaveRequest,
  IssueSource,
  MaterialLookup,
  SoVerification,
} from '../models/material-issuance.models';

interface IssueSourceOption {
  code: IssueSource;
  name: string;
}

interface WarehouseDefaultItem {
  whseCode: string;
  whseDesc: string;
}

interface SupplierDefaultItem {
  suppCode: string;
  suppName: string;
}

interface WorkCenterDefaultItem {
  wcCode: string;
  wcDesc: string;
}

@Component({
  selector: 'app-material-issuance-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    DialogModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    TabStripModule,
    ToolBarModule,
    AppToolbarComponent,
  ],
  providers: [MaterialIssuanceFacade],
  templateUrl: './material-issuance-entry.component.html',
  styleUrl: './material-issuance.component.scss',
})
export class MaterialIssuanceEntryComponent implements OnDestroy {
  readonly trashIcon = trashIcon;
  readonly searchIcon = searchIcon;
  readonly checkIcon = checkIcon;

  readonly facade = inject(MaterialIssuanceFacade);
  readonly toolbar = inject(AppToolbarService);

  private readonly api = inject(MaterialIssuanceService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);
  private readonly notify = inject(ErpNotificationService);
  private readonly auth = inject(AuthFacadeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly warehouseDefaultItem: WarehouseDefaultItem = {
    whseCode: '',
    whseDesc: 'Select warehouse',
  };

  readonly supplierDefaultItem: SupplierDefaultItem = {
    suppCode: '',
    suppName: 'Select supplier',
  };

  readonly workCenterDefaultItem: WorkCenterDefaultItem = {
    wcCode: '',
    wcDesc: 'Select work center',
  };

  readonly sources: IssueSourceOption[] = [
    {
      code: 'PRD',
      name: 'Production',
    },
    {
      code: 'JOB',
      name: 'Job Order',
    },
    {
      code: 'PRJ',
      name: 'Project / Installation',
    },
    {
      code: 'DPT',
      name: 'Department Consumption',
    },
    {
      code: 'JOT',
      name: 'Job-Out Material Release',
    },
    {
      code: 'DIR',
      name: 'Direct / Emergency Release',
    },
  ];

  readonly form = this.fb.group({
    issueNo: [''],
    issueDate: [new Date(), Validators.required],
    whseCode: ['WHSE', Validators.required],
    sourceType: ['PRD' as IssueSource, Validators.required],
    reference: ['', Validators.required],
    sourceNo: [''],
    soNo: [
      '',
      [
        Validators.pattern(/^\d{10}$/),
      ],
    ],
    custId: [null as number | null],
    clientName: [
      {
        value: '',
        disabled: true,
      },
    ],

    /*
     * RETAINED:
     * Cost Center remains part of the form and API payload.
     * Its HTML field is only commented/hidden.
     */
    ccCode: [''],

    wcCode: [''],
    suppCode: [''],
    remarks: [''],
  });

  readonly details = signal<IssueDetail[]>([]);
  readonly lots = signal<IssueLot[]>([]);
  readonly fifoPreview = signal<FifoPreview[]>([]);
  readonly glLines = signal<GlLine[]>([]);
  readonly audit = signal<Partial<IssueDocument>>({});
  readonly rowVersion = signal<string | null>(null);
  readonly effectiveStatus = signal<'N' | 'A' | 'R'>('N');
  readonly selectedMaterial = signal<MaterialLookup | null>(null);
  readonly loading = signal(false);

  /* ============================================================
   * SO VERIFICATION STATE
   * ============================================================ */
  readonly showSoDialog = signal(false);
  readonly lookupSoNo = signal('');
  private readonly selectedVerifiedSoNo = signal('');

  // MODIFIED: UI state used by the MultiColumnComboBox and detail edit handlers.
  readonly materialPickerOpen = signal(false);
  readonly editingRowIndex = signal<number | null>(null);

  /*
   * MODIFIED:
   * Supports both the API policy-style permission and the existing
   * ERP permission key.
   */
  readonly canEdit = computed(() => {
    return (
      this.auth.isPrivilegedUser() ||
      this.auth.hasPermission('MAT_ISSUE_ENTRY') ||
      this.auth.hasPermission('MaterialIssuance.Edit') ||
      this.auth.hasPermission('INVENTORY_ISSUE_EDIT')
    );
  });

  readonly readonly = computed(() => {
    return this.effectiveStatus() !== 'N' || !this.canEdit();
  });

  readonly total = computed(() =>
    this.details().reduce(
      (sum, detail) => sum + Number(detail.issueAmount || 0),
      0,
    ),
  );

  readonly totalIssueQuantity = computed(() =>
    this.details().reduce((sum, detail) => sum + Number(detail.qtyIss || 0), 0),
  );

  readonly glPreview = computed<GlLine[]>(() => {
    if (this.glLines().length > 0) {
      return this.glLines();
    }

    return this.details().flatMap((detail, index) => [
      {
        lineNo: index * 2 + 1,
        accountCode: detail.debitAccount || 'UNMAPPED',
        debit: detail.issueAmount,
        credit: 0,
        reference: this.form.controls.issueNo.value || 'NEW',
        narration: detail.itemDesc,
      },
      {
        lineNo: index * 2 + 2,
        accountCode: detail.inventoryAccount || 'UNMAPPED',
        debit: 0,
        credit: detail.issueAmount,
        reference: this.form.controls.issueNo.value || 'NEW',
        narration: detail.itemDesc,
      },
    ]);
  });

  canPost(): boolean {
    const sourceType = this.form.controls.sourceType.value;

    const directReleaseAllowed =
      sourceType !== 'DIR' ||
      this.auth.isPrivilegedUser() ||
      this.auth.hasPermission('INVENTORY_ISSUE_DIRECT');

    return (
      this.effectiveStatus() === 'N' &&
      this.canEdit() &&
      directReleaseAllowed &&
      this.form.enabled &&
      this.form.valid &&
      this.details().length > 0 &&
      !!this.form.controls.issueNo.value?.trim() &&
      !!this.rowVersion() &&
      !this.facade.busy() &&
      !this.loading()
    );
  }

  readonly canReverse = computed(() => {
    const reversePermission =
      this.auth.isPrivilegedUser() ||
      this.auth.hasPermission('MAT_ISSUE_ENTRY') ||
      this.auth.hasPermission('MaterialIssuance.Reverse') ||
      this.auth.hasPermission('INVENTORY_ISSUE_REVERSE');

    return (
      this.effectiveStatus() === 'A' &&
      reversePermission &&
      !!this.rowVersion() &&
      !this.facade.busy()
    );
  });

  constructor() {
    this.toolbar.setConfig({
      showNew: true,
      showSave: true,
      showPost: true,
      showReverse: true,
      showList: true,
      showRefresh: true,
    });

    effect(() => {
      const status = this.effectiveStatus();
      const allowedToEdit = this.canEdit();

      const shouldEnable =
        status === 'N' &&
        allowedToEdit;

      if (shouldEnable) {
        if (this.form.disabled) {
          this.form.enable({
            emitEvent: false,
          });
        }

        /*
         * Client Name is always display-only.
         * form.enable() also enables disabled child controls,
         * therefore disable it again after making Draft editable.
         */
        this.form.controls.clientName.disable({
          emitEvent: false,
        });

        return;
      }

      if (this.form.enabled) {
        this.form.disable({
          emitEvent: false,
        });
      }
    });

    this.form.controls.whseCode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouseCode) => {
        this.facade.setMaterials(warehouseCode || 'WHSE');
      });

    /*
     * If the user manually changes a previously verified SO No.,
     * invalidate the old customer linkage immediately.
     *
     * Programmatic Select/Reopen patches use emitEvent:false,
     * therefore they do not trigger this clearing logic.
     */
    this.form.controls.soNo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const currentSoNo = String(value ?? '').trim();
        const verifiedSoNo = String(this.selectedVerifiedSoNo() ?? '').trim();

        if (!verifiedSoNo) {
          return;
        }

        if (currentSoNo.toUpperCase() !== verifiedSoNo.toUpperCase()) {
          this.selectedVerifiedSoNo.set('');

          this.form.patchValue(
            {
              custId: null,
              clientName: '',
            },
            {
              emitEvent: false,
            },
          );
        }
      });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const issueNo = params.get('issueNo');

        if (issueNo) {
          this.load(issueNo);
        } else {
          this.reset();
        }
      });
  }

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  /* ============================================================
   * SO VERIFICATION
   * ============================================================ */

  verifySoFromMainField(): void {
    const control = this.form.controls.soNo;
    const soNo = String(control.value ?? '').trim();

    if (!soNo) {
      control.markAsTouched();

      this.notify.warning(
        'Enter an SO number first.',
        'SO Verification',
      );

      return;
    }

    /*
     * Normalize the value without triggering the manual-change
     * subscription a second time.
     */
    control.setValue(soNo, {
      emitEvent: false,
    });

    this.lookupSoNo.set(soNo);
    this.showSoDialog.set(true);
    this.facade.verifySoNo(soNo);
  }

  selectSo(so: SoVerification): void {
    const selectedSoNo = String(so.soNo ?? '').trim();

    this.form.patchValue(
      {
        soNo: selectedSoNo,
        custId: Number(so.customerId),
        clientName: String(so.custName ?? '').trim(),
      },
      {
        /*
         * Do not fire the manual SO change handler while applying
         * the verified selection.
         */
        emitEvent: false,
      },
    );

    this.selectedVerifiedSoNo.set(selectedSoNo);
    this.showSoDialog.set(false);
  }

  closeSoDialog(): void {
    this.showSoDialog.set(false);
  }

  /*
   * MATERIAL DETAIL GRID
   * The material lookup is now inside the Kendo Grid edit row,
   * following the same event-handler pattern used by Purchase Order.
   */
  onMaterialFilter(filter: string): void {
    try {
      const warehouseCode = String(
        this.form.controls.whseCode.value ?? '',
      ).trim();

      if (!warehouseCode) {
        this.notify.warning(
          'Select a warehouse before searching for a material.',
          'Material Selection',
        );
        return;
      }

      this.facade.setMaterials(warehouseCode, String(filter ?? '').trim());
    } catch (error: unknown) {
      this.handleClientError(error, 'Material Search Failed');
    }
  }

  private createDetailGroup(line?: Partial<IssueDetail>): FormGroup {
    return this.fb.group({
      issueSeq: [Number(line?.issueSeq ?? 0)],
      itemCode: [String(line?.itemCode ?? '').trim(), Validators.required],
      itemDesc: [
        {
          value: String(line?.itemDesc ?? ''),
          disabled: true,
        },
      ],
      qtyIss: [
        Number(line?.qtyIss ?? 1),
        [Validators.required, Validators.min(0.0001)],
      ],
      issueUm: [
        {
          value: String(line?.issueUm ?? ''),
          disabled: true,
        },
        Validators.required,
      ],
      baseUm: [
        {
          value: String(line?.baseUm ?? ''),
          disabled: true,
        },
        Validators.required,
      ],
      convFactor: [
        {
          value: Number(line?.convFactor ?? 1),
          disabled: true,
        },
        [Validators.required, Validators.min(0.0001)],
      ],
      baseQty: [
        {
          value: Number(line?.baseQty ?? 0),
          disabled: true,
        },
      ],
      unitCost: [
        {
          value: Number(line?.unitCost ?? 0),
          disabled: true,
        },
      ],
      issueAmount: [
        {
          value: Number(line?.issueAmount ?? 0),
          disabled: true,
        },
      ],
      availableQty: [
        {
          value: Number(line?.availableQty ?? 0),
          disabled: true,
        },
      ],
      debitAccount: [
        {
          value: String(line?.debitAccount ?? ''),
          disabled: true,
        },
      ],
      inventoryAccount: [
        {
          value: String(line?.inventoryAccount ?? ''),
          disabled: true,
        },
      ],
      remarks: [line?.remarks ?? null],
    });
  }

  // addHandler(args: AddEvent): void {
  //   try {
  //     if (this.readonly()) {
  //       this.notify.warning(
  //         'This material issuance is read-only.',
  //         'Add Material',
  //       );
  //       return;
  //     }

  //     const warehouseCode = String(
  //       this.form.controls.whseCode.value ?? '',
  //     ).trim();

  //     if (!warehouseCode) {
  //       this.form.controls.whseCode.markAsTouched();
  //       this.notify.warning(
  //         'Select a warehouse before adding a material.',
  //         'Add Material',
  //       );
  //       return;
  //     }

  //     this.closeEditor(args.sender);

  //     args.sender.addRow(
  //       this.createDetailGroup({
  //         issueSeq: this.getNextIssueSequence(),
  //         itemCode: '',
  //         itemDesc: '',
  //         qtyIss: 1,
  //         issueUm: '',
  //         baseUm: '',
  //         convFactor: 1,
  //         baseQty: 1,
  //         unitCost: 0,
  //         issueAmount: 0,
  //         availableQty: 0,
  //         remarks: null,
  //       }),
  //     );
  //   } catch (error: unknown) {
  //     this.handleClientError(error, 'Add Material Failed');
  //   }
  // }

  addHandler(args: AddEvent): void {
    try {
      if (this.readonly()) {
        this.notify.warning(
          'This material issuance is read-only.',
          'Add Material',
        );
        return;
      }

      const warehouseCode = String(
        this.form.controls.whseCode.value ?? '',
      ).trim();

      if (!warehouseCode) {
        this.form.controls.whseCode.markAsTouched();

        this.notify.warning(
          'Select a warehouse before adding a material.',
          'Add Material',
        );

        return;
      }

      this.closeEditor(args.sender);

      /*
       * IMPORTANT:
       * Track the new row as currently being edited.
       * This allows Save Line / Cancel to appear.
       */
      this.editingRowIndex.set(this.details().length);

      args.sender.addRow(
        this.createDetailGroup({
          issueSeq: this.getNextIssueSequence(),
          itemCode: '',
          itemDesc: '',
          qtyIss: 1,
          issueUm: '',
          baseUm: '',
          convFactor: 1,
          baseQty: 1,
          unitCost: 0,
          issueAmount: 0,
          availableQty: 0,
          remarks: null,
        }),
      );
    } catch (error: unknown) {
      this.handleClientError(
        error,
        'Add Material Failed',
      );
    }
  }

  editHandler(args: EditEvent): void {
    try {
      if (this.readonly()) {
        this.notify.warning(
          'This material issuance is read-only.',
          'Edit Material',
        );
        return;
      }

      this.closeEditor(args.sender);
      this.editingRowIndex.set(args.rowIndex);

      args.sender.editRow(args.rowIndex, this.createDetailGroup(args.dataItem));
    } catch (error: unknown) {
      this.handleClientError(error, 'Edit Material Failed');
    }
  }

  cancelHandler(args: CancelEvent): void {
    try {
      args.sender.closeRow(args.rowIndex);
      this.editingRowIndex.set(null);
    } catch (error: unknown) {
      this.handleClientError(error, 'Cancel Editing Failed');
    }
  }

  saveHandler(args: SaveEvent): void {
    try {
      const { formGroup, isNew } = args;

      if (this.readonly()) {
        this.notify.warning(
          'This material issuance is read-only.',
          'Save Material Line',
        );
        return;
      }

      formGroup.markAllAsTouched();
      formGroup.updateValueAndValidity({
        emitEvent: false,
      });

      if (formGroup.invalid) {
        this.notify.warning(
          'Select a valid material and enter an issue quantity greater than zero.',
          'Material Line Validation',
        );
        return;
      }

      const raw = formGroup.getRawValue();
      const itemCode = String(raw.itemCode ?? '').trim();

      const duplicate = this.details().some(
        (row, index) =>
          row.itemCode === itemCode && (isNew || index !== args.rowIndex),
      );

      if (duplicate) {
        this.notify.warning(
          'This material is already included in the transaction.',
          'Duplicate Material',
        );
        return;
      }

      const qtyIss = Number(raw.qtyIss ?? 0);
      const availableQty = Number(raw.availableQty ?? 0);

      if (qtyIss <= 0) {
        this.notify.warning(
          'Issue quantity must be greater than zero.',
          'Material Line Validation',
        );
        return;
      }

      // if (availableQty >= 0 && qtyIss > availableQty) {
      //   this.notify.warning(
      //     `Issue quantity cannot exceed the available quantity of ${availableQty.toFixed(4)}.`,
      //     'Insufficient Stock', 
      //   );
      //   return;
      // }

      const detail = this.normalizeDetailRow(
        {
          ...raw,
          issueSeq: isNew
            ? this.getNextIssueSequence()
            : Number(args.dataItem?.issueSeq ?? args.rowIndex + 1),
        },
        args.rowIndex,
      );

      this.details.update((rows) => {
        if (isNew) {
          return [...rows, detail];
        }

        return rows.map((row, index) =>
          index === args.rowIndex ? detail : row,
        );
      });

      args.sender.closeRow(args.rowIndex);
      this.editingRowIndex.set(null);

      this.loadFifoPreview(detail);
    } catch (error: unknown) {
      this.handleClientError(error, 'Save Material Line Failed');
    }
  }

  removeHandler(args: RemoveEvent): void {
    try {
      if (this.readonly()) {
        this.notify.warning(
          'This material issuance is read-only.',
          'Remove Material',
        );
        return;
      }

      const material = args.dataItem as IssueDetail | undefined;

      if (!material) {
        this.notify.warning(
          'The selected material line no longer exists.',
          'Remove Material',
        );
        return;
      }

      this.confirm(
        'Remove Material',
        `Remove ${material.itemCode} - ${material.itemDesc} from this transaction?`,
        'Remove Line',
        () => {
          this.details.update((rows) =>
            rows
              .filter((_, index) => index !== args.rowIndex)
              .map((row, index) => ({
                ...row,
                issueSeq: index + 1,
              })),
          );

          args.sender.closeRow(args.rowIndex);
          this.editingRowIndex.set(null);
          this.fifoPreview.set([]);
        },
      );
    } catch (error: unknown) {
      this.handleClientError(error, 'Remove Material Failed');
    }
  }

  onMaterialSelected(
    formGroup: FormGroup,
    selected: MaterialLookup | null | undefined,
  ): void {
    try {
      if (!selected) {
        formGroup.patchValue(
          {
            itemCode: '',
            itemDesc: '',
            issueUm: '',
            baseUm: '',
            convFactor: 1,
            baseQty: 0,
            unitCost: 0,
            issueAmount: 0,
            availableQty: 0,
          },
          {
            emitEvent: false,
          },
        );
        return;
      }

      const qtyIss = Number(formGroup.get('qtyIss')?.value ?? 1);
      const convFactor = 1;
      const baseQty = qtyIss * convFactor;
      const unitCost = Number(selected.estimatedCost ?? 0);

      formGroup.patchValue(
        {
          itemCode: String(selected.itemCode ?? '').trim(),
          itemDesc: String(selected.itemDesc ?? '').trim(),
          issueUm: String(selected.baseUm ?? '').trim(),
          baseUm: String(selected.baseUm ?? '').trim(),
          convFactor,
          baseQty,
          unitCost,
          issueAmount: baseQty * unitCost,
          availableQty: Number(selected.availableQty ?? 0),
        },
        {
          emitEvent: false,
        },
      );

      formGroup.get('itemCode')?.markAsDirty();
      formGroup.get('itemCode')?.setErrors(null);
    } catch (error: unknown) {
      this.handleClientError(error, 'Material Selection Failed');
    }
  }

  onIssueQuantityChange(formGroup: FormGroup, value: number | null): void {
    try {
      const qtyIss = Number(value ?? 0);
      const convFactor = Number(formGroup.get('convFactor')?.value ?? 1);
      const unitCost = Number(formGroup.get('unitCost')?.value ?? 0);
      const baseQty = qtyIss * convFactor;

      formGroup.patchValue(
        {
          qtyIss,
          baseQty,
          issueAmount: baseQty * unitCost,
        },
        {
          emitEvent: false,
        },
      );
    } catch (error: unknown) {
      this.handleClientError(error, 'Quantity Update Failed');
    }
  }

  lineAmount(row: IssueDetail): number {
    return (
      Number(row.qtyIss ?? 0) *
      Number(row.convFactor ?? 0) *
      Number(row.unitCost ?? 0)
    );
  }

  lineAmountFromForm(formGroup: FormGroup): number {
    const raw = formGroup.getRawValue();

    return (
      Number(raw.qtyIss ?? 0) *
      Number(raw.convFactor ?? 0) *
      Number(raw.unitCost ?? 0)
    );
  }

  private normalizeDetailRow(
    line: Partial<IssueDetail>,
    index = 0,
  ): IssueDetail {
    const qtyIss = Number(line.qtyIss ?? 0);
    const convFactor = Number(line.convFactor ?? 1);
    const unitCost = Number(line.unitCost ?? 0);
    const baseQty = qtyIss * convFactor;

    return {
      ...line,
      issueSeq: Number(line.issueSeq ?? index + 1),
      itemCode: String(line.itemCode ?? '').trim(),
      itemDesc: String(line.itemDesc ?? '').trim(),
      qtyIss,
      issueUm: String(line.issueUm ?? '').trim(),
      baseUm: String(line.baseUm ?? '').trim(),
      convFactor,
      baseQty,
      unitCost,
      issueAmount: baseQty * unitCost,
      remarks: line.remarks ?? null,
      availableQty: Number(line.availableQty ?? 0),
    } as IssueDetail;
  }

  private getNextIssueSequence(): number {
    const maximum = this.details().reduce(
      (currentMax, row) => Math.max(currentMax, Number(row.issueSeq ?? 0)),
      0,
    );

    return maximum + 1;
  }

  private closeEditor(grid: GridComponent): void {
    const rowIndex = this.editingRowIndex();

    if (rowIndex !== null) {
      grid.closeRow(rowIndex);
      this.editingRowIndex.set(null);
    }
  }

  private loadFifoPreview(detail: IssueDetail): void {
    const warehouseCode = String(
      this.form.controls.whseCode.value ?? 'WHSE',
    ).trim();

    this.api
      .fifo(
        warehouseCode || 'WHSE',
        detail.itemCode,
        Number(detail.qtyIss ?? 0),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.fifoPreview.set(rows),
        error: (error: unknown) =>
          this.notify.error(this.facade.message(error), 'FIFO Preview Failed'),
      });
  }

  // save(): void {
  //   if (this.readonly()) {
  //     this.notify.warning(
  //       'This material issuance is read-only.',
  //       'Save Material Issuance',
  //     );

  //     return;
  //   }

  //   this.confirm(
  //     'Save Material Issuance',
  //     'Save this transaction as Draft?',
  //     'Save Draft',
  //     () => this.submit('N'),
  //   );
  // }

  save(): void {
    if (this.readonly()) {
      this.notify.warning(
        'This material issuance is read-only.',
        'Save Material Issuance',
      );

      return;
    }

    this.confirm(
      'Save Material Issuance',
      'Save this transaction as Draft?',
      'Save Draft',
      () => this.submit('N'),
    );
  }

  post(): void {
    if (this.effectiveStatus() !== 'N') {
      this.notify.warning(
        'Only a Draft material issuance can be posted.',
        'Post Material Issuance',
      );
      return;
    }

    if (!this.canEdit()) {
      this.notify.warning(
        'You do not have permission to post this material issuance.',
        'Post Material Issuance',
      );
      return;
    }

    if (this.form.disabled) {
      this.notify.warning(
        'The material issuance form is currently read-only.',
        'Post Material Issuance',
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.notify.warning(
        'Complete all required header fields before posting.',
        'Post Material Issuance',
      );
      return;
    }

    if (this.details().length === 0) {
      this.notify.warning(
        'Add at least one material before posting.',
        'Post Material Issuance',
      );
      return;
    }

    const issueNo = this.form.controls.issueNo.value?.trim();

    if (!issueNo) {
      this.notify.warning(
        'Save the document as Draft before posting.',
        'Post Material Issuance',
      );
      return;
    }

    if (!this.rowVersion()) {
      this.notify.warning(
        'The document row version is missing. Click Refresh before posting.',
        'Post Material Issuance',
      );
      return;
    }

    const invalidDetail = this.details().find(
      (detail) =>
        !detail.itemCode?.trim() ||
        Number(detail.qtyIss) <= 0 ||
        Number(detail.convFactor) <= 0,
    );

    if (invalidDetail) {
      this.notify.warning(
        `Check material line ${invalidDetail.issueSeq}. Quantity and conversion must be greater than zero.`,
        'Post Material Issuance',
      );
      return;
    }

    const sourceType = this.form.controls.sourceType.value;

    if (
      sourceType === 'DIR' &&
      !this.auth.isPrivilegedUser() &&
      !this.auth.hasPermission('INVENTORY_ISSUE_DIRECT')
    ) {
      this.notify.warning(
        'You do not have permission for Direct / Emergency release.',
        'Post Material Issuance',
      );
      return;
    }

    this.confirm(
      'Post Material Issuance',
      'Posting allocates live FIFO stock and creates inventory and GL movements.',
      'Post Transaction',
      () => this.submit('A'),
    );
  }

  reverse(): void {
    const issueNo = this.form.controls.issueNo.value;

    const currentRowVersion = this.rowVersion();

    if (!issueNo || !currentRowVersion || !this.canReverse()) {
      return;
    }

    this.confirm(
      'Reverse Material Issuance',
      'Reversal restores the exact FIFO quantities and values.',
      'Reverse',
      (formValue) => {
        const reason = String(formValue?.['reason'] || '').trim();

        if (reason.length < 5) {
          this.notify.warning('Enter a reason of at least 5 characters.');

          return;
        }

        this.facade
          .reverse(issueNo, {
            expectedRowVersion: currentRowVersion,
            reason,
            userId: this.auth.userId(),
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (result) => {
              this.notify.success(
                result.message,
                'Material Issuance Reversed',
                result.issueNo,
              );

              this.load(result.issueNo);
            },
            error: (error) =>
              this.notify.error(this.facade.message(error), 'Reversal Failed'),
          });
      },
      true,
    );
  }

  /*
   * MODIFIED:
   * Routes aligned with the actual URL:
   * /material-issuance
   */
  newEntry(): void {
    void this.router.navigate(['/material-issuance', 'new']);
  }

  list(): void {
    void this.router.navigate(['/material-issuance']);
  }

  reload(): void {
    const issueNo = this.form.controls.issueNo.value;

    if (issueNo) {
      this.load(issueNo);
    } else {
      this.reset();
    }
  }

  statusName(): string {
    switch (this.effectiveStatus()) {
      case 'A':
        return 'POSTED';

      case 'R':
        return 'REVERSED';

      default:
        return 'DRAFT';
    }
  }

  // private submit(targetStatus: 'N' | 'A'): void {
  //   if (this.readonly()) {
  //     return;
  //   }

  //   if (this.form.invalid || this.details().length === 0) {
  //     this.form.markAllAsTouched();

  //     this.notify.warning('Complete the required header and detail fields.');

  //     return;
  //   }

  //   const raw = this.form.getRawValue();

  //   if (raw.sourceType === 'JOT' && !raw.suppCode) {
  //     this.notify.warning('Supplier is required for Job-Out release.');

  //     return;
  //   }

  //   const invalidDetail = this.details().find(
  //     (detail) =>
  //       !detail.itemCode?.trim() ||
  //       Number(detail.qtyIss) <= 0 ||
  //       Number(detail.convFactor) <= 0,
  //   );

  //   if (invalidDetail) {
  //     this.notify.warning(
  //       `Check material line ${invalidDetail.issueSeq}. Quantity and conversion must be greater than zero.`,
  //     );

  //     return;
  //   }

  //   const request: IssueSaveRequest = {
  //     /*
  //      * Existing document:
  //      * issueNo and rowVersion are sent,
  //      * therefore the stored procedure performs UPDATE.
  //      *
  //      * New document:
  //      * issueNo and rowVersion are null,
  //      * therefore the stored procedure performs INSERT.
  //      */
  //     issueNo: raw.issueNo?.trim() || null,

  //     expectedRowVersion: this.rowVersion(),

  //     issueDate: this.formatDate(raw.issueDate!),

  //     whseCode: raw.whseCode!,

  //     sourceType: raw.sourceType!,

  //     reference: raw.reference!.trim(),

  //     sourceNo: raw.sourceNo?.trim() || null,

  //     soNo: raw.soNo?.trim() || null,

  //     /*
  //      * RETAINED:
  //      * Cost Center stays in the API payload
  //      * even though its HTML field is hidden.
  //      */
  //     ccCode: raw.ccCode?.trim() || null,

  //     wcCode: raw.wcCode?.trim() || null,

  //     suppCode: raw.suppCode?.trim() || null,

  //     remarks: raw.remarks?.trim() || null,

  //     targetStatus,

  //     userId: this.auth.userId(),

  //     details: this.details().map(
  //       ({
  //         issueSeq,
  //         itemCode,
  //         itemDesc,
  //         qtyIss,
  //         issueUm,
  //         baseUm,
  //         convFactor,
  //         remarks,
  //       }) => ({
  //         issueSeq,
  //         itemCode: itemCode.trim(),
  //         itemDesc: itemDesc.trim(),
  //         qtyIss,
  //         issueUm: issueUm.trim(),
  //         baseUm: baseUm.trim(),
  //         convFactor,
  //         remarks: remarks?.trim() || null,
  //       }),
  //     ),
  //   };

  //   this.facade
  //     .upsert(request)
  //     .pipe(takeUntilDestroyed(this.destroyRef))
  //     .subscribe({
  //       next: (result) => {
  //         this.notify.success(
  //           result.message,
  //           targetStatus === 'A' ? 'Material Issuance Posted' : 'Draft Saved',
  //           result.issueNo,
  //         );

  //         /*
  //          * Use navigate so the URL changes from /new
  //          * to the generated Issue No.
  //          */
  //         void this.router
  //           .navigate(['/material-issuance', result.issueNo])
  //           .then(() => {
  //             this.load(result.issueNo);
  //           });
  //       },
  //       error: (error) =>
  //         this.notify.error(
  //           this.facade.message(error),
  //           targetStatus === 'A' ? 'Posting Failed' : 'Save Failed',
  //         ),
  //     });
  // }

  private submit(targetStatus: 'N' | 'A'): void {
    console.log('===========================');
    console.log('MI SUBMIT STARTED');
    console.log('targetStatus:', targetStatus);
    console.log('readonly:', this.readonly());
    console.log('canEdit:', this.canEdit());
    console.log('form valid:', this.form.valid);
    console.log('form invalid:', this.form.invalid);
    console.log('details count:', this.details().length);
    console.log('===========================');

    if (this.readonly()) {
      console.log('MI SUBMIT STOPPED: READONLY');

      this.notify.warning(
        'This material issuance is read-only.',
        'Save Material Issuance',
      );

      return;
    }

    if (this.form.invalid || this.details().length === 0) {
      this.form.markAllAsTouched();

      console.log('MI SUBMIT STOPPED: INVALID HEADER OR NO DETAILS');

      this.notify.warning(
        'Complete the required header and detail fields.',
        'Material Issuance Validation',
      );

      return;
    }

    const raw = this.form.getRawValue();

    /*
     * SO No. remains optional.
     *
     * But once an SO No. is entered, it must have a verified
     * customer selection before Save/Post. SQL will verify the SO
     * again and derive the trusted customer ID independently.
     */
    const soNo = String(raw.soNo ?? '').trim();

    if (soNo && raw.custId === null) {
      this.notify.warning(
        'Verify the SO number and select the customer before saving or posting.',
        'SO Verification Required',
      );

      return;
    }

    if (raw.sourceType === 'JOT' && !raw.suppCode) {
      console.log('MI SUBMIT STOPPED: JOT SUPPLIER REQUIRED');

      this.notify.warning(
        'Supplier is required for Job-Out release.',
        'Material Issuance Validation',
      );

      return;
    }

    const invalidDetail = this.details().find(
      (detail) =>
        !detail.itemCode?.trim() ||
        Number(detail.qtyIss) <= 0 ||
        Number(detail.convFactor) <= 0,
    );

    if (invalidDetail) {
      console.log(
        'MI SUBMIT STOPPED: INVALID DETAIL',
        invalidDetail,
      );

      this.notify.warning(
        `Check material line ${invalidDetail.issueSeq}. Quantity and conversion must be greater than zero.`,
        'Material Issuance Validation',
      );

      return;
    }

    const request: IssueSaveRequest = {
      /*
       * Existing document:
       * issueNo and rowVersion are sent,
       * therefore the stored procedure performs UPDATE.
       *
       * New document:
       * issueNo and rowVersion are null,
       * therefore the stored procedure performs INSERT.
       */
      issueNo: raw.issueNo?.trim() || null,

      expectedRowVersion: this.rowVersion(),

      issueDate: this.formatDate(raw.issueDate!),

      whseCode: raw.whseCode!,

      sourceType: raw.sourceType!,

      reference: raw.reference!.trim(),

      sourceNo: raw.sourceNo?.trim() || null,

      soNo: raw.soNo?.trim() || null,

      custId: raw.custId ?? null,

      /*
       * RETAINED:
       * Cost Center stays in the API payload
       * even though its HTML field is hidden.
       */
      ccCode: raw.ccCode?.trim() || null,

      wcCode: raw.wcCode?.trim() || null,

      suppCode: raw.suppCode?.trim() || null,

      remarks: raw.remarks?.trim() || null,

      targetStatus,

      userId: this.auth.userId(),

      details: this.details().map(
        ({
          issueSeq,
          itemCode,
          itemDesc,
          qtyIss,
          issueUm,
          baseUm,
          convFactor,
          remarks,
        }) => ({
          issueSeq,
          itemCode: itemCode.trim(),
          itemDesc: itemDesc.trim(),
          qtyIss,
          issueUm: issueUm.trim(),
          baseUm: baseUm.trim(),
          convFactor,
          remarks: remarks?.trim() || null,
        }),
      ),
    };

    console.log('===========================');
    console.log('MI REQUEST PAYLOAD:', request);
    console.log('CALLING MI UPSERT API...');
    console.log('===========================');

    this.facade
      .upsert(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          console.log('===========================');
          console.log('MI SAVE SUCCESS:', result);
          console.log('===========================');

          this.notify.success(
            result.message,
            targetStatus === 'A'
              ? 'Material Issuance Posted'
              : 'Draft Saved',
            result.issueNo,
          );

          /*
           * Use navigate so the URL changes from /new
           * to the generated Issue No.
           */
          void this.router
            .navigate([
              '/material-issuance',
              result.issueNo,
            ])
            .then(() => {
              this.load(result.issueNo);
            });
        },

        error: (error) => {
          console.error('===========================');
          console.error('MI SAVE ERROR:', error);
          console.error('===========================');

          this.notify.error(
            this.facade.message(error),
            targetStatus === 'A'
              ? 'Posting Failed'
              : 'Save Failed',
          );
        },
      });
  }

  private load(issueNo: string): void {
    const normalizedIssueNo = issueNo.trim();

    if (!normalizedIssueNo) {
      return;
    }

    this.loading.set(true);

    this.api
      .get(normalizedIssueNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.apply(document);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);

          this.notify.error(this.facade.message(error), 'Load Failed');
        },
      });
  }

  private apply(document: IssueDocument): void {
    /*
     * Enable first so patchValue can safely apply
     * all values even when the previous document
     * was read-only.
     */
    this.form.enable({
      emitEvent: false,
    });

    this.form.patchValue(
      {
        issueNo: document.issueNo || '',

        issueDate: new Date(document.issueDate),

        whseCode: document.whseCode || '',

        sourceType: document.sourceType,

        reference: document.reference || '',

        sourceNo: document.sourceNo || '',

        soNo: document.soNo || '',

        custId: document.custId ?? null,

        clientName: document.custName || '',

        ccCode: document.ccCode || '',

        wcCode: document.wcCode || '',

        suppCode: document.suppCode || '',

        remarks: document.remarks || '',
      },
      {
        emitEvent: false,
      },
    );

    /*
     * A persisted customer ID means this SO/customer linkage was
     * already validated when it was saved. Preserve that state so
     * reopening does not require another Verify click just to view it.
     */
    this.selectedVerifiedSoNo.set(
      document.custId !== null &&
        document.custId !== undefined
        ? String(document.soNo ?? '').trim()
        : '',
    );

    /*
     * Load document detail information.
     */
    this.details.set(document.details ?? []);

    this.lots.set(document.lots ?? []);

    this.fifoPreview.set([]);

    this.glLines.set(document.glLines ?? []);

    this.audit.set(document);

    this.rowVersion.set(document.rowVersion || null);

    /*
     * ============================================================
     * STATUS NORMALIZATION
     * ============================================================
     *
     * Business status:
     *
     * N = New Draft
     * U = Updated Draft
     * A = Posted
     * R = Reversed
     *
     * Angular uses only:
     *
     * N = Editable Draft
     * A = Posted / Read-only
     * R = Reversed / Read-only
     *
     * Therefore:
     *
     * U must be converted to N.
     */
    const rawStatus = String(
      document.effectiveStatus ?? '',
    )
      .trim()
      .toUpperCase();

    let normalizedStatus: 'N' | 'A' | 'R';

    switch (rawStatus) {
      // DRAFT / UPDATED DRAFT / LEGACY DRAFT
      case 'N':
      case 'U':
      case 'P':
        normalizedStatus = 'N';
        break;

      // POSTED
      case 'A':
        normalizedStatus = 'A';
        break;

      // REVERSED / CANCELLED
      case 'C':
      case 'R':
        normalizedStatus = 'R';
        break;

      default:
        normalizedStatus = 'R';
        break;
    }

    this.effectiveStatus.set(normalizedStatus);

    /*
     * ============================================================
     * FORM EDITABILITY
     * ============================================================
     *
     * N / U = Draft
     *          editable if user has permission.
     *
     * A = Posted
     *     read-only.
     *
     * R = Reversed
     *     read-only.
     */
    if (
      normalizedStatus === 'N' &&
      this.canEdit()
    ) {
      this.form.enable({
        emitEvent: false,
      });

      this.form.controls.clientName.disable({
        emitEvent: false,
      });

      /*
       * Issue No. remains readonly through the HTML:
       *
       * <input
       *   formControlName="issueNo"
       *   readonly
       * />
       *
       * Do NOT disable the FormControl because
       * getRawValue() needs to retain issueNo.
       */
    } else {
      this.form.disable({
        emitEvent: false,
      });
    }

    /*
     * Refresh available materials using
     * the document warehouse.
     */
    this.facade.setMaterials(
      document.whseCode || 'WHSE',
    );
  }

  private reset(): void {
    this.form.enable({
      emitEvent: false,
    });

    this.form.controls.clientName.disable({
      emitEvent: false,
    });

    this.form.reset(
      {
        issueNo: '',
        issueDate: new Date(),
        whseCode: 'WHSE',
        sourceType: 'PRD',
        reference: '',
        sourceNo: '',
        soNo: '',
        custId: null,
        clientName: '',

        /*
         * RETAINED:
         * Cost Center remains in the form.
         */
        ccCode: '',

        wcCode: '',
        suppCode: '',
        remarks: '',
      },
      {
        emitEvent: false,
      },
    );

    this.selectedVerifiedSoNo.set('');
    this.lookupSoNo.set('');
    this.showSoDialog.set(false);

    // if (!this.canEdit()) {
    //   this.form.disable({
    //     emitEvent: false,
    //   });
    // }

    this.details.set([]);
    this.lots.set([]);
    this.fifoPreview.set([]);
    this.glLines.set([]);
    this.audit.set({});
    this.rowVersion.set(null);
    this.effectiveStatus.set('N');
    this.selectedMaterial.set(null);
    this.materialPickerOpen.set(false);
    this.editingRowIndex.set(null);

    this.facade.setMaterials('WHSE');
  }

  private confirm(
    title: string,
    message: string,
    confirmText: string,
    action: (formValue?: Record<string, string>) => void,
    showReason = false,
  ): void {
    const data: ErpSaveConfirmDialogData = {
      title,
      message,
      moduleName: 'Material Issuance',
      documentNo: this.form.controls.issueNo.value || 'NEW',
      status: this.statusName(),
      confirmText,
      cancelText: 'Back',
      questionText: 'Do you want to proceed?',
      showForm: showReason,
      formFields: showReason
        ? [
          {
            name: 'reason',
            label: 'Reversal Reason',
            type: 'textarea',
            rows: 3,
          },
        ]
        : [],
    };

    const dialogRef: DialogRef = this.dialogs.open({
      content: ErpSaveConfirmDialogComponent,
      width: 680,
      minWidth: 360,
    });

    (dialogRef.content.instance as ErpSaveConfirmDialogComponent).data = data;

    dialogRef.result
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result instanceof DialogCloseResult) {
          return;
        }

        const dialogResult = result as {
          action?: string;
          formValue?: Record<string, string>;
        };

        if (dialogResult.action === 'confirm') {
          action(dialogResult.formValue);
        }
      });
  }

  private handleClientError(error: unknown, title: string): void {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'An unexpected error occurred. Please try again.';

    this.notify.error(message, title);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
