import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KENDO_BUTTONS } from '@progress/kendo-angular-buttons';
import { KENDO_ICONS } from '@progress/kendo-angular-icons';
import {
  calendarIcon,
  checkCircleIcon,
  clockIcon,
  fileExcelIcon,
  infoCircleIcon,
  uploadIcon,
  SVGIcon
} from '@progress/kendo-svg-icons';
import { AuthFacadeService } from '../../core/services/auth-facade.service';

interface DashboardModuleCard {
  title: string;
  description: string;
  route: string;
  badge: string;
  actionText: string;
  svgIcon: SVGIcon;
  features: string[];
}

interface DashboardInfoCard {
  label: string;
  value: string;
}

interface DashboardGuideStep {
  number: string;
  title: string;
  description: string;
  svgIcon: SVGIcon;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    KENDO_BUTTONS,
    KENDO_ICONS
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  standalone: true
})
export class DashboardComponent {
  readonly auth = inject(AuthFacadeService);

  readonly uploadIcon = uploadIcon;
  readonly calendarIcon = calendarIcon;
  readonly checkIcon = checkCircleIcon;
  readonly infoIcon = infoCircleIcon;

  readonly userName = computed(() => this.auth.displayName() || 'User');

  readonly moduleCards: DashboardModuleCard[] = [
    {
      title: 'HRIS Biometrix',
      description: 'Upload ATTLOG.DAT, validate attendance date range, and process raw biometric logs.',
      route: '/hris-biometrix',
      badge: 'ATTLOG',
      actionText: 'Open Attendance Log',
      svgIcon: uploadIcon,
      features: [
        'ATTLOG Upload',
        'Date Validation',
        'Attendance Processing'
      ]
    },
    {
      title: 'DTR Listing',
      description: 'Review processed DTR records, verify computed hours, and export payroll-ready reports.',
      route: '/hris-biometrix/dtr-listing',
      badge: 'DTR',
      actionText: 'Open DTR Listing',
      svgIcon: calendarIcon,
      features: [
        'Branch Filter',
        'Payroll Period',
        'Excel Export'
      ]
    }
  ];

  readonly infoCards = computed<DashboardInfoCard[]>(() => [
    {
      label: 'Logged in as',
      value: this.auth.displayName() || 'N/A'
    },
    {
      label: 'Branch',
      value: this.auth.branch() || 'N/A'
    },
    {
      label: 'Department',
      value: this.auth.department() || 'N/A'
    }
  ]);

  readonly guideSteps: DashboardGuideStep[] = [
    {
      number: '01',
      title: 'Upload attendance',
      description: 'Open HRIS Biometrix, select the date range, payroll period, branch, and ATTLOG.DAT file.',
      svgIcon: uploadIcon
    },
    {
      number: '02',
      title: 'Review processed DTR',
      description: 'Go to DTR Listing, select branch and payroll period, then load the processed attendance records.',
      svgIcon: calendarIcon
    },
    {
      number: '03',
      title: 'Export payroll report',
      description: 'Review edited hours and OT, rename the file if needed, then download the Excel report.',
      svgIcon: fileExcelIcon
    }
  ];

  readonly reminderItems = [
    'Confirm the correct branch before loading records.',
    'Make sure the payroll period is selected.',
    'Review edited hours and OT before exporting.',
    'Use a clear filename for payroll reports.'
  ];

  readonly statusItems = [
    {
      label: 'API Status',
      value: 'Connected',
      type: 'success'
    },
    {
      label: 'Module',
      value: 'Processed Attendance',
      type: 'warning'
    },
    {
      label: 'Workflow',
      value: 'Payroll Ready',
      type: 'neutral'
    }
  ];
}