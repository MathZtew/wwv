import { Injectable } from '@angular/core';
import { CategorySpec } from '../ehr/datatype';
import { DataPoint } from '../ehr/datalist';
import { Platform, CategoryProperties } from './platform.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, observable, forkJoin, EMPTY } from 'rxjs';
import { catchError, map, tap, filter, mergeMap, merge } from 'rxjs/operators';
import { GoogleAuthService } from 'ng-gapi';
import GoogleUser = gapi.auth2.GoogleUser;
import { AutofillMonitor } from '@angular/cdk/text-field';
import { cat } from 'shelljs';
import { stringify } from '@angular/compiler/src/util';
import { Categories,
         CommonFields,
         BloodPressure,
         BodyWeight,
         Height,
         HeartRate } from '../ehr/ehr-config';

@Injectable({
  providedIn: 'root',
})
export class GfitService extends Platform {
  public static SESSION_STORAGE_KEY = 'accessToken';
  private available: string[] = [];
  private user: GoogleUser;
  private dataIsFetched: boolean;
  private baseUrl = 'https://www.googleapis.com/fitness/v1/users/me/dataSources/';
  private auth: any;

  // Maps Google Fit's data type names to internal category names
  private readonly categoryDataTypeNames: Map<string, string> = new Map(
    [
      ['com.google.blood_pressure', Categories.BLOOD_PRESSURE],
      ['com.google.weight', Categories.BODY_WEIGHT],
      ['com.google.heart_rate.bpm', Categories.HEART_RATE],
      ['com.google.height', Categories.HEIGHT]
    ]
  );

  constructor(
    private googleAuth: GoogleAuthService,
    private http: HttpClient
  ) {
    super(new Map([
      [ Categories.BLOOD_PRESSURE,
        {
          url: 'raw:com.google.blood_pressure:com.google.android.apps.fitness:user_input',
          dataTypes: new Map<string, any>(
            [
              [CommonFields.TIME,
               src => new Date(src.startTimeNanos * Math.pow(10, -6))],
              [BloodPressure.SYSTOLIC, src => src.value[0].fpVal],
              [BloodPressure.DIASTOLIC, src => src.value[1].fpVal],
            ]
          ),
        },
      ],
      [ Categories.BODY_WEIGHT,
        {
          url: 'raw:com.google.weight:com.google.android.apps.fitness:user_input',
          dataTypes: new Map<string, any>(
            [
              [CommonFields.TIME,
               src => new Date(src.startTimeNanos * Math.pow(10, -6))],
              [BodyWeight.WEIGHT, src => src.value[0].fpVal]
            ]
          ),
        },
      ],

      [ Categories.HEART_RATE,
        {
          url: 'raw:com.google.heart_rate.bpm:com.google.android.apps.fitness:user_input',
          dataTypes: new Map<string, any>(
            [
             [CommonFields.TIME,
              src => new Date(src.startTimeNanos * Math.pow(10, -6))],
            ]
          )
        },
      ],

      [ Categories.HEIGHT,
        {
          url: 'raw:com.google.height:com.google.android.apps.fitness:user_input',
          dataTypes: new Map<string, any>(
            [
              [CommonFields.TIME,
                src => new Date(src.startTimeNanos * Math.pow(10, -6))],
              [Height.HEIGHT, src => src.value[0].fpVal]
            ]
          ),
        },
      ]
    ]));

    this.dataIsFetched = false;
    this.googleAuth.getAuth().subscribe(auth => this.auth = auth);
  }

  public getToken(): string {
    const token: string = sessionStorage
      .getItem(GfitService.SESSION_STORAGE_KEY);
    if (!token) {
      throw new Error('no token set, authentication required');
    }
    return sessionStorage.getItem(GfitService.SESSION_STORAGE_KEY);
  }

  public async signIn() {
    if (!sessionStorage.getItem(GfitService.SESSION_STORAGE_KEY)
      || (this.user == null)) {
      const res = await this.auth.signIn();
      this.signInSuccessHandler(res);
    }
  }

  private signInSuccessHandler(res: GoogleUser) {
    this.user = res;
    sessionStorage.setItem(
      GfitService.SESSION_STORAGE_KEY, res.getAuthResponse().access_token
    );
    console.log('access token updated');
  }

  public signOut(): void {
    this.googleAuth.getAuth()
      .subscribe(auth => {
        auth.disconnect();
      });
  }

  /**
   * This function GETs the activity metadata for the user and parses this data
   * to add categories that are available to the user.
   * @returns an observable containing an array with the available categories.
   */
  public getAvailable(): Observable<string[]> {
    if (!this.dataIsFetched) {
      this.dataIsFetched = true;
      return this.http.get(
        this.baseUrl + '?access_token=' + this.getToken()).pipe(map(res => {
          const activities: any = res;
          activities.dataSource.forEach(source => {
            if (source.dataStreamId.split(':')[0] === 'raw') {
              const categoryId: string = this.categoryDataTypeNames
                .get(source.dataType.name);
              if (this.isImplemented(categoryId)) {
                this.available.push(categoryId);
              }
            }
          });
          return this.available;
        }));
    } else {
      return of(this.available);
    }
  }

  /**
   * This function GETs the data for a specified category and time interval.
   * The data is then converted to an internal format, and returned within an
   * observable.
   * @param categoryId category for which data is to be fetched
   * @param start start of time interval for which data is to be fetched
   * @param end end of time interval for which data is to fetched
   * @returns an observable containing data that has been converted to
   * our internal format
   */
  public getData(categoryId: string,
                 start: Date, end: Date): Observable<DataPoint[]> {

    const startTime = String(start.getTime() * Math.pow(10, 6));
    const endTime = String(end.getTime() * Math.pow(10, 6));
    const dataSetId = startTime + '-' + endTime;
    console.log(dataSetId);
    let url: string = this.baseUrl;
    const tail: string = '/datasets/' +
                          dataSetId +
                          '?access_token=' +
                          this.getToken();

    if (!this.isImplemented(categoryId)) {
      throw TypeError(categoryId + ' is unimplemented');
    } else {
      const categoryUrl: string = this.implementedCategories.get(categoryId).url;
      url += categoryUrl + tail;
      return this.http.get(url).pipe(map(
        res => this.convertData(res, categoryId)));
    }
  }

  /**
   * This function converts data from the default JSON-format which is returned
   * by Google, to our internal representation (which varies depending on
   * category)
   * @param res result from http.get-request (json file)
   * @param categoryId specifies which category the data belongs to
   *  @returns an array containing the converted DataPoint(s)
   */
  protected convertData(res: any, categoryId: string): DataPoint[] {
    const points: DataPoint[] = [];
    const dataTypeConversions: Map<string, (src: any) => any> =
      this.implementedCategories.get(categoryId).dataTypes;


    res.point.forEach(src => {
      const convertedData: DataPoint = new DataPoint();
      for (const [type, conversionFunc] of dataTypeConversions) {
        convertedData.set(type, conversionFunc(src));
      }
      points.push(convertedData);
    });
    return points;
  }
}
