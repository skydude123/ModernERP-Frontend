
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { DialogRef, KENDO_DIALOGS } from '@progress/kendo-angular-dialog';
import { GridModule, KENDO_GRID } from '@progress/kendo-angular-grid';
import { KENDO_INPUTS, TextAreaModule, TextBoxModule } from '@progress/kendo-angular-inputs';
import { KENDO_LABELS } from '@progress/kendo-angular-label';

export interface ErpDialogGridColumn {
  field: string;
  title: string;
  width?: number;
}

export interface ErpDialogFormField {
  name: string;
  label: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  rows?: number;
  value?: string;
}

export interface ErpSaveConfirmDialogData {
  title?: string;
  message?: string;
  moduleName?: string;
  documentNo?: string;
  status?: string;
  effectText?: string;
  note?: string;
  questionText?: string;
  confirmText?: string;
  cancelText?: string;

  showGrid?: boolean;
  gridHeight?: number;
  gridData?: any[];
  gridColumns?: ErpDialogGridColumn[];

  showForm?: boolean;
  formFields?: ErpDialogFormField[];
}

@Component({
  selector: 'app-erp-save-confirm-dialog',
  standalone: true,
  imports: [
    FormsModule,
    KENDO_DIALOGS,
    KENDO_BUTTONS,
    KENDO_INPUTS,
    KENDO_LABELS,
    KENDO_GRID
],
  templateUrl: './erp-save-confirm-dialog.component.html',
  styleUrl: './erp-save-confirm-dialog.component.scss'
})
export class ErpSaveConfirmDialogComponent {
  private readonly dialogRef = inject(DialogRef);

  private _data: ErpSaveConfirmDialogData = {
    title: 'Save Transaction',
    message: 'You are about to save this transaction record.',
    moduleName: 'General Transaction Entry',
    documentNo: 'AUTO-GENERATED / DRAFT',
    status: 'DRAFT',
    effectText:
      'Saving will store the current header and detail information so that you can continue editing or submit the document later.',
    note: 'Please review the required fields and detail lines before saving.',
    questionText: 'Do you want to proceed?',
    confirmText: 'Save Record',
    cancelText: 'Back to Entry',
    showGrid: false,
    showForm: false,
    gridData: [],
    gridColumns: [],
    formFields: []
  };

  formValue: Record<string, any> = {};

  set data(value: ErpSaveConfirmDialogData) {
    this._data = {
      ...this._data,
      ...value
    };

    this.initializeFormValue();
  }

  get data(): ErpSaveConfirmDialogData {
    return this._data;
  }

  private initializeFormValue(): void {
    const next: Record<string, any> = {};

    for (const field of this._data.formFields ?? []) {
      next[field.name] = field.value ?? '';
    }

    this.formValue = next;
  }

  updateField(name: string, value: any): void {
    this.formValue = {
      ...this.formValue,
      [name]: value ?? ''
    };
  }

  close(): void {
    this.dialogRef.close({ action: 'cancel' });
  }

  confirm(): void {
    this.dialogRef.close({
      action: 'confirm',
      formValue: { ...this.formValue }
    });
  }

  get badgeClass(): string {
    switch ((this.data.status ?? '').toUpperCase()) {
      case 'DRAFT':
        return 'erp-badge erp-badge--info';
      case 'FOR REVIEW':
        return 'erp-badge erp-badge--warning';
      case 'SAVED':
        return 'erp-badge erp-badge--success';
      case 'APPROVED':
        return 'erp-badge erp-badge--success';
      default:
        return 'erp-badge erp-badge--default';
    }
  }

  /* LATEST UPDATE 04-14-2026 */
   public trackByFieldName(_: number, field: ErpDialogFormField): string {
    return field.name;
  }

  public getDialogFormValue(): Record<string, string> {
    return { ...this.formValue };
  }
/* END */
}