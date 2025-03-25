import {Injectable} from '@angular/core';
import {AlertController} from "@ionic/angular";

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(
    private alertController: AlertController,
  ) {
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header:header,
      message:message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showColorPicker(): Promise<string> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Válassz egy színt',
        cssClass: 'color-picker-alert',
        backdropDismiss: false,
        buttons: [
          {
            text: 'Piros',
            cssClass: 'color-button red',
            handler: () => resolve('red')
          },
          {
            text: 'Kék',
            cssClass: 'color-button blue',
            handler: () => resolve('blue')
          },
          {
            text: 'Zöld',
            cssClass: 'color-button green',
            handler: () => resolve('green')
          },
          {
            text: 'Sárga',
            cssClass: 'color-button yellow',
            handler: () => resolve('yellow')
          }
        ]
      });

      await alert.present();
    });
  }

}
