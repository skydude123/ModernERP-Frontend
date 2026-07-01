export interface BiometrixUploadCommand {
  dateFrom: Date | null;
  dateTo: Date | null;
  uploadedBy?: string | null;
  file: File | null;

  // MODIFICATION:
  // Sent to API FormData as payrollPeriod.
  payrollPeriod?: number | null;

  // MODIFICATION:
  // Sent to API FormData as branchName.
  branchName?: string | null;
}

export interface BiometrixPayrollPeriod {
  payrollPeriod: number;
  fiscalYear: number;
  fiscalPeriod: string;

  // MODIFICATION:
  // This should now be "341", "342", "343", etc.
  displayName: string;
}

export interface BiometrixBranch {
  branchName: string;
}

export interface BiometrixAttendanceRow {
  // MODIFICATION:
  // Required for safe OT update.
  // Backend GetBatchByIdAsync must return this field.
  processedAttendanceId?: number | null;

  idno: string;
  date: string;
  dayName: string;
  scheduleCode: string;
  timeIn: string | null;
  timeOut: string | null;
  noOfHoursWork: number;
  ot: number;
  remarks: string;

  // MODIFICATION:
  // Payroll period saved from dbo.biometric_current_period.payroll_period.
  payrollPeriod?: number | null;

  // Kept optional in case API still sends this, but grid will display payrollPeriod.
  payrollPeriodName?: string | null;

  branchName?: string | null;

  // MODIFICATION:
  // UI-only fields for editable OT.
  originalOt?: number;
  otDirty?: boolean;
  otSaving?: boolean;
  otSaveError?: string | null;
}

export interface BiometrixUploadBatchDetailResponse {
  uploadBatchId: number;
  originalFileName: string;
  dateFrom: string;
  dateTo: string;
  fileSizeBytes: number;
  rawLineCount: number;
  parserValidLineCount: number;
  parserInvalidLineCount: number;
  stagedPunchCount: number;
  processedRowCount: number;
  processingStatus: string;
  errorMessage: string | null;
  uploadedBy: string | null;
  createdAt: string;
  processedAt: string | null;
  rows: BiometrixAttendanceRow[];
}

export interface BiometrixUploadBatchHistoryResponse {
  uploadBatchId: number;
  originalFileName: string;
  dateFrom: string;
  dateTo: string;
  rawLineCount: number;
  parserValidLineCount: number;
  parserInvalidLineCount: number;
  stagedPunchCount: number;
  processedRowCount: number;
  processingStatus: string;
  errorMessage: string | null;
  uploadedBy: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface BiometrixUploadSummary {
  totalRows: number;
  totalHours: number;
  totalOt: number;
  incompleteRows: number;
}

export interface BiometrixAttendanceOtUpdateRequest {
  processedAttendanceId: number;
  otHours: number;
  updatedBy?: string | null;
}

export interface BiometrixAttendanceOtUpdateResponse {
  processedAttendanceId: number;
  uploadBatchId: number;
  employeeIdNo: string;
  workDate: string;
  otMinutes: number;
  otHours: number;
  updatedAt: string;
  updatedBy: string;
}


export interface BiometrixLookupItem {
  text: string;
  value: string;
}

export interface BiometrixDtrListingRow {
  dtrId: number;
  dateFrom: string;
  dateTo: string;
  uploadBatchId: number;
  payrollPeriod: number;
  branchName: string;
  employeeIdNo: string;
  hrisIdNo: string | null;
  empName: string | null;
  dayName: string | null;
  workDate: string;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  timeIn: string | null;
  timeOut: string | null;
  noOfHoursWorkMinutes: number;
  noOfHoursWork: number;
  otMinutes: number;
  otHours: number;
  remarks: string | null;
}

export interface BiometrixDtrListingFilter {
  branchName: string;
  payrollPeriod: number;
}

export interface BiometrixDtrListingUpdateRequest {
  dtrId: number;
  workDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  timeIn: string | null;
  timeOut: string | null;
  noOfHoursWork: number;
  otHours: number;
  remarks: string | null;
}