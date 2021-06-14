import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
//import { SMS } from '@ionic-native/sms/ngx';
import { Storage } from '@ionic/storage';
import { AppComponent } from '../../app.component';
import { AnimationController, IonButton, IonImg } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild('animationBackground', { read: ElementRef }) animationBackground: ElementRef;
  //#region VARIABLES
  textarea: string;
  btn_rotated = 'rotate';
  btn_image = '../../../assets/img/ciudadSegura.svg';
  isKeyboardHide: boolean;
  isShowingAlert: boolean;
  backgroundAnimation = null;
  public status = {
    errors: [],
    prepared: null,
    title: null,
    icon: null,
    backcolor: '',
    timer_status: 0,
    activation: {
      active: true,
      tel: null
    },
    alerting: {
      active: false,
      sms_only: false,
      title: ''
    },
    location: {
      enabled: true,
      auth: true,
    },
    sms: {
      auth: true,
    },
    internet: true,
    isPaused: false
  }
  private status_interval = null;
  //#endregion

  constructor(
    private router: Router,
    private storage: Storage,
    public appComponent: AppComponent,
    private keyboard: Keyboard,
    private androidPermissions: AndroidPermissions,
    private animationCtrl: AnimationController,
    //private sms: SMS
  ) { }

  ngOnInit() { }

  ionViewWillEnter() {
    this.keyboard.onKeyboardWillShow().subscribe(() => {
      this.isKeyboardHide = false;
    })
    this.keyboard.onKeyboardWillHide().subscribe(() => {
      this.isKeyboardHide = true;
    })
    this.isKeyboardHide = true;
  }

  ionViewDidEnter() {
    this.loadStatus();
    this.status_interval = setInterval(() => {
      if (!this.status.isPaused)
        this.refreshStatus(null, 0);
    }, 2000);
  }

  ionViewWillLeave() {
    clearInterval(this.status_interval);
    this.status_interval = null;
  }

  //#region Enviar alerta
  async buttonLocateClick() {
    if (this.status.prepared !== null || !this.status.isPaused) {
      /* For Testing
      this.storage.set('alert', 'test').then(() => {
        this.refreshStatus();
        setTimeout(() => {
      this.backgroundAnimation.stop();
          this.storage.set('alert', null);    
        }, 5000)
      })
      */
      if (this.status.activation.active) {
        this.btn_rotated = 'spin';
        if (!this.status.internet)
          this.appComponent.presentAlert('Atención', 'Sin internet', 'La alerta se enviará solo por SMS').then(() => {
            this.appComponent.alertingService.startalerting();
          })
        else
          this.appComponent.alertingService.startalerting();
        this.status.isPaused = true;
      }
    }
  }

  buttonLocatePress(event: Event) {
    if (!this.status.isPaused) {
      if (event.type == 'touchstart') {
        this.btn_rotated = 'rotate';
      } else {
        this.btn_rotated = '';
      }
    }
  }

  async buttonSendMessage() {
    //this.appComponent.alertingService.updateAlert();
    if (this.status.alerting.active) {
      if (this.textarea == '') {
        this.appComponent.presentAlert('Atención', 'Enviar mensaje', `Necesita escibrir algo antes de enviar`);
      } else {
        this.status.isPaused = true;
        await this.storage.set('msg', this.textarea).then(() => {
          this.textarea = "";
        })
        await this.appComponent.presentToast('Enviando mensaje...', 2).finally(() => {
          this.appComponent.alertingService.updateAlert();
        });
        await this.appComponent.presentToast('¡Mensaje enviado!', 4).finally(() => {
          this.status.isPaused = false;
        });
        //this.appComponent.presentAlert('Atención', 'Alerta actualizada', `¡Mensaje enviado correctamente!`);
      }
    }
  }
  //#endregion

  //#region Permisions
  async checkLocationPermission() {
    await this.androidPermissions.requestPermissions([this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION, this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION]).finally(() => this.refreshStatus());

  }

  async checkSMSPermission() {
    await this.androidPermissions.requestPermissions([this.androidPermissions.PERMISSION.SEND_SMS]).finally(() => this.refreshStatus());
  }

  //#endregion  

  //#region EXTRAS
  async showStatusMessage() {
    //await this.appComponent.presentAlert('Atención', 'Errores', 'La aplicación tiene los siguientes errores:\n\n' + `${this.status.errors.join('\n')}`);
    if (this.status.errors.length > 0) {
      let _header = 'Alerta';
      let _subHeader = 'Atención';
      let _butonText = (this.status.prepared) ? 'Ok' : 'Ir a activar';
      if (!this.status.activation.active) {
        await this.appComponent.presentAlertConfirm(_header, _subHeader, 'Necesita activar la aplicación para enviar alerta', _butonText, () => {
          this.router.navigate(['/pages/activate']);
        })
      } else {
        await this.appComponent.presentAlertConfirm(_header, _subHeader, this.status.errors.join('<br>'), _butonText, () => {})
      }
    }
  }

  loadStatus() {
    this.refreshStatus(null, 0);
  }

  refreshStatus(event?, time = 2) {
    this.appComponent.alertingService.check_app_status().then(_status => {
      this.status = _status;
      setTimeout(() => {
        if (this.status.alerting.active) {
          this.btn_image = '../../../assets/img/ciudadSeguraOK.svg';
          this.status.isPaused = false;
          if (this.backgroundAnimation === null)
            this.startBackgroundAnimation();
        } else {
          this.btn_image = '../../../assets/img/ciudadSegura.svg';
          this.btn_rotated = '';
          if (this.backgroundAnimation !== null) {
            this.backgroundAnimation.stop();
            this.backgroundAnimation = null;
            this.appComponent.presentAlert('Atención', 'Alerta finalizada', 'La alerta finalizó, si es necesario puede envíar otra en cualquier momento.');
          }
        }
      }, time * 1000);
    });
    if (event)
      event.target.complete();
  }

  startBackgroundAnimation() {
    this.backgroundAnimation = this.animationCtrl.create()
      .addElement(this.animationBackground.nativeElement)
      .duration(4000)
      .iterations(Infinity)
      .keyframes([
        { offset: 0, background: 'white' },
        { offset: 0.5, background: 'rgba(255, 0, 0, .5)' },
        { offset: 1, background: 'white' }
      ]);

    this.backgroundAnimation.play();
    this.btn_rotated = '';
  }
  //#endregion
}
