export type ServiceAcceptanceStatus =
  | 'DRAFT'
  | 'SUBMITTED' // legacy compatibility
  | 'ACCEPTED'
  | 'POSTED'
  | 'REVERSED';


export type ServiceType =
  | 'REPAIR_MAINTENANCE'
  | 'MECHANIC_SERVICE'
  | 'COMPUTER_REPAIR'
  | 'JOB_OUT'
  | 'INSTALLATION'
  | 'LABOR'
  | 'FREIGHT';


export interface ApiResponse<T> {
  success: boolean;

  message?: string;

  data?: T;

  error?: string;
}


export interface PagedResult<T> {
  data: T[];

  total: number;
}


export interface ServiceAcceptanceListQuery {
  fromDate: string | null;

  toDate: string | null;

  status: string;

  branchName: string | null;

  search: string | null;

  skip: number;

  take: number;

  sortField: string;

  sortDir: 'asc' | 'desc';
}


export interface ServiceAcceptanceListItem {
  serviceAcceptanceNo: string;

  acceptanceDate: string;

  /*
   * Display:
   * 066100, 066125, 066130
   */
  poNo: string;

  suppCode: string;

  suppName: string;

  serviceType: ServiceType;

  branchName: string;

  projectNo: string | null;

  completionPercent: number;

  totalAcceptedAmount: number;

  status: ServiceAcceptanceStatus;
}


export interface ServiceAcceptanceHeader {
  serviceAcceptanceNo: string;

  acceptanceDate: string;

  /*
   * Display/legacy only.
   */
  poNo?: string | null;

  suppCode: string;

  suppName: string;

  serviceType: ServiceType;

  branchName: string;

  departmentCode: string | null;

  projectNo: string | null;

  joNo: string | null;

  serviceLocation: string | null;

  servicePeriodFrom: string | null;

  servicePeriodTo: string | null;

  requestedBy: string | null;

  remarks: string | null;

  completionPercent: number;

  totalAcceptedAmount: number;

  status: ServiceAcceptanceStatus;

  submittedBy: string | null;

  submittedDate: string | null;

  acceptedBy: string | null;

  acceptedDate: string | null;

  postedBy: string | null;

  postedDate: string | null;

  reversedBy: string | null;

  reversedDate: string | null;

  reverseReason: string | null;

  createdBy: string;

  createdDate: string;

  modifiedBy: string | null;

  modifiedDate: string | null;

  rowVersion: string;
}


/* ============================================================
   DETAIL

   PO NO NOW BELONGS HERE.
   ============================================================ */

export interface ServiceAcceptanceDetail {
  serviceLineNo?: number;

  serviceAcceptanceNo?: string;

  lineSeq: number;

  poNo: string;

  poSeq: number;

  itemCode: string | null;

  serviceDescription: string;

  unitOfMeasure: string | null;

  poQty: number;

  remainingQty: number;

  acceptedQty: number;

  rate: number;

  acceptedAmount?: number;

  taxSchemeCode: string;

  remarks: string | null;
}


export interface ServiceAcceptanceChecklist {
  checklistLineNo?: number;

  serviceAcceptanceNo?: string;

  lineSeq: number;

  checklistCode: string;

  checklistDescription: string;

  isRequired: boolean;

  isCompleted: boolean;

  completedBy?: string | null;

  completedDate?: string | null;

  remarks: string | null;
}


export interface ServiceAcceptanceDocument {
  header: ServiceAcceptanceHeader;

  details: ServiceAcceptanceDetail[];

  checklist: ServiceAcceptanceChecklist[];
}


/* ============================================================
   SAVE

   NO HEADER PO.
   ============================================================ */

export interface ServiceAcceptanceSaveRequest {
  header: {
    serviceAcceptanceNo: string | null;

    acceptanceDate: string;

    suppCode: string;

    serviceType: ServiceType;

    branchName: string;

    departmentCode: string | null;

    projectNo: string | null;

    joNo: string | null;

    serviceLocation: string | null;

    servicePeriodFrom: string | null;

    servicePeriodTo: string | null;

    requestedBy: string | null;

    remarks: string | null;

    userId: string;

    rowVersion: string | null;
  };

  details: ServiceAcceptanceDetail[];

  checklist: ServiceAcceptanceChecklist[];
}


export interface ServiceAcceptanceWorkflowRequest {
  userId: string;

  rowVersion: string | null;

  reason?: string | null;
}


export interface ServiceAcceptanceCommandResponse {
  serviceAcceptanceNo: string;

  status: ServiceAcceptanceStatus;

  rowVersion: string;

  message: string;
}


/* ============================================================
   OPEN PO LINE
   ============================================================ */

export interface ServiceOpenPoLineLookup {
  poNo: string;

  poDate: string;

  poSeq: number;

  suppCode: string;

  suppName: string;

  branchName: string;

  itemCode: string | null;

  serviceDescription: string;

  unitOfMeasure: string | null;

  poQty: number;

  acceptedQty: number;

  remainingQty: number;

  rate: number;
}


export interface ServiceTaxSchemeLookup {
  taxSchemeCode: string;

  taxName: string;
}


export interface ServiceSupplierLookup {
  suppCode: string;

  suppName: string;

  displayText: string;
}


export interface ServiceBranchLookup {
  branchName: string;
}


export interface ServiceVpSource {
  serviceAcceptanceNo: string;

  acceptanceDate: string;

  poNo: string;

  suppCode: string;

  suppName: string;

  branchName: string;

  acceptedAmount: number;
}