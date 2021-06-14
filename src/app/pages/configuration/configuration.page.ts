import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Storage } from '@ionic/storage';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
})
export class ConfigurationPage implements OnInit {
  isKeyboardHide: boolean;
  logger: any = {
    status: true,
    logs: []
  }

  constructor(
    public router: Router,
    private storage: Storage,
    public appComponent: AppComponent,
    private keyboard: Keyboard
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
    this.refreshStatus();
  }

  isLogChange() {
    this.storage.set('isLogEnabled', this.logger.status).then(_val => {
      if (_val) {
        this.refreshStatus();
      } else
        console.log('Log desactivado');
    });
  }

  limpiarLog() {
    this.storage.set('logger', null).then(() => {
      this.logger.logs = [];
    });
  }

  refreshStatus(event?) {
    this.appComponent.presentLoading();
    setTimeout(() => {
      this.storage.get('logger').then(_log => {
        if (_log)
          this.logger.logs = _log.split('\n').reverse();
      });  
      if (event)
        event.target.complete();
      this.appComponent.dismissLoading();
    }, 2000);
  }
}
