import { Component, OnInit } from '@angular/core';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Router } from '@angular/router';
import { AppComponent } from 'src/app/app.component';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'app-activate',
  templateUrl: './activate.page.html',
  styleUrls: ['./activate.page.scss'],
})
export class ActivatePage implements OnInit {
  public input_tel: string;
  public input_key: string;
  public isKeyboardHide: boolean;
  public status = {
    activated: null,
    submited: false
  }
  private status_interval = null;

  constructor(
    public router: Router,
    public appComponent: AppComponent,
    private keyboard: Keyboard,
    private storage: Storage
  ) { }

  ngOnInit() {
    this.storage.get('tel').then(_val => this.input_tel = (_val) ? _val : null);
  }

  ionViewWillEnter() {
    if (this.status.activated === null)
      this.appComponent.presentLoading();
    this.keyboard.onKeyboardWillShow().subscribe(() => {
      this.isKeyboardHide = false;
    })
    this.keyboard.onKeyboardWillHide().subscribe(() => {
      this.isKeyboardHide = true;
    })
    this.isKeyboardHide = true;
  }

  ionViewDidEnter() {
    //this.appComponent.alertingService.check_app_status().then(() => {
      this.refreshStatus();
    //})
    this.status_interval = setInterval(() => {
      this.status.activated = this.appComponent.alertingService.status.activation.active;
      console.log('activation active: ' + this.appComponent.alertingService.status.activation.active);
    }, 10000);
  }

  ionViewWillLeave() {
    clearInterval(this.status_interval);
    this.status_interval = null;
  }

  button_activate() {
    if (!this.input_tel || !this.input_key)
      return this.appComponent.presentAlert('Error', 'Activación', 'Debe ingresar Telefono y Clave')
    this.status.submited = true;
    this.appComponent.presentLoading();
    this.appComponent.alertingService.api_activate_app(this.input_tel, this.input_key).then(
      success => {
        this.appComponent.dismissLoading();
        if (success) {
          this.appComponent.presentAlert('Correcto', 'Activación', 'Activado con exito!').finally(() => {
            this.router.navigate(['../pages/home'], {
              replaceUrl: true
            });  
          })
          this.appComponent.selectedIndex = 0;
        } else {
          return this.appComponent.presentAlert('Error', 'Activación', 'Los datos ingresados no son corerctos')
        }
      }
    );
  }

  refreshStatus(event?) {
    this.status.activated = null;
    setTimeout(() => {
      this.status.activated = this.appComponent.alertingService.status.activation.active;
      if (event)
        event.target.complete();
      this.appComponent.dismissLoading();
    }, 1000);
  }
}
