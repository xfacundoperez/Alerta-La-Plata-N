import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppComponent } from 'src/app/app.component';
import { CallNumber } from '@ionic-native/call-number/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';

@Component({
  selector: 'app-emergency',
  templateUrl: './emergency.page.html',
  styleUrls: ['./emergency.page.scss'],
})
export class EmergencyPage implements OnInit {
  //#region Variables
  isKeyboardHide: boolean;
  pageCallNumbers = []
  //#endregion

  constructor(
    public router: Router,
    public appComponent: AppComponent,
    private callNumber: CallNumber,
    private keyboard: Keyboard
  ) { }

  ngOnInit() {
    this.pageCallNumbers = this.appComponent.pageCallNumbers;
  }
  
  ionViewWillEnter() {
    this.keyboard.onKeyboardWillShow().subscribe(() => {
      this.isKeyboardHide = false;
    })
    this.keyboard.onKeyboardWillHide().subscribe(() => {
      this.isKeyboardHide = true;
    })
    this.isKeyboardHide = true;
  }

  makeCall(_number: number) {
    this.callNumber.callNumber(_number.toString(), true)
      .then(res => console.log('Launched dialer!'))
      .catch(err => console.log({ 'Error launching dialer': err }));
  }

}
