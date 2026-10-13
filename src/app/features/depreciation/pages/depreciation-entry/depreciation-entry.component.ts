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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import {
  DialogCloseResult,
  DialogRef,
  DialogService,
} from '@progress/kendo-angular-dialog';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { GridModule } from '@progress/kendo-angular-grid';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { TabStripModule } from '@progress/kendo-angular-layout';
import { AuthFacadeService } from '../../../../core/services/auth-facade.service';
import { ErpNotificationService } from '../../../../shared/notification-card/erp-notification.service';
import {
  ErpSaveConfirmDialogComponent as ActionDialog,
  ErpSaveConfirmDialogData as ActionDialogData,
} from '../../../../shared/NOTIFICATION-confirm-dialog/erp-save-confirm-dialog.component';
import {
  ErpSaveConfirmDialogComponent as SaveDialog,
  ErpSaveConfirmDialogData as SaveDialogData,
} from '../../../../shared/save-confirm-dialog/erp-save-confirm-dialog.component';
import { AppToolbarComponent } from '../../../../shared/services/app-toolbar/app-toolbar.component';
import { AppToolbarService } from '../../../../shared/services/app-toolbar/toolbar.service';
import { DepreciationFacade } from '../../facades/depreciation.facade';
import {
  CommandResult,
  DepreciationConvention,
  DepreciationLine,
  DepreciationPreview,
  DepreciationStatus,
  PreviewRequest,
  SaveRequest,
} from '../../models/depreciation.models';

interface DialogResult {
  action?: string;
  formValue?: Record<string, string>;
}

