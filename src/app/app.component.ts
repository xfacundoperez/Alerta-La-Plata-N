import { Component, OnInit } from '@angular/core';

import { Platform, MenuController, LoadingController, AlertController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Storage } from '@ionic/storage';
import { AlertingService } from './service/alerting.service';
import { ToastController } from '@ionic/angular';
import { CallNumber } from '@ionic-native/call-number/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  // Variables por defecto
  public selectedIndex = 0;
  public appPages = [
    {
      title: 'Inicio',
      url: '/pages/home',
      icon: 'home',
      hide: false
    },
    {
      title: 'Activación',
      url: '/pages/activate',
      icon: 'shield-checkmark',
      hide: true
    },
    {
      title: 'Números de emergencia',
      url: '/pages/emergency',
      icon: 'alert-circle',
      hide: false
    },
    {
      title: 'Configuración',
      url: '/pages/configuration',
      icon: 'settings',
      hide: true
    },
  ];
  public pageCallNumbers = [
    {
      number: 911,
      title: 'Central de Emergencias Nacional',
    },
    {
      number: 147,
      title: 'Atención al vecino',
    },
    {
      number: 145,
      title: 'Denunciá la trata',
    },
    {
      number: 144,
      title: 'Violencia de Género',
    },
    {
      number: 142,
      title: 'Menores Extraviados',
    },
    {
      number: 141,
      title: 'Ayuda Sedronar',
    },
    {
      number: 135,
      title: 'Asistencia al suicida',
    },
    {
      number: 107,
      title: 'Emergencias Médicas',
    },
    {
      number: 106,
      title: 'Emergencia Nautica',
    },
    {
      number: 103,
      title: 'Defensa civil',
    },
    {
      number: 100,
      title: 'Bomberos',
    },
  ];
  public imgs = {
    logo: 'assets/img/com_logo_b.png',
    footer: 'assets/img/municipalidad_logo.png',
  };
  public loading = null;

  constructor(
    private platform: Platform,
    private menuController: MenuController,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private storage: Storage,
    private callNumber: CallNumber,
    public alertController: AlertController,
    public loadingController: LoadingController,
    public alertingService: AlertingService,
    public toastController: ToastController
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  ngOnInit() {
    const path = window.location.pathname;
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(page => page.url === path);
    }
    this.alertingService.check_app_status().then(status => {
      this.appPages[1].hide = status.activation.active;
    })
  }

  ngOnDestroy() {
    this.alertingService.backgroundLocationRemoveAllListener();
  }

  makeCall(_number: number) {
    this.callNumber.callNumber(_number.toString(), true)
      .then(res => {})
      .catch(err => {});
  }
  //#region EXTRAS
  openMenu() {
    this.menuController.open();
  }

  closeMenu() {
    this.menuController.close();
  }

  toggleMenu() {
    this.menuController.toggle();
  }

  async presentAlert(_header: string, _subHeader: string, _message: string) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: _header,
      subHeader: _subHeader,
      message: _message,
      animated: false,
      backdropDismiss: false,
      buttons: ['OK']
    });

    await alert.present();
  }

  async presentAlertConfirm(_header: string, _subHeader: string, _message: string, _ok_text: string, _ok_handler?: any, _cancel_handler?: any) {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: _header,
      subHeader: _subHeader,
      message: _message,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            if (_cancel_handler)
              _cancel_handler()
          }
        }, {
          text: _ok_text,
          role: 'okay',
          handler: () => {
            if (_ok_handler)
              _ok_handler()
          }
        }
      ]
    })
    await alert.present()
    //return alert.onDidDismiss();
  }


  async presentLoading(_message = '') {
    this.loading = await this.loadingController.create({
      spinner: 'crescent',
      message: _message,
      backdropDismiss: false,
      mode: 'ios',
      translucent: true
    });
    await this.loading.present();

    const { role, data } = await this.loading.onDidDismiss();
  }

  async dismissLoading() {
    if (this.loading !== null) {
      this.loading.dismiss();
      this.loading = null;
    }
  }

  async presentToast(_mesage: string, _duration: number) {
    const toast = await this.toastController.create({
      message: _mesage,
      position: 'bottom',
      translucent: true,
      duration: _duration * 1000
    });
    toast.present();
  }



  //#endregion
}
