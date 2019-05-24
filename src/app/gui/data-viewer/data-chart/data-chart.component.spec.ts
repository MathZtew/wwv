import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { DataViewerModule } from '../data-viewer.module';
import { DataChartComponent } from './data-chart.component';

describe('ChartComponent', () => {
  let component: DataChartComponent;
  let fixture: ComponentFixture<DataChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DataChartComponent ],
      imports: [ DataViewerModule ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
