
import {
  Component,
  computed,
  inject
} from '@angular/core';

import { KENDO_ICONS } from '@progress/kendo-angular-icons';

import {
  homeIcon,
  infoCircleIcon
} from '@progress/kendo-svg-icons';

import { AuthFacadeService } from '../../core/services/auth-facade.service';

interface DashboardInfoCard {
  label: string;
  value: string;
}

interface DashboardStatusItem {
  label: string;
  value: string;
  type: 'success' | 'neutral';
}

interface DashboardAuthExtension {
  designation?: () => string | null | undefined;

  currentUser?: () => {
    designation?: string | null;
  } | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    KENDO_ICONS
],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly auth = inject(AuthFacadeService);

  readonly homeIcon = homeIcon;
  readonly infoIcon = infoCircleIcon;

  readonly userName = computed(() => {
    return this.auth.displayName()?.trim() || 'User';
  });

  private getDesignation(): string {
    const extendedAuth =
      this.auth as AuthFacadeService & DashboardAuthExtension;

    const designationFromFacade =
      extendedAuth.designation?.();

    const designationFromUser =
      extendedAuth.currentUser?.()?.designation;

    const fallbackDepartment =
      this.auth.department?.();

    return (
      designationFromFacade ||
      designationFromUser ||
      fallbackDepartment ||
      ''
    )
      .trim()
      .toUpperCase();
  }

  readonly normalizedDesignation = computed(() => {
    return this.getDesignation();
  });

  readonly normalizedDepartment = computed(() => {
    return (this.auth.department() || '')
      .trim()
      .toUpperCase();
  });

  readonly workspaceName = computed(() => {
    const designation = this.normalizedDesignation();
    const department = this.normalizedDepartment();

    if (
      designation.startsWith('PURCHASING') ||
      department.startsWith('PURCHASING') ||
      department.startsWith('PURCH')
    ) {
      return 'Purchasing Workspace';
    }

    if (
      designation.startsWith('WAREHOUSE') ||
      designation.startsWith('STOCKROOM') ||
      department.startsWith('WAREHOUSE') ||
      department.startsWith('STOCKROOM')
    ) {
      return 'Warehouse Workspace';
    }

    if (
      designation.startsWith('ACCOUNTING') ||
      designation.startsWith('FINANCE') ||
      department.startsWith('ACCOUNTING') ||
      department.startsWith('FINANCE')
    ) {
      return 'Accounting Workspace';
    }

    if (
      designation === 'HR' ||
      designation === 'HRD' ||
      designation.startsWith('HUMAN RESOURCE') ||
      department === 'HR' ||
      department === 'HRD' ||
      department.startsWith('HUMAN RESOURCE')
    ) {
      return 'Human Resources Workspace';
    }

    if (
      designation.startsWith('ADMIN') ||
      designation.startsWith('IT') ||
      department.startsWith('ADMIN') ||
      department.startsWith('IT')
    ) {
      return 'Administration Workspace';
    }

    if (
      designation.startsWith('PRODUCTION') ||
      designation.startsWith('OPERATIONS') ||
      department.startsWith('PRODUCTION') ||
      department.startsWith('OPERATIONS')
    ) {
      return 'Operations Workspace';
    }

    if (
      designation.startsWith('SALES') ||
      department.startsWith('SALES')
    ) {
      return 'Sales Workspace';
    }

    return 'TwinBee Inventory System';
  });

  readonly workspaceDescription = computed(() => {
    const designation = this.normalizedDesignation();
    const department = this.normalizedDepartment();

    if (
      designation.startsWith('PURCHASING') ||
      department.startsWith('PURCHASING') ||
      department.startsWith('PURCH')
    ) {
      return 'Manage purchasing, receiving, material issuance, and other inventory transactions assigned to your account.';
    }

    if (
      designation.startsWith('WAREHOUSE') ||
      designation.startsWith('STOCKROOM') ||
      department.startsWith('WAREHOUSE') ||
      department.startsWith('STOCKROOM')
    ) {
      return 'Manage receiving, warehouse inventory, stock movement, and material issuance transactions assigned to your account.';
    }

    if (
      designation.startsWith('ACCOUNTING') ||
      designation.startsWith('FINANCE') ||
      department.startsWith('ACCOUNTING') ||
      department.startsWith('FINANCE')
    ) {
      return 'Review acceptance documents, depreciation records, posting transactions, and other financial records assigned to your account.';
    }

    if (
      designation === 'HR' ||
      designation === 'HRD' ||
      designation.startsWith('HUMAN RESOURCE') ||
      department === 'HR' ||
      department === 'HRD' ||
      department.startsWith('HUMAN RESOURCE')
    ) {
      return 'Manage biometric attendance logs, DTR processing, and payroll-ready attendance records assigned to your account.';
    }

    if (
      designation.startsWith('ADMIN') ||
      designation.startsWith('IT') ||
      department.startsWith('ADMIN') ||
      department.startsWith('IT')
    ) {
      return 'Manage system modules, user access, operational records, and administrative transactions assigned to your account.';
    }

    if (
      designation.startsWith('PRODUCTION') ||
      designation.startsWith('OPERATIONS') ||
      department.startsWith('PRODUCTION') ||
      department.startsWith('OPERATIONS')
    ) {
      return 'Access operational, material issuance, inventory, and production-related modules assigned to your account.';
    }

    if (
      designation.startsWith('SALES') ||
      department.startsWith('SALES')
    ) {
      return 'Access sales, inventory, customer, and transaction modules assigned to your account.';
    }

    return 'Use the navigation menu to access the modules assigned to your account.';
  });

  readonly departmentDisplayName = computed(() => {
    const designation = this.normalizedDesignation();
    const department = this.normalizedDepartment();

    if (
      designation.startsWith('PURCHASING') ||
      department.startsWith('PURCHASING') ||
      department.startsWith('PURCH')
    ) {
      return 'PURCHASING';
    }

    if (
      designation.startsWith('WAREHOUSE') ||
      designation.startsWith('STOCKROOM') ||
      department.startsWith('WAREHOUSE') ||
      department.startsWith('STOCKROOM')
    ) {
      return 'WAREHOUSE';
    }

    if (
      designation.startsWith('ACCOUNTING') ||
      designation.startsWith('FINANCE') ||
      department.startsWith('ACCOUNTING') ||
      department.startsWith('FINANCE')
    ) {
      return 'ACCOUNTING';
    }

    if (
      designation === 'HR' ||
      designation === 'HRD' ||
      designation.startsWith('HUMAN RESOURCE') ||
      department === 'HR' ||
      department === 'HRD' ||
      department.startsWith('HUMAN RESOURCE')
    ) {
      return 'HUMAN RESOURCES';
    }

    if (
      designation.startsWith('ADMIN') ||
      designation.startsWith('IT') ||
      department.startsWith('ADMIN') ||
      department.startsWith('IT')
    ) {
      return 'ADMINISTRATION';
    }

    if (
      designation.startsWith('PRODUCTION') ||
      designation.startsWith('OPERATIONS') ||
      department.startsWith('PRODUCTION') ||
      department.startsWith('OPERATIONS')
    ) {
      return 'OPERATIONS';
    }

    if (
      designation.startsWith('SALES') ||
      department.startsWith('SALES')
    ) {
      return 'SALES';
    }

    return designation || department || 'N/A';
  });

  readonly infoCards = computed<DashboardInfoCard[]>(() => [
    {
      label: 'Logged in as',
      value: this.auth.displayName()?.trim() || 'N/A'
    },
    {
      label: 'Branch',
      value: this.auth.branch()?.trim() || 'N/A'
    },
    {
      label: 'Department',
      value: this.departmentDisplayName()
    }
  ]);

  readonly statusItems = computed<DashboardStatusItem[]>(() => [
    {
      label: 'System Status',
      value: 'Connected',
      type: 'success'
    },
    {
      label: 'Workspace',
      value: this.workspaceName()
        .replace(' Workspace', '')
        .trim(),
      type: 'neutral'
    },
    {
      label: 'Access',
      value: 'Permission Based',
      type: 'neutral'
    }
  ]);
}