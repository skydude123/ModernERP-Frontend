import { inject, Injectable, Type } from '@angular/core';
import { NotificationRef, NotificationService } from '@progress/kendo-angular-notification';
import { ErpNotificationCardComponent, ErpNotificationCardData } from './erp-notification-card.component';

@Injectable({
  providedIn: 'root'
})
export class ErpNotificationService {

private readonly notificationService = inject(NotificationService);

  private showCard(data: ErpNotificationCardData, hideAfter = 2600): NotificationRef {
    const ref = this.notificationService.show({
      content: ErpNotificationCardComponent as Type<unknown>,
      hideAfter,
      animation: { type: 'fade', duration: 250 },
      position: { horizontal: 'center', vertical: 'top' },
      width: 620,
      height: 118,
      cssClass: ['erp-notification-wrapper']
    });

    const contentRef = ref.content;
    if (contentRef?.instance) {
      (contentRef.instance as ErpNotificationCardComponent).data = {
        type: data.type ?? 'success',
        title: data.title ?? 'Notification',
        message: data.message ?? '',
        documentNo: data.documentNo ?? '',
        moduleName: data.moduleName ?? ''
      };
    }

    return ref;
  }

  public success(message: string, title = 'Save Successful', documentNo = '', moduleName = ''): NotificationRef {
    return this.showCard({
      type: 'success',
      title,
      message,
      documentNo,
      moduleName
    });
  }

  public error(message: string, title = 'Save Failed', documentNo = '', moduleName = ''): NotificationRef {
    return this.showCard({
      type: 'error',
      title,
      message,
      documentNo,
      moduleName
    }, 3200);
  }

  public warning(message: string, title = 'Warning', documentNo = '', moduleName = ''): NotificationRef {
    return this.showCard({
      type: 'warning',
      title,
      message,
      documentNo,
      moduleName
    }, 3000);
  }

  public info(message: string, title = 'Information', documentNo = '', moduleName = ''): NotificationRef {
    return this.showCard({
      type: 'info',
      title,
      message,
      documentNo,
      moduleName
    });
  }
}
