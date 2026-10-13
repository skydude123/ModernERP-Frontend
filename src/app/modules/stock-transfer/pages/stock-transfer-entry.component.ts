import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  ButtonsModule,
} from '@progress/kendo-angular-buttons';

import {
  DateInputsModule,
} from '@progress/kendo-angular-dateinputs';

import {
  DialogCloseResult,
  DialogModule,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';

import {
  DropDownsModule,
  PopupSettings,
} from '@progress/kendo-angular-dropdowns';

import {
  AddEvent,
  CancelEvent,
  EditEvent,
  GridComponent,
  GridModule,
  RemoveEvent,
  SaveEvent,
} from '@progress/kendo-angular-grid';

import {
  InputsModule,
} from '@progress/kendo-angular-inputs';

import {
  LabelModule,
} from '@progress/kendo-angular-label';

import {
  ToolBarModule,
} from '@progress/kendo-angular-toolbar';

import {
  take,
} from 'rxjs';

import {
  AuthFacadeService,
} from '../../../core/services/auth-facade.service';

import {
  ErpNotificationService,
} from '../../../shared/notification-card/erp-notification.service';

import {
  ErpSaveConfirmDialogComponent,
  ErpSaveConfirmDialogData,
} from '../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';

import {
  AppToolbarComponent,
} from '../../../shared/services/app-toolbar/app-toolbar.component';

import {
  AppToolbarService,
} from '../../../shared/services/app-toolbar/toolbar.service';

import {
  StockTransferFacade,
} from '../data-access/stock-transfer.facade';

import {
  SourceItemLookup,
  StockTransferDetail,
  StockTransferDocument,
  StockTransferReverseRequest,
  StockTransferSaveRequest,
  StockTransferStatus,
} from '../models/stock-transfer.models';

@Component({
  selector: 'app-stock-transfer-entry',

  standalone: true,

  changeDetection:
    ChangeDetectionStrategy.OnPush,

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
    ToolBarModule,

    AppToolbarComponent,
  ],

  providers: [
    StockTransferFacade,
  ],

  templateUrl:
    './stock-transfer-entry.component.html',

  styleUrl:
    './stock-transfer.component.scss',
})
export class StockTransferEntryComponent
  implements OnDestroy
{
  /* =========================================================
     INJECTIONS
     ========================================================= */

  readonly facade =
    inject(StockTransferFacade);

  readonly toolbar =
    inject(AppToolbarService);

  private readonly fb =
    inject(FormBuilder);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly auth =
    inject(AuthFacadeService);

  private readonly notify =
    inject(ErpNotificationService);

  private readonly dialogs =
    inject(DialogService);

  private readonly destroyRef =
    inject(DestroyRef);

  /* =========================================================
     DOCUMENT STATE
     ========================================================= */

  readonly details =
    signal<StockTransferDetail[]>([]);

  readonly status =
    signal<StockTransferStatus>('N');

  readonly rowVersion =
    signal<string | null>(null);

  /*
   * Used to determine whether the document
   * has already been persisted.
   */
  readonly hasBeenSaved =
    signal(false);

  /*
   * TRUE means:
   *
   * Save / Update is required before Post.
   */
  readonly hasUnsavedChanges =
    signal(true);

  /*
   * Special workflow rule:
   *
   * Reverse -> Draft
   * but user MUST click Update before Post again.
   */
  readonly requireUpdateAfterReverse =
    signal(false);

  /*
   * Prevent form.valueChanges from treating
   * programmatic document loading as a user edit.
   */
  private suppressDirtyTracking = false;

  /*
   * Used to prevent loading the same server response
   * repeatedly, but still allows reload when rowversion changes.
   */
  private loadedDocumentKey = '';

  /* =========================================================
     FORM
     ========================================================= */

  readonly form = this.fb.group({
    stNo: [
      {
        value: '',
        disabled: true,
      },
    ],

    stDate: [
      new Date(),
      Validators.required,
    ],

    sourceWhseCode: [
      '',
      Validators.required,
    ],

    destinationWhseCode: [
      '',
      Validators.required,
    ],

    reference: [
      '',
      [
        Validators.required,
        Validators.maxLength(20),
      ],
    ],

    receivedBy: [
      '',
      Validators.maxLength(10),
    ],

    receivedDate: [
      null as Date | null,
    ],

    remarks: [
      '',
      Validators.maxLength(500),
    ],
  });

  /* =========================================================
     PERMISSION / WORKFLOW STATE
     ========================================================= */

  /*
   * Draft documents can be edited.
   */
readonly editable = computed(() => {
  return (
    this.status() === 'N' &&
    !this.facade.busy() &&
    this.auth.hasPermission('STOCK_TRANSFER_NEW')
  );
});


  /*
   * POST RULES:
   *
   * 1. Must be Draft
   * 2. Must already have ST No.
   * 3. Must have been saved
   * 4. Must NOT contain unsaved changes
   * 5. Header must be valid
   * 6. Must have at least one detail
   * 7. Must have POST permission
   */
readonly canPost = computed(() => {
  return (
    this.status() === 'N' &&
    this.hasBeenSaved() &&
    !this.hasUnsavedChanges() &&
    this.details().length > 0 &&
    !this.facade.busy() &&
    this.auth.hasPermission('STOCK_TRANSFER_NEW')
  );
});
  /*
   * REVERSE RULE:
   *
   * Posted document only.
   */
readonly canReverse = computed(() => {
  return (
    this.status() === 'U' &&
    this.hasBeenSaved() &&
    !this.facade.busy() &&
    this.auth.hasPermission('STOCK_TRANSFER_NEW')
  );
});

  /* =========================================================
     TOTALS
     ========================================================= */

  readonly totalBaseQty = computed(() =>
    this.details().reduce(
      (total, line) =>
        total +
        Number(
          line.baseQty ?? 0,
        ),
      0,
    ),
  );

  readonly totalTransferCost = computed(() =>
    this.details().reduce(
      (total, line) =>
        total +
        Number(
          line.transferCost ?? 0,
        ),
      0,
    ),
  );

  /* =========================================================
     ITEM MULTICOLUMN POPUP
     ========================================================= */

  readonly itemPopupSettings:
    PopupSettings = {
      width: 1150,
      height: 340,
    };

  /* =========================================================
     CONSTRUCTOR
     ========================================================= */

  constructor() {
    /*
     * All toolbar commands remain visible
     * based on permission.
     *
     * Enabled/disabled state is controlled by:
     * formValid
     * postingMode
     * reverseMode
     */
    this.configureToolbar();

    effect(() => {
  const stNo = String(
    this.form.controls.stNo.value ?? '',
  ).trim();

  console.log('=== INVENTORY TRANSFER POST STATE ===');

  console.table({
    status: this.status(),
    stNo: stNo,
    hasBeenSaved: this.hasBeenSaved(),
    hasUnsavedChanges: this.hasUnsavedChanges(),
    requireUpdateAfterReverse: this.requireUpdateAfterReverse(),
    detailCount: this.details().length,
    busy: this.facade.busy(),
    permission: this.auth.hasPermission('STOCK_TRANSFER_NEW'),
    canPost: this.canPost(),
  });
});

    /*
     * Track user changes to HEADER.
     *
     * Existing saved Draft:
     * any header change -> Post disabled
     * until Update is clicked.
     */
    this.form.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        if (
          this.suppressDirtyTracking
        ) {
          return;
        }

        if (
          this.status() === 'N'
        ) {
          this.hasUnsavedChanges.set(
            true,
          );
        }
      });

    /*
     * Load server document whenever
     * facade returns a different ST / rowversion.
     */
    effect(() => {
      const document =
        this.facade.document();

      if (!document) {
        return;
      }

      const key =
        `${document.stNo}|${document.rowVersion}`;

      if (
        this.loadedDocumentKey === key
      ) {
        return;
      }

      this.loadedDocumentKey = key;

      this.loadDocument(
        document,
      );
    });

    /*
     * Existing document route:
     *
     * /stock-transfers/:stNo
     */
    const stNo =
      this.route.snapshot.paramMap.get(
        'stNo',
      );

    if (
      stNo &&
      stNo.toLowerCase() !== 'new'
    ) {
      this.facade.setDocumentNo(
        stNo,
      );
    } else {
      /*
       * New Inventory Transfer.
       */
      this.hasBeenSaved.set(false);

      this.hasUnsavedChanges.set(true);

      this.requireUpdateAfterReverse.set(
        false,
      );
    }
  }

  /* =========================================================
     DESTROY
     ========================================================= */

  ngOnDestroy(): void {
    this.toolbar.reset();
  }

  /* =========================================================
     NEW DOCUMENT
     ========================================================= */

  newDocument(): void {
    this.hasBeenSaved.set(false);

    this.hasUnsavedChanges.set(true);

    this.requireUpdateAfterReverse.set(
      false,
    );

    void this.router.navigate([
      '/stock-transfers',
      'new',
    ]);
  }

  /* =========================================================
     LIST
     ========================================================= */

  list(): void {
    void this.router.navigate([
      '/stock-transfers',
    ]);
  }

  /* =========================================================
     REFRESH
     ========================================================= */

  refresh(): void {
    const stNo = String(
      this.form.controls.stNo.value ??
        '',
    ).trim();

    if (!stNo) {
      return;
    }

    this.loadedDocumentKey = '';

    this.facade.reloadDocument();
  }

  /* =========================================================
     SOURCE STORAGE
     ========================================================= */

  sourceChanged(
    sourceWhseCode: string,
  ): void {
    this.facade.setSourceItems(
      sourceWhseCode || '',
    );

    /*
     * Changing source invalidates
     * existing detail items.
     */
    if (
      this.details().length > 0
    ) {
      this.details.set([]);

      this.markDocumentChanged();

      this.notify.info(
        'Detail lines were cleared because the source storage changed.',
        'Source Storage Changed',
      );
    }
  }

  /* =========================================================
     ITEM SEARCH
     ========================================================= */

  filterItems(
    search: string,
  ): void {
    this.facade.setSourceItems(
      this.form.controls
        .sourceWhseCode.value ?? '',

      search,
    );
  }

  /* =========================================================
     ADD DETAIL
     ========================================================= */

  addHandler(
    args: AddEvent,
  ): void {
    if (!this.editable()) {
      return;
    }

    this.closeEditor(
      args.sender,
    );

    args.sender.addRow(
      this.createDetailGroup(),
    );
  }

  /* =========================================================
     EDIT DETAIL
     ========================================================= */

  editHandler(
    args: EditEvent,
  ): void {
    if (!this.editable()) {
      return;
    }

    this.closeEditor(
      args.sender,
    );

    args.sender.editRow(
      args.rowIndex,

      this.createDetailGroup(
        args.dataItem as
          StockTransferDetail,
      ),
    );
  }

  /* =========================================================
     CANCEL DETAIL
     ========================================================= */

  cancelHandler(
    args: CancelEvent,
  ): void {
    args.sender.closeRow(
      args.rowIndex,
    );
  }

  /* =========================================================
     REMOVE DETAIL
     ========================================================= */

  removeHandler(
    args: RemoveEvent,
  ): void {
    if (!this.editable()) {
      return;
    }

    const row =
      args.dataItem as
        StockTransferDetail;

    this.details.update(
      (lines) =>
        lines.filter(
          (line) =>
            line.stSeq !==
            row.stSeq,
        ),
    );

    /*
     * Detail changed.
     * Require Update before Post.
     */
    this.markDocumentChanged();
  }

  /* =========================================================
     SAVE DETAIL LINE
     ========================================================= */

  saveHandler(
    args: SaveEvent,
  ): void {
    if (!this.editable()) {
      return;
    }

    args.formGroup.markAllAsTouched();

    if (
      args.formGroup.invalid
    ) {
      this.notify.warning(
        'Select an item and enter positive quantity and conversion values.',
        'Inventory Transfer Line Validation',
      );

      return;
    }

    const raw =
      args.formGroup.getRawValue();

    const itemCode =
      String(
        raw.itemCode ?? '',
      ).trim();

    /*
     * Duplicate item validation.
     */
    const duplicate =
      this.details().some(
        (line, index) =>
          line.itemCode ===
            itemCode &&
          (
            args.isNew ||
            index !==
              args.rowIndex
          ),
      );

    if (duplicate) {
      this.notify.warning(
        'Duplicate items are not allowed in one Inventory Transfer.',
        'Duplicate Item',
      );

      return;
    }

    const qtyIss =
      Number(
        raw.qtyIss ?? 0,
      );

    const convFactor =
      Number(
        raw.convFactor ?? 0,
      );

    const unitCost =
      Number(
        raw.unitCost ?? 0,
      );

    const baseQty =
      this.round(
        qtyIss *
        convFactor,
      );

    const transferCost =
      this.round(
        baseQty *
        unitCost,
      );

    const line:
      StockTransferDetail = {
      stSeq:
        args.isNew
          ? this.nextSequence()
          : Number(
              (
                args.dataItem as
                  StockTransferDetail
              ).stSeq,
            ),

      itemCode,

      itemDesc:
        String(
          raw.itemDesc ?? '',
        ).trim(),

      qtyIss,

      xferUm:
        String(
          raw.xferUm ?? '',
        ).trim(),

      convFactor,

      baseUm:
        String(
          raw.baseUm ?? '',
        ).trim(),

      baseQty,

      unitCost,

      transferCost,

      stockOnHand:
        Number(
          raw.stockOnHand ?? 0,
        ),
    };

    this.details.update(
      (lines) => {
        const next = [
          ...lines,
        ];

        if (
          args.isNew
        ) {
          next.push(
            line,
          );
        } else {
          next[
            args.rowIndex
          ] = line;
        }

        return next.sort(
          (left, right) =>
            left.stSeq -
            right.stSeq,
        );
      },
    );

    /*
     * Detail changed.
     * Post must become disabled.
     */
    this.markDocumentChanged();

    args.sender.closeRow(
      args.rowIndex,
    );
  }

  /* =========================================================
     ITEM SELECTED
     ========================================================= */

  itemSelected(
    formGroup: FormGroup,

    item:
      SourceItemLookup |
      null,
  ): void {
    if (!item) {
      return;
    }

    formGroup.patchValue(
      {
        itemCode:
          String(
            item.itemCode ?? '',
          ).trim(),

        itemDesc:
          String(
            item.itemDesc ?? '',
          ).trim(),

        xferUm:
          String(
            item.baseUm ?? '',
          ).trim(),

        baseUm:
          String(
            item.baseUm ?? '',
          ).trim(),

        convFactor:
          1,

        unitCost:
          Number(
            item.unitCost ?? 0,
          ),

        stockOnHand:
          Number(
            item.stockOnHand ??
            0,
          ),
      },

      {
        emitEvent:
          false,
      },
    );
  }

  /* =========================================================
     SAVE / UPDATE DRAFT
     ========================================================= */

  saveDraft(): void {
    if (
      !this.validateDraft()
    ) {
      return;
    }

    const currentStNo =
      String(
        this.form.controls
          .stNo.value ?? '',
      ).trim();

    this.confirm(
      {
        title:
          currentStNo
            ? 'Update Inventory Transfer'
            : 'Save Inventory Transfer',

        moduleName:
          'Inventory Transfer',

        documentNo:
          currentStNo ||
          'AUTO-GENERATED',

        status:
          'DRAFT',

        effectText:
          'Saving stores the current Inventory Transfer header and detail lines. Inventory balances are not moved until the document is posted.',

        confirmText:
          currentStNo
            ? 'Update Transfer'
            : 'Save Transfer',
      },

      () =>
        this.execute('N'),
    );
  }

  /* =========================================================
     POST
     ========================================================= */

  post(): void {
    /*
     * Do NOT allow Post until Save / Update
     * has been completed.
     */
    if (
      !this.canPost()
    ) {
      if (
        this.hasUnsavedChanges() ||
        this.requireUpdateAfterReverse()
      ) {
        this.notify.warning(
          'Please save or update the Inventory Transfer before posting.',
          'Update Required',
        );
      }

      return;
    }

    if (
      !this.validateForPost()
    ) {
      return;
    }

    this.confirm(
      {
        title:
          'Post Inventory Transfer',

        moduleName:
          'Inventory Transfer',

        documentNo:
          this.form.controls
            .stNo.value ||
          'AUTO-GENERATED',

        status:
          'DRAFT',

        effectText:
          'Posting moves the saved quantity and cost from the source storage to the destination storage.',

        confirmText:
          'Post Transfer',
      },

      () =>
        this.execute('U'),
    );
  }

  /* =========================================================
     REVERSE
     ========================================================= */

  reverse(): void {
    if (
      !this.canReverse()
    ) {
      return;
    }

    const stNo =
      String(
        this.form.controls
          .stNo.value ?? '',
      ).trim();

    if (!stNo) {
      this.notify.warning(
        'Unable to determine the Inventory Transfer number.',
        'Reverse Inventory Transfer',
      );

      return;
    }

    const dialog:
      DialogRef =
      this.dialogs.open({
        content:
          ErpSaveConfirmDialogComponent,

        width:
          700,

        minWidth:
          380,

        cssClass: [
          'erp-kendo-dialog',
        ],
      });

    const component =
      dialog.content
        .instance as
        ErpSaveConfirmDialogComponent;

    component.data = {
      title:
        'Reverse Inventory Transfer',

      moduleName:
        'Inventory Transfer',

      documentNo:
        stNo,

      status:
        'POSTED',

      effectText:
        'Reversing will undo the posted inventory movement, restore the transferred quantity and cost, and return this document to Draft status.',

      note:
        'A reverse reason of at least 5 characters is required.',

      questionText:
        'Do you want to reverse this Inventory Transfer?',

      confirmText:
        'Reverse Transfer',

      cancelText:
        'Back',

      showForm:
        true,

      formFields: [
        {
          name:
            'reason',

          label:
            'Reverse Reason',

          type:
            'textarea',

          rows:
            3,

          placeholder:
            'Enter reverse reason',
        },
      ],
    };

    dialog.result
      .pipe(
        take(1),
      )
      .subscribe(
        (result) => {
          if (
            result instanceof
            DialogCloseResult
          ) {
            return;
          }

          const response =
            result as {
              action?: string;

              formValue?:
                Record<
                  string,
                  string
                >;
            };

          if (
            response.action !==
            'confirm'
          ) {
            return;
          }

          const reason =
            String(
              response
                .formValue?.[
                  'reason'
                ] ?? '',
            ).trim();

          if (
            reason.length < 5
          ) {
            this.notify.warning(
              'Please enter a Reverse Reason with at least 5 characters.',
              'Reverse Inventory Transfer',
            );

            return;
          }

          this.reverseConfirmed(
            stNo,
            reason,
          );
        },
      );
  }

  /* =========================================================
     REVERSE CONFIRMED
     ========================================================= */

