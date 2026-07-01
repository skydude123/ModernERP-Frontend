import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  signal,
  ViewChild
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_DATEINPUTS } from '@progress/kendo-angular-dateinputs';
import {
  DropDownFilterSettings,
  KENDO_DROPDOWNS
} from '@progress/kendo-angular-dropdowns';
import {
  GridComponent,
  KENDO_GRID,
  RowArgs,
  SelectableSettings,
  SelectionEvent
} from '@progress/kendo-angular-grid';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_LABEL } from '@progress/kendo-angular-label';
import { SelectEvent, KENDO_UPLOADS } from '@progress/kendo-angular-upload';
import { saveAs } from '@progress/kendo-file-saver';
import {
  cancelIcon,
  checkCircleIcon,
  clockIcon,
  downloadIcon,
  fileCsvIcon,
  fileExcelIcon,
  filePdfIcon,
  saveIcon,
  uploadIcon,
  SVGIcon
} from '@progress/kendo-svg-icons';
import { BiometrixAttlogFacade } from './biometrix-attlog.facade';
import { BiometrixAttendanceRow } from './biometrix-attlog.model';

interface BiometrixAttendanceGridRow extends Partial<BiometrixAttendanceRow> {
  payrollPeriodDisplay?: string | null;
}

type ExportType = 'excel' | 'csv' | 'pdf';

interface ExportMenuItem {
  text: string;
  exportType: ExportType;
  svgIcon: SVGIcon;
}

interface KendoDropDownButtonClickEvent {
  item?: ExportMenuItem;
}

@Component({
  selector: 'app-biometrix-attlog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KENDO_UPLOADS,
    KENDO_DATEINPUTS,
    KENDO_DROPDOWNS,
    KENDO_LABEL,
    KENDO_GRID,
    KENDO_INPUTS,
    KENDO_BUTTONS,
    KENDO_ICONS
  ],
  providers: [BiometrixAttlogFacade],
  templateUrl: './biometrix-attlog.component.html',
  styleUrls: ['./biometrix-attlog.component.scss']
})
export class BiometrixAttlogComponent {
  readonly facade = inject(BiometrixAttlogFacade);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('attendanceGrid')
  private attendanceGrid?: GridComponent;

  readonly uploadSvgIcon = uploadIcon;

  // MODIFICATION:
  // refreshIcon is not exported in your installed @progress/kendo-svg-icons package.
  // This custom SVGIcon still uses Kendo SVGIcon rendering.
  readonly refreshSvgIcon: SVGIcon = {
    name: 'refresh-custom',
    viewBox: '0 0 512 512',
    content:
      '<path d="M463.5 224H448c-17.7 0-32 14.3-32 32 0 88.4-71.6 160-160 160-39.8 0-76.2-14.6-104.2-38.7L185.4 344c10.1-10.1 2.9-27.4-11.3-27.4H64c-8.8 0-16 7.2-16 16v110.1c0 14.3 17.3 21.4 27.4 11.3l31.4-31.4C146.7 459.2 199.1 480 256 480c123.7 0 224-100.3 224-224 0-17.7-14.3-32-32-32h15.5zM256 32C132.3 32 32 132.3 32 256c0 17.7 14.3 32 32 32h16c17.7 0 32-14.3 32-32 0-88.4 71.6-160 160-160 39.8 0 76.2 14.6 104.2 38.7L342.6 168c-10.1 10.1-2.9 27.4 11.3 27.4H464c8.8 0 16-7.2 16-16V69.3c0-14.3-17.3-21.4-27.4-11.3l-31.4 31.4C381.3 52.8 328.9 32 256 32z"/>'
  };

  readonly clearSvgIcon = cancelIcon;
  readonly saveSvgIcon = saveIcon;
  readonly downloadSvgIcon = downloadIcon;
  readonly excelSvgIcon = fileExcelIcon;
  readonly csvSvgIcon = fileCsvIcon;
  readonly pdfSvgIcon = filePdfIcon;
  readonly checkSvgIcon = checkCircleIcon;
  readonly clockSvgIcon = clockIcon;

  readonly payrollContextForm = new FormGroup({
    payrollPeriod: new FormControl<number | null>(null, Validators.required),
    branchName: new FormControl<string | null>(null, Validators.required)
  });

  readonly comboFilterSettings: DropDownFilterSettings = {
    caseSensitive: false,
    operator: 'contains'
  };

  readonly payrollPeriods = computed(() =>
    this.facade.payrollPeriods().map(item => ({
      id: item.payrollPeriod,
      name: String(item.payrollPeriod)
    }))
  );

  readonly branches = computed(() =>
    this.facade.branches().map(item => ({
      id: item.branchName,
      name: item.branchName
    }))
  );

