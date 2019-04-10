import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import {
  MatSelectModule,
  MatFormFieldModule,
  MatCardModule,
  MatSidenavModule,
  MatListModule,
  MatTableModule,
  MatDialogModule,
  MatTooltipModule,
  MatPaginatorModule } from '@angular/material';

import { HealthListItemsComponent } from './health-list-items.component';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { CustomGoogleApiModule,  GoogleApiService, GoogleAuthService, } from '../../google-fit-config';

describe('HealthListItemsComponent', () => {
  let component: HealthListItemsComponent;
  let fixture: ComponentFixture<HealthListItemsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HealthListItemsComponent ],
      imports: [
        RouterTestingModule,
        BrowserAnimationsModule,
        MatSelectModule,
        MatTableModule,
        MatFormFieldModule,
        RouterTestingModule,
        MatCardModule,
        MatSidenavModule,
        MatListModule,
        MatDialogModule,
        MatTooltipModule,
        MatPaginatorModule,
        CustomGoogleApiModule
      ],

     providers: [
      GoogleAuthService,
      GoogleApiService,
      HttpClient,
      HttpHandler
    ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HealthListItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
