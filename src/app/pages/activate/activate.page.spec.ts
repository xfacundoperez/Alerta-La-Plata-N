import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActivatePage } from './activate.page';

describe('ActivatePage', () => {
  let component: ActivatePage;
  let fixture: ComponentFixture<ActivatePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ActivatePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