  readonly exportMenuItems: ExportMenuItem[] = [
    {
      text: 'Export to Excel (.xlsx)',
      exportType: 'excel',
      svgIcon: fileExcelIcon
    },
    {
      text: 'Export to CSV (.csv)',
      exportType: 'csv',
      svgIcon: fileCsvIcon
    },
    {
      text: 'Export to PDF (.pdf)',
      exportType: 'pdf',
      svgIcon: filePdfIcon
    }
  ];

  readonly isExporting = signal(false);
  readonly exportingType = signal<ExportType | null>(null);
  readonly exportStatus = signal<string | null>(null);

  readonly selectableSettings: SelectableSettings = {
    enabled: true,
    mode: 'single',
    checkboxOnly: false,
    cell: false,
    drag: false
  };

  selectedAttendanceKeys: string[] = [];
  selectedAttendanceRow: BiometrixAttendanceGridRow | null = null;

  readonly attendanceRowKey = (context: RowArgs): string => {
    const row = context.dataItem as BiometrixAttendanceGridRow;
    return this.buildRowKey(row);
  };

  readonly allExportData = (): { data: BiometrixAttendanceGridRow[] } => {
    return {
      data: this.exportRowsForFile()
    };
  };

  gridRowsForDisplay(): BiometrixAttendanceGridRow[] {
    const selectedPayrollPeriodName = this.getSelectedPayrollPeriodName();
    const selectedBranchName = this.payrollContextForm.controls.branchName.value;

    return (this.facade.rows() as BiometrixAttendanceGridRow[]).map(row => ({
      ...row,
      payrollPeriodDisplay:
        row.payrollPeriod !== null && row.payrollPeriod !== undefined
          ? String(row.payrollPeriod)
          : selectedPayrollPeriodName || '',
      branchName: row.branchName || selectedBranchName || ''
    }));
  }

  onFileSelect(event: SelectEvent): void {
    const file = (event.files?.[0]?.rawFile as File | undefined) ?? null;
    this.facade.setSelectedFile(file);
  }

  onUploadAndProcess(): void {
    this.clearGridSelection();

    if (this.payrollContextForm.invalid) {
      this.payrollContextForm.markAllAsTouched();
      return;
    }

    this.facade.uploadAndProcess(
      this.payrollContextForm.controls.payrollPeriod.value,
      this.payrollContextForm.controls.branchName.value
    );
  }

  onRefresh(): void {
    this.clearGridSelection();
    this.facade.refreshCurrentBatch();
  }

  onClear(): void {
    this.clearGridSelection();

    this.payrollContextForm.reset({
      payrollPeriod: null,
      branchName: null
    });

    this.facade.clear();
  }

  onSelectedKeysChange(keys: string[]): void {
    this.selectedAttendanceKeys = keys.length > 0 ? [keys[keys.length - 1]] : [];

    if (this.selectedAttendanceKeys.length === 0) {
      this.selectedAttendanceRow = null;
    }
  }

  onSelectionChange(event: SelectionEvent): void {
    const selectedRow = event.selectedRows?.[0]?.dataItem as
      | BiometrixAttendanceGridRow
      | undefined;

    if (selectedRow) {
      this.selectedAttendanceRow = selectedRow;
      return;
    }

    if (this.selectedAttendanceKeys.length === 0) {
      this.selectedAttendanceRow = null;
    }
  }

  onOtValueChange(row: BiometrixAttendanceGridRow, value: number | null): void {
    const rowKey = this.buildRowKey(row);
    this.facade.updateOtLocally(rowKey, value);
    this.syncSelectedRow(rowKey);
  }

  onSaveOt(row: BiometrixAttendanceGridRow): void {
    const rowKey = this.buildRowKey(row);
    this.facade.saveOt(rowKey, 'Admin');
    this.syncSelectedRow(rowKey);
  }

  onSaveAllOtChanges(): void {
    this.facade.saveAllOtChanges();
  }

  onRevertOt(row: BiometrixAttendanceGridRow): void {
    const rowKey = this.buildRowKey(row);
    this.facade.revertOt(rowKey);
    this.syncSelectedRow(rowKey);
  }

  isOtDirty(row: BiometrixAttendanceGridRow): boolean {
    return this.facade.isOtDirty(this.buildRowKey(row));
  }

  isOtSaving(row: BiometrixAttendanceGridRow): boolean {
    return this.facade.isOtSaving(this.buildRowKey(row));
  }

  getOtSaveError(row: BiometrixAttendanceGridRow): string | null {
    return this.facade.getOtSaveError(this.buildRowKey(row));
  }

  canExport(): boolean {
    return this.gridRowsForDisplay().length > 0 &&
      !this.facade.loading() &&
      !this.isExporting();
  }

  onExportMenuItemClick(event: KendoDropDownButtonClickEvent | ExportMenuItem): void {
    const item = this.resolveExportMenuItem(event);

    if (!item || !this.canExport()) {
      return;
    }

    this.startExport(item.exportType);
  }