private reverseConfirmed(
  stNo: string,
  reason: string,
): void {
  const userId =
    String(
      this.auth.userId() ??
        '',
    ).trim();

  if (!userId) {
    this.notify.error(
      'Unable to determine the currently logged-in user.',
      'Reverse Inventory Transfer Failed',
    );

    return;
  }

  const request:
    StockTransferReverseRequest = {
    stNo,

    expectedRowVersion:
      this.rowVersion(),

    reason,

    userId,
  };

  this.facade
    .reverse(
      stNo,
      request,
    )
    .subscribe({
      next:
        (result) => {
          /*
           * Server returned document to Draft.
           */
          this.status.set(
            'N',
          );

          this.rowVersion.set(
            result.rowVersion,
          );

          /*
           * Reversed document is already
           * saved as Draft.
           *
           * If the user does NOT edit anything,
           * Post is allowed immediately.
           */
          this.hasBeenSaved.set(
            true,
          );

          this.requireUpdateAfterReverse.set(
            false,
          );

          this.hasUnsavedChanges.set(
            false,
          );

          /*
           * Draft = editable again.
           */
          this.form.enable({
            emitEvent:
              false,
          });

          /*
           * ST No. remains readonly.
           */
          this.form.controls
            .stNo.disable({
              emitEvent:
                false,
            });

          this.configureToolbar();

          this.notify.success(
            result.message ||
              `Inventory Transfer ${stNo} has been reversed successfully.`,

            'Inventory Transfer Reversed',

            stNo,

            'Inventory Transfer',
          );

          /*
           * Force next facade response
           * to be loaded.
           */
          this.loadedDocumentKey =
            '';

          this.facade.reloadDocument();
        },

      error:
        (error) => {
          this.notify.error(
            this.facade.message(
              error,
            ),

            'Reverse Inventory Transfer Failed',
          );
        },
    });
}

  /* =========================================================
     EXECUTE SAVE / POST
     ========================================================= */

  private execute(
    targetStatus:
      StockTransferStatus,
  ): void {
    const raw =
      this.form.getRawValue();

    const request:
      StockTransferSaveRequest = {
      stNo:
        raw.stNo?.trim() ||
        null,

      expectedRowVersion:
        this.rowVersion(),

      stDate:
        this.facade.dateOnly(
          raw.stDate!,
        ),

      sourceWhseCode:
        raw.sourceWhseCode!
          .trim(),

      destinationWhseCode:
        raw.destinationWhseCode!
          .trim(),

      reference:
        raw.reference!
          .trim(),

      receivedBy:
        raw.receivedBy
          ?.trim() ||
        null,

      receivedDate:
        raw.receivedDate
          ? raw.receivedDate
              .toISOString()
          : null,

      remarks:
        raw.remarks
          ?.trim() ||
        null,

      targetStatus,

      userId:
        String(
          this.auth.userId() ??
          '',
        ).trim() ||
        null,

      details:
        this.details().map(
          (line) => ({
            stSeq:
              line.stSeq,

            itemCode:
              line.itemCode,

            qtyIss:
              line.qtyIss,

            xferUm:
              line.xferUm,

            convFactor:
              line.convFactor,

            baseUm:
              line.baseUm,
          }),
        ),
    };

    this.facade
      .upsert(
        request,
      )
      .subscribe({
        next:
          (result) => {
            const savedStNo =
              String(
                result.stNo ??
                request.stNo ??
                '',
              ).trim();

            if (!savedStNo) {
              this.notify.error(
                'The API did not return an Inventory Transfer number.',
                'Inventory Transfer Failed',
              );

              return;
            }

            /*
             * Keep ST number immediately
             * synchronized in current component.
             */
            this.suppressDirtyTracking =
              true;

            this.form.controls
              .stNo.setValue(
                savedStNo,
                {
                  emitEvent:
                    false,
                },
              );

            this.form.controls
              .stNo.disable({
                emitEvent:
                  false,
              });

            this.suppressDirtyTracking =
              false;

            this.rowVersion.set(
              result.rowVersion,
            );

            /*
             * ===============================================
             * SAVE / UPDATE SUCCESS
             * ===============================================
             */
            if (
              targetStatus === 'N'
            ) {
              this.status.set(
                'N',
              );

              this.hasBeenSaved.set(
                true,
              );

              /*
               * Current changes have now
               * been persisted.
               */
              this.hasUnsavedChanges.set(
                false,
              );

              /*
               * If this Save happened after Reverse,
               * clear the Update requirement.
               */
              this.requireUpdateAfterReverse.set(
                false,
              );

              this.notify.success(
                result.message ||
                  `Inventory Transfer ${savedStNo} has been saved successfully.`,

                request.stNo
                  ? 'Inventory Transfer Updated'
                  : 'Inventory Transfer Saved',

                savedStNo,

                'Inventory Transfer',
              );
            }

            /*
             * ===============================================
             * POST SUCCESS
             * ===============================================
             */
            if (
              targetStatus === 'U'
            ) {
              this.status.set(
                'U',
              );

              this.hasBeenSaved.set(
                true,
              );

              this.hasUnsavedChanges.set(
                false,
              );

              this.requireUpdateAfterReverse.set(
                false,
              );

              /*
               * Posted document is readonly.
               */
              this.form.disable({
                emitEvent:
                  false,
              });

              this.form.controls
                .stNo.disable({
                  emitEvent:
                    false,
                });

              this.notify.success(
                result.message ||
                  `Inventory Transfer ${savedStNo} has been posted successfully.`,

                'Inventory Transfer Posted',

                savedStNo,

                'Inventory Transfer',
              );
            }

            this.configureToolbar();

            /*
             * Existing route remains /stock-transfers
             * internally.
             */
            void this.router.navigate([
              '/stock-transfers',
              savedStNo,
            ]);
          },

        error:
          (error) => {
            this.notify.error(
              this.facade.message(
                error,
              ),

              targetStatus === 'U'
                ? 'Inventory Transfer Posting Failed'
                : 'Inventory Transfer Save Failed',
            );
          },
      });
  }

  /* =========================================================
     VALIDATE DRAFT SAVE
     ========================================================= */

  private validateDraft():
    boolean {
    this.form.markAllAsTouched();

    if (
      !this.editable()
    ) {
      return false;
    }

    if (
      this.form.invalid
    ) {
      this.notify.warning(
        'Complete all required Inventory Transfer header fields.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    if (
      this.details().length ===
      0
    ) {
      this.notify.warning(
        'Please add at least one Inventory Transfer detail line.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    if (
      this.form.controls
        .sourceWhseCode.value ===
      this.form.controls
        .destinationWhseCode.value
    ) {
      this.notify.warning(
        'Source and destination storage must be different.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    return true;
  }

  /* =========================================================
     VALIDATE POST
     ========================================================= */

  private validateForPost():
    boolean {
    this.form.markAllAsTouched();

    if (
      this.form.invalid ||
      this.details().length === 0
    ) {
      this.notify.warning(
        'Complete all required header fields and detail lines before posting.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    if (
      this.form.controls
        .sourceWhseCode.value ===
      this.form.controls
        .destinationWhseCode.value
    ) {
      this.notify.warning(
        'Source and destination storage must be different.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    /*
     * Existing API / SP requires Received By
     * before status U.
     */
    if (
      !this.form.controls
        .receivedBy.value
        ?.trim()
    ) {
      this.notify.warning(
        'Received By is required before posting.',
        'Inventory Transfer Validation',
      );

      return false;
    }

    return true;
  }

  /* =========================================================
     LOAD EXISTING DOCUMENT
     ========================================================= */

  private loadDocument(
    document:
      StockTransferDocument,
  ): void {
    /*
     * Don't consider server patching
     * a user edit.
     */
    this.suppressDirtyTracking =
      true;

    this.status.set(
      document.status,
    );

    this.rowVersion.set(
      document.rowVersion,
    );

    this.form.reset(
      {
        stNo:
          document.stNo,

        stDate:
          this.parseDate(
            document.stDate,
          ),

        sourceWhseCode:
          document
            .sourceWhseCode,

        destinationWhseCode:
          document
            .destinationWhseCode,

        reference:
          document.reference,

        receivedBy:
          document.receivedBy ??
          '',

        receivedDate:
          document.receivedDate
            ? new Date(
                document
                  .receivedDate,
              )
            : null,

        remarks:
          document.remarks ??
          '',
      },

      {
        emitEvent:
          false,
      },
    );

    this.details.set(
      document.details,
    );

    this.facade.setSourceItems(
      document.sourceWhseCode,
    );

    /*
     * Existing DB document is saved.
     */
    this.hasBeenSaved.set(
      true,
    );

    /*
     * IMPORTANT:
     *
     * If document was just reversed,
     * keep the Update requirement.
     *
     * Otherwise a normal loaded Draft
     * is already saved and can be Posted.
     */
    if (
      document.status === 'N' &&
      this.requireUpdateAfterReverse()
    ) {
      this.hasUnsavedChanges.set(
        true,
      );
    } else {
      this.hasUnsavedChanges.set(
        false,
      );
    }

    /*
     * Posted = readonly.
     * Draft = editable.
     */
    if (
      document.status === 'U'
    ) {
      this.form.disable({
        emitEvent:
          false,
      });
    } else {
      this.form.enable({
        emitEvent:
          false,
      });
    }

    /*
     * ST No. is never editable.
     */
    this.form.controls
      .stNo.disable({
        emitEvent:
          false,
      });

    this.suppressDirtyTracking =
      false;

    this.configureToolbar();
  }

  /* =========================================================
     DETAIL FORM
     ========================================================= */

  private createDetailGroup(
    line?:
      StockTransferDetail,
  ): FormGroup {
    return this.fb.group({
      itemCode: [
        line?.itemCode ?? '',
        Validators.required,
      ],

      itemDesc: [
        {
          value:
            line?.itemDesc ??
            '',

          disabled:
            true,
        },

        Validators.required,
      ],

      qtyIss: [
        line?.qtyIss ?? 1,

        [
          Validators.required,

          Validators.min(
            0.0001,
          ),
        ],
      ],

      xferUm: [
        line?.xferUm ?? '',
        Validators.required,
      ],

      convFactor: [
        line?.convFactor ?? 1,

        [
          Validators.required,

          Validators.min(
            0.0001,
          ),
        ],
      ],

      baseUm: [
        {
          value:
            line?.baseUm ??
            '',

          disabled:
            true,
        },

        Validators.required,
      ],

      unitCost: [
        {
          value:
            line?.unitCost ??
            0,

          disabled:
            true,
        },
      ],

      stockOnHand: [
        {
          value:
            line?.stockOnHand ??
            0,

          disabled:
            true,
        },
      ],
    });
  }

  /* =========================================================
     MARK DOCUMENT DIRTY
     ========================================================= */

  private markDocumentChanged():
    void {
    if (
      this.status() !== 'N'
    ) {
      return;
    }

    this.hasUnsavedChanges.set(
      true,
    );
  }

  /* =========================================================
     CLOSE GRID EDITOR
     ========================================================= */

  private closeEditor(
    grid:
      GridComponent,
  ): void {
    grid.closeRow();
  }

  /* =========================================================
     NEXT SEQUENCE
     ========================================================= */

  private nextSequence():
    number {
    return (
      this.details().reduce(
        (max, line) =>
          Math.max(
            max,

            Number(
              line.stSeq ??
              0,
            ),
          ),

        0,
      ) + 1
    );
  }

  /* =========================================================
     ROUND
     ========================================================= */

  private round(
    value:
      number,
  ): number {
    return (
      Math.round(
        (
          value +
          Number.EPSILON
        ) *
          10000,
      ) /
      10000
    );
  }

  /* =========================================================
     PARSE DATE
     ========================================================= */

  private parseDate(
    value:
      string,
  ): Date {
    return new Date(
      `${value.slice(
        0,
        10,
      )}T00:00:00`,
    );
  }

  /* =========================================================
     TOOLBAR
     ========================================================= */

private configureToolbar(): void {
  const canUseEntry =
    this.auth.hasPermission('STOCK_TRANSFER_NEW');

  this.toolbar.setConfig({
    showNew: canUseEntry,
    showSave: canUseEntry,
    showPost: canUseEntry,
    showReverse: canUseEntry,

    showBack: true,
    showList: true,
    showRefresh: true,
  });
}

  /* =========================================================
     CONFIRMATION DIALOG
     ========================================================= */

  private confirm(
    data:
      ErpSaveConfirmDialogData,

    action:
      () => void,
  ): void {
    const dialog:
      DialogRef =
      this.dialogs.open({
        content:
          ErpSaveConfirmDialogComponent,

        width:
          700,

        minWidth:
          380,

        cssClass: [
          'erp-kendo-dialog',
        ],
      });

    (
      dialog.content
        .instance as
        ErpSaveConfirmDialogComponent
    ).data =
      data;

    dialog.result
      .pipe(
        take(1),
      )
      .subscribe(
        (result) => {
          if (
            result instanceof
            DialogCloseResult
          ) {
            return;
          }

          if (
            (
              result as {
                action?: string;
              }
            ).action ===
            'confirm'
          ) {
            action();
          }
        },
      );
  }
}