@Component({
  selector: 'app-depreciation-entry',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonsModule,
    DateInputsModule,
    DropDownsModule,
    GridModule,
    InputsModule,
    TabStripModule,
    AppToolbarComponent,
  ],
  providers: [DepreciationFacade],
  templateUrl: './depreciation-entry.component.html',
  styleUrl: './depreciation-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepreciationEntryComponent implements OnDestroy {
  readonly facade = inject(DepreciationFacade);
  readonly toolbar = inject(AppToolbarService);
  readonly auth = inject(AuthFacadeService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(DialogService);
  private readonly notify = inject(ErpNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly depRunNo = signal<string | null>(null);
  readonly status = signal<DepreciationStatus>('DRAFT');
  readonly rowVersion = signal('');
  readonly journalNo = signal<string | null>(null);
  readonly reversalJournalNo = signal<string | null>(null);
  readonly lines = signal<DepreciationLine[]>([]);
  readonly preview = signal<DepreciationPreview | null>(null);
  readonly readOnly = computed(() => this.status() !== 'DRAFT');
  readonly canSubmit = computed(
    () =>
      this.status() === 'DRAFT' &&
      !!this.depRunNo() &&
      this.auth.hasPermission('DEPRECIATION_SUBMIT'),
  );
  readonly canApprove = computed(
    () =>
      this.status() === 'SUBMITTED' &&
      this.auth.hasPermission('DEPRECIATION_APPROVE'),
  );
  readonly canPost = computed(
    () =>
      this.status() === 'APPROVED' &&
      this.auth.hasPermission('DEPRECIATION_POST'),
  );
  readonly canReverse = computed(
    () =>
      this.status() === 'POSTED' &&
      this.auth.hasPermission('DEPRECIATION_REVERSE'),
  );
  readonly canDelete = computed(
    () =>
      this.status() === 'DRAFT' &&
      !!this.depRunNo() &&
      this.auth.hasPermission('DEPRECIATION_DELETE_DRAFT'),
  );
  readonly selectedCount = computed(
    () => this.lines().filter((line) => line.isSelected).length,
  );
  readonly summary = computed(() => this.preview() ?? this.emptyPreview());

  readonly form = this.fb.nonNullable.group({
    periodKey: [
      this.currentPeriod(),
      [Validators.required, Validators.pattern(/^\d{6}$/)],
    ],
    runDate: [new Date(), Validators.required],
    branchCode: [''],
    assetCategoryCode: [''],
    methodCode: [''],
    convention: ['FULL_MONTH' as DepreciationConvention, Validators.required],
    includeZeroAmount: [false],
    remarks: ['', Validators.maxLength(500)],
  });

  constructor() {
    this.toolbar.setConfig({
      showNew: this.auth.hasPermission('DEPRECIATION_CREATE'),
      showSave:
        this.auth.hasPermission('DEPRECIATION_CREATE') ||
        this.auth.hasPermission('DEPRECIATION_EDIT_DRAFT'),
      showBack: true,
      //showPrint: this.auth.hasPermission('DEPRECIATION_PRINT'),
      showPost: this.auth.hasPermission('DEPRECIATION_POST'),
      showReverse: this.auth.hasPermission('DEPRECIATION_REVERSE'),
      showList: true,
    });
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const no = params.get('depRunNo');
        this.depRunNo.set(no);
        this.facade.load(no);
        if (!no) this.reset();
      });
    effect(() => {
      const run = this.facade.run();
      if (!run) return;
      const h = run.header;
      this.depRunNo.set(h.depRunNo);
      this.status.set(h.status);
      this.rowVersion.set(h.rowVersion ?? '');
      this.journalNo.set(h.journalNo ?? null);
      this.reversalJournalNo.set(h.reversalJournalNo ?? null);
      this.lines.set(run.details);
      this.preview.set({
        lines: run.details,
        glLines: run.glLines,
        validations: run.validations,
        eligibleAssetCount: run.details.filter(
          (x) => x.eligibilityStatus === 'ELIGIBLE',
        ).length,
        selectedAssetCount: run.details.filter((x) => x.isSelected).length,
        totalAcquisitionCost: h.totalAcquisitionCost,
        totalOpeningAccumulatedDepreciation:
          h.totalOpeningAccumulatedDepreciation,
        totalCurrentDepreciation: h.totalCurrentDepreciation,
        totalClosingAccumulatedDepreciation:
          h.totalClosingAccumulatedDepreciation,
        totalClosingNetBookValue: h.totalClosingNetBookValue,
        glDifference: run.glLines.reduce(
          (sum, x) => sum + x.debit - x.credit,
          0,
        ),
      });
      this.form.patchValue(
        {
          periodKey: h.periodKey,
          runDate: new Date(h.runDate),
          branchCode: h.branchCode ?? '',
          assetCategoryCode: h.assetCategoryCode ?? '',
          methodCode: h.methodCode ?? '',
          convention: h.depreciationConvention,
          includeZeroAmount: h.includeZeroAmount,
          remarks: h.remarks ?? '',
        },
        { emitEvent: false },
      );
      h.status === 'DRAFT'
        ? this.form.enable({ emitEvent: false })
        : this.form.disable({ emitEvent: false });
    });
    effect(() => {
      const eligible = this.facade.eligibleLines();
      if (eligible.length && !this.depRunNo()) {
        this.lines.set(eligible);
        this.preview.set(null);
      }
    });
  }
  ngOnDestroy(): void {
    this.toolbar.reset();
  }
  newDocument(): void {
    void this.router.navigate(['/depreciation-runs/new']);
  }
  back(): void {
    void this.router.navigate(['/depreciation-runs']);
  }
  print(): void {
    window.print();
  }
  loadEligible(): void {
    if (this.form.invalid || this.readOnly()) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.loadEligible(this.previewRequest([]));
  }
  recalculate(): void {
    if (this.form.invalid || this.readOnly()) {
      this.form.markAllAsTouched();
      return;
    }
    const ids = this.lines()
      .filter((line) => line.isSelected)
      .map((line) => line.assetId);
    this.facade
      .calculate(this.previewRequest(ids))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.preview.set(result);
          this.lines.set(result.lines);
          this.notify.success(
            'Server calculation completed.',
            'Preview Complete',
            this.depRunNo() ?? '',
            'Depreciation',
          );
        },
        error: (error) => this.error(error),
      });
  }
  toggle(line: DepreciationLine, checked: boolean): void {
    if (this.readOnly()) return;
    this.lines.update((lines) =>
      lines.map((item) =>
        item.assetId === line.assetId ? { ...item, isSelected: checked } : item,
      ),
    );
    this.preview.set(null);
  }
  requestSave(): void {
    if (this.form.invalid || !this.preview() || !this.selectedCount()) {
      this.form.markAllAsTouched();
      this.notify.warning('Preview the selected assets before saving.');
      return;
    }
    this.confirm(
      SaveDialog,
      {
        title: this.depRunNo()
          ? 'Update Depreciation Draft'
          : 'Save Depreciation Draft',
        message:
          'The server-authoritative asset calculation snapshot will be saved.',
        moduleName: 'Depreciation',
        documentNo: this.depRunNo() ?? 'AUTO-GENERATED',
        status: this.status(),
        confirmText: this.depRunNo() ? 'Update Draft' : 'Save Draft',
      },
      () => this.save(),
    );
  }
  requestAction(
    action: 'submit' | 'approve' | 'post' | 'delete' | 'cancel',
  ): void {
    const effects: Record<typeof action, string> = {
      submit: 'The draft becomes read-only pending approval.',
      approve: 'The approved snapshot becomes eligible for posting.',
      post: 'This creates balanced GL and active asset-period schedules atomically.',
      delete: 'This permanently removes only this Draft batch.',
      cancel: 'This closes the Draft without posting.',
    };
    this.confirm(
      ActionDialog,
      {
        title: `${action[0].toUpperCase()}${action.slice(1)} Depreciation Run`,
        message: `Confirm ${action} for ${this.depRunNo()}.`,
        effectText: effects[action],
        moduleName: 'Depreciation',
        documentNo: this.depRunNo() ?? '',
        status: this.status(),
        confirmText: action === 'post' ? 'Post Depreciation' : 'Confirm',
      },
      () => this.executeAction(action),
    );
  }
  requestReverse(): void {
    this.confirm(
      ActionDialog,
      {
        title: 'Reverse Posted Depreciation',
        message:
          'This posts the exact inverse journal and inactivates this period schedule.',
        effectText:
          'Reversal is rejected when a later posted period exists for any affected asset.',
        moduleName: 'Depreciation',
        documentNo: this.depRunNo() ?? '',
        status: this.status(),
        confirmText: 'Reverse Posted Batch',
        showForm: true,
        formFields: [
          {
            name: 'reason',
            label: 'Mandatory reversal reason',
            type: 'textarea',
            rows: 4,
          },
        ],
      },
      (result) => {
        const reason = result.formValue?.['reason']?.trim() ?? '';
        if (reason.length < 5) {
          this.notify.warning(
            'Enter a reversal reason of at least five characters.',
          );
          return;
        }
        const no = this.depRunNo();
        if (!no) return;
        this.facade
          .reverse(no, { rowVersion: this.rowVersion(), reason })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (value) => this.handleResult(value),
            error: (error) => this.error(error),
          });
      },
    );
  }

  private save(): void {
    const value = this.form.getRawValue();
    const request: SaveRequest = {
      depRunNo: this.depRunNo(),
      setup: this.previewRequest(
        this.lines()
          .filter((x) => x.isSelected)
          .map((x) => x.assetId),
      ),
      runDate: this.dateOnly(value.runDate),
      remarks: value.remarks.trim() || null,
      rowVersion: this.rowVersion() || null,
      lines: this.lines(),
    };
    this.facade
      .save(this.depRunNo(), request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.handleResult(result);
          void this.router.navigate(['/depreciation-runs', result.depRunNo]);
        },
        error: (error) => this.error(error),
      });
  }
  private executeAction(action: string): void {
    const no = this.depRunNo();
    if (!no) return;
    this.facade
      .transition(no, action, { rowVersion: this.rowVersion() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.handleResult(result);
          if (result.status === 'DELETED') this.back();
        },
        error: (error) => this.error(error),
      });
  }
  private handleResult(result: CommandResult): void {
    if (result.status !== 'DELETED') this.status.set(result.status);
    this.rowVersion.set(result.rowVersion ?? '');
    this.journalNo.set(result.journalNo ?? null);
    this.reversalJournalNo.set(result.reversalJournalNo ?? null);
    this.notify.success(
      result.message,
      'Depreciation Updated',
      result.depRunNo,
      'Depreciation',
    );
    if (result.status !== 'DELETED') {
      result.status === 'DRAFT'
        ? this.form.enable({ emitEvent: false })
        : this.form.disable({ emitEvent: false });
      this.facade.load(result.depRunNo);
      this.facade.reloadRun();
    }
  }
  private previewRequest(ids: number[]): PreviewRequest {
    const value = this.form.getRawValue();
    return {
      periodKey: value.periodKey,
      branchCode: value.branchCode || null,
      assetCategoryCode: value.assetCategoryCode || null,
      methodCode: value.methodCode || null,
      convention: value.convention,
      includeZeroAmount: value.includeZeroAmount,
      selectedAssetIds: ids,
    };
  }
  private confirm(
    component: typeof SaveDialog | typeof ActionDialog,
    data: SaveDialogData | ActionDialogData,
    confirmed: (result: DialogResult) => void,
  ): void {
    const dialog: DialogRef = this.dialogs.open({
      content: component,
      width: 640,
      minWidth: 340,
    });
    (
      dialog.content.instance as { data: SaveDialogData | ActionDialogData }
    ).data = data;
    dialog.result
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (
          !(result instanceof DialogCloseResult) &&
          (result as DialogResult).action === 'confirm'
        )
          confirmed(result as DialogResult);
      });
  }
  private reset(): void {
    this.status.set('DRAFT');
    this.rowVersion.set('');
    this.lines.set([]);
    this.preview.set(null);
    this.journalNo.set(null);
    this.reversalJournalNo.set(null);
    this.form.enable({ emitEvent: false });
  }
  private error(error: unknown): void {
    console.error('DEPRECIATION API ERROR:', error);

    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : 'The depreciation request failed.';

    this.notify.error(
      message,
      'Depreciation Error',
      this.depRunNo() ?? '',
      'Depreciation',
    );
  }
  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  private dateOnly(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  private emptyPreview(): DepreciationPreview {
    return {
      lines: [],
      glLines: [],
      validations: [],
      eligibleAssetCount: 0,
      selectedAssetCount: this.selectedCount(),
      totalAcquisitionCost: 0,
      totalOpeningAccumulatedDepreciation: 0,
      totalCurrentDepreciation: 0,
      totalClosingAccumulatedDepreciation: 0,
      totalClosingNetBookValue: 0,
      glDifference: 0,
    };
  }
}