  exportToExcel(): void {
    this.startExport('excel');
  }

  exportToPdf(): void {
    this.startExport('pdf');
  }

  exportToCsv(): void {
    this.startExport('csv');
  }

  toNumber(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return 0;
    }

    return numericValue;
  }

  getExportFileName(extension: 'xlsx' | 'csv' | 'pdf'): string {
    const batch = this.facade.batchDetail();
    const batchId = batch?.uploadBatchId ?? 'current';
    const branch = this.payrollContextForm.controls.branchName.value || 'ALL';
    const payrollPeriod = this.payrollContextForm.controls.payrollPeriod.value || 'NA';

    return `biometrix-attendance_batch-${batchId}_period-${payrollPeriod}_${branch}.${extension}`;
  }

  private startExport(type: ExportType): void {
    this.isExporting.set(true);
    this.exportingType.set(type);
    this.exportStatus.set(`Preparing ${this.getExportLabel(type)} export...`);

    this.cdr.detectChanges();

    window.setTimeout(() => {
      try {
        if (type === 'excel') {
          this.attendanceGrid?.saveAsExcel();
        }

        if (type === 'pdf') {
          this.attendanceGrid?.saveAsPDF();
        }

        if (type === 'csv') {
          this.saveCsvFile();
        }

        this.exportStatus.set(`${this.getExportLabel(type)} export started.`);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'Unable to export attendance result.';

        this.exportStatus.set(message);
      } finally {
        window.setTimeout(() => {
          this.isExporting.set(false);
          this.exportingType.set(null);
          this.exportStatus.set(null);
          this.cdr.detectChanges();
        }, 1400);
      }
    }, 80);
  }

  private saveCsvFile(): void {
    const csvContent = this.buildCsvContent(this.exportRowsForFile());
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8'
    });

    saveAs(blob, this.getExportFileName('csv'));
  }

  private exportRowsForFile(): BiometrixAttendanceGridRow[] {
    return this.gridRowsForDisplay().map(row => ({
      ...row,
      ot: this.toNumber(row.ot),
      noOfHoursWork: this.toNumber(row.noOfHoursWork)
    }));
  }

  private buildCsvContent(rows: BiometrixAttendanceGridRow[]): string {
    const headers = [
      'IDNO',
      'DATE',
      'DAY',
      'TIME-IN',
      'TIME-OUT',
      'NO. OF HOURS WORK',
      'OT',
      'PAYROLL PERIOD',
      'BRANCH',
      'REMARKS'
    ];

    const lines = rows.map(row => [
      row.idno ?? '',
      row.date ?? '',
      row.dayName ?? '',
      row.timeIn ?? '',
      row.timeOut ?? '',
      row.noOfHoursWork ?? '',
      row.ot ?? '',
      row.payrollPeriodDisplay ?? '',
      row.branchName ?? '',
      row.remarks ?? ''
    ]);

    return [
      headers,
      ...lines
    ]
      .map(line => line.map(value => this.escapeCsvValue(value)).join(','))
      .join('\r\n');
  }

  private escapeCsvValue(value: unknown): string {
    const stringValue = String(value ?? '');

    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  private resolveExportMenuItem(event: KendoDropDownButtonClickEvent | ExportMenuItem): ExportMenuItem | null {
    const eventWithItem = event as KendoDropDownButtonClickEvent;

    if (eventWithItem.item?.exportType) {
      return eventWithItem.item;
    }

    const directItem = event as ExportMenuItem;

    if (directItem.exportType) {
      return directItem;
    }

    return null;
  }

  private getExportLabel(type: ExportType): string {
    if (type === 'excel') {
      return 'Excel';
    }

    if (type === 'csv') {
      return 'CSV';
    }

    return 'PDF';
  }

  private syncSelectedRow(rowKey: string): void {
    if (!this.selectedAttendanceRow) {
      return;
    }

    if (this.buildRowKey(this.selectedAttendanceRow) !== rowKey) {
      return;
    }

    const updatedSelectedRow = this.gridRowsForDisplay()
      .find(row => this.buildRowKey(row) === rowKey);

    this.selectedAttendanceRow = updatedSelectedRow ?? this.selectedAttendanceRow;
  }

  private getSelectedPayrollPeriodName(): string | null {
    const payrollPeriod = this.payrollContextForm.controls.payrollPeriod.value;

    if (!payrollPeriod) {
      return null;
    }

    return String(payrollPeriod);
  }

  private buildRowKey(row: BiometrixAttendanceGridRow): string {
    return [
      row.idno ?? '',
      row.date ?? '',
      row.timeIn ?? '',
      row.timeOut ?? ''
    ].join('|');
  }

  private clearGridSelection(): void {
    this.selectedAttendanceKeys = [];
    this.selectedAttendanceRow = null;
  }
}