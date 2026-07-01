import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_DATEINPUTS } from '@progress/kendo-angular-dateinputs';
import { KENDO_DIALOG } from '@progress/kendo-angular-dialog';
import { KENDO_DROPDOWNS } from '@progress/kendo-angular-dropdowns';
import { ExcelExportComponent, KENDO_EXCELEXPORT } from '@progress/kendo-angular-excel-export';
import { KENDO_GRID } from '@progress/kendo-angular-grid';
import { KENDO_INPUTS } from '@progress/kendo-angular-inputs';
import { KENDO_LABEL } from '@progress/kendo-angular-label';
import { arrowRotateCwIcon, fileExcelIcon, SVGIcon } from '@progress/kendo-svg-icons';
import { BiometrixDtrListingFacade } from './biometrix-dtr-listing.facade';

@Component({
  selector: 'app-biometrix-dtr-listing',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KENDO_GRID,
    KENDO_DROPDOWNS,
    KENDO_BUTTONS,
    KENDO_DIALOG,
    KENDO_INPUTS,
    KENDO_LABEL,
    KENDO_DATEINPUTS,
    KENDO_EXCELEXPORT
  ],
  providers: [BiometrixDtrListingFacade],
  templateUrl: './biometrix-dtr-listing.component.html',
  styleUrls: ['./biometrix-dtr-listing.component.scss']
})
export class BiometrixDtrListingComponent {
  readonly facade = inject(BiometrixDtrListingFacade);
  private readonly fb = inject(FormBuilder);

  readonly excelIcon: SVGIcon = fileExcelIcon;
  readonly refreshIcon: SVGIcon = arrowRotateCwIcon;

  readonly exportDialogOpen = signal(false);
  readonly exportFileName = signal('Biometrix_DTR_Export.xlsx');

  readonly exportForm = this.fb.group({
    fileName: ['', [Validators.required]]
  });

  @ViewChild('excelExport', { static: false })
  excelExport?: ExcelExportComponent;

  constructor() {
    this.facade.loadLookups();
  }

  openExportDialog(): void {
    if (!this.facade.canExport()) {
      return;
    }

    this.exportForm.patchValue({
      fileName: this.defaultExportFileNameWithoutExtension()
    });

    this.exportDialogOpen.set(true);
  }

  closeExportDialog(): void {
    this.exportDialogOpen.set(false);
  }

  confirmExport(): void {
    if (!this.facade.canExport()) {
      return;
    }

    if (this.exportForm.invalid) {
      this.exportForm.markAllAsTouched();
      return;
    }

    const rawFileName = (this.exportForm.controls.fileName.value ?? '').trim();
    const safeFileName = this.sanitizeFileName(rawFileName);

    if (!safeFileName) {
      this.exportForm.controls.fileName.setErrors({ required: true });
      return;
    }

    this.exportFileName.set(`${safeFileName}.xlsx`);
    this.exportDialogOpen.set(false);

    setTimeout(() => {
      this.excelExport?.save();
    }, 0);
  }

  private defaultExportFileNameWithoutExtension(): string {
    const branch =
      (this.facade.filterForm.controls.branchName.value ?? 'ALL')
        .toString()
        .trim() || 'ALL';

    const payrollPeriod =
      (this.facade.filterForm.controls.payrollPeriod.value ?? 'PAYROLL')
        .toString()
        .trim() || 'PAYROLL';

    return `Biometrix_DTR_${branch.replace(/\s+/g, '_')}_Payroll_${payrollPeriod}`;
  }

  private sanitizeFileName(value: string): string {
    return value
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
      .replace(/\s+/g, '_')
      .replace(/\.+$/g, '')
      .trim();
  }
}