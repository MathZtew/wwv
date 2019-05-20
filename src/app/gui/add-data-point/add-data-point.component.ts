import {Component, Inject, OnInit} from '@angular/core';
import {ErrorStateMatcher, MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {Conveyor} from '../../conveyor.service';
import { CategorySpec,
         DataTypeCodedText,
         DataTypeCodedTextOpt,
         DataTypeEnum,
         DataTypeQuantity} from '../../ehr/datatype';
import { DataPoint } from '../../ehr/datalist';
import { AmazingTimePickerService } from 'amazing-time-picker';
import {FormControl, FormGroupDirective, NgForm, Validators} from '@angular/forms';

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid);
  }
}

@Component({
  selector: 'app-add-data-point',
  templateUrl: './add-data-point.component.html',
  styleUrls: ['./add-data-point.component.scss']
})
export class AddDataPointComponent implements OnInit {

  selectedCategory: string;
  dataTypeEnum = DataTypeEnum;
  pointData: Map<string, any>;
  pointFormControl: Map<string, FormControl>;
  clockTime: string;
  categorySpec: CategorySpec;
  requiredFields: string[];

  matcher = new MyErrorStateMatcher();

  constructor(
    public dialogRef: MatDialogRef<AddDataPointComponent>,
    @Inject(MAT_DIALOG_DATA) public data: string,
    private conveyor: Conveyor,
    private atp: AmazingTimePickerService) {

    this.selectedCategory = data;
    this.pointData = new Map<string, any>();
    this.pointFormControl = new Map<string, FormControl>();
    const now: Date = new Date();
    this.clockTime = '';
  }

  ngOnInit() {
    if (this.selectedCategory) {
      this.categorySpec = this.conveyor.getCategorySpec(this.selectedCategory);
      if (this.categorySpec) {
        this.requiredFields = [];

        // Add all required fields from the categorySpec.
        for (const dataType of Array.from(this.categorySpec.dataTypes.keys())) {
          if (this.categorySpec.dataTypes.get(dataType).required) {
            this.requiredFields.push(dataType);
          }
        }
      }
    }
  }

  /**
   * The method to be fired when the dialog isn't clicked on but something else is clicked.
   */
  onNoClick(): void {
    this.dialogRef.close();
  }

  /**
   * Returns the columns which should be displayed in the table depending on which
   * category it is.
   * @returns a list of labels for the specified category
   */
  getDisplayedColumns(): string[] {
    const result: string[] = [];
    if (this.conveyor.getCategoryIds().includes(this.selectedCategory)) {
      for (const column of Array.from(this.categorySpec.dataTypes.keys())) {
        if (!this.categorySpec.dataTypes.get(column).visible) {
          continue;
        } else if (column === 'time') {
          result.push('date');
          result.push('time');
        } else {
          result.push(column);
        }
      }
    }
    return result;
  }

  /**
   * Gets the string from pointData with the given key, if no such key exist create a new Date.
   * @param key the key identifier to get from.
   */
  getDate(key): string {
    if (key === 'date') { // Special case for 'time', divided into 'time' and 'date'
      if (!this.pointData.has('time')) {
        this.pointData.set('time', new Date());
      }
      const now = this.pointData.get('time') as Date;
      this.clockTime = now.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'});
      return this.pointData.get('time');
    }
    if (!this.pointData.has(key)) {
      this.pointData.set(key, new Date());
    }
    return this.pointData.get(key);
  }

  /**
   * Gets the form control for the specified key, if no such key exist create one.
   * @param key the key identifier to get from.
   */
  getFormControl(key: string): FormControl {
    if (!this.pointFormControl.has(key)) {
      if (key === 'date') { // Special case for separation of date and time.
        this.pointFormControl.set(key, new FormControl('', [Validators.required]));
      } else {
        if (this.categorySpec.dataTypes.get(key).required) {
          // if the value is required! Wait from EHR implementation
          this.pointFormControl.set(key, new FormControl('', [Validators.required]));
        } else {
          this.pointFormControl.set(key, new FormControl(''));
        }
      }
    }
    return this.pointFormControl.get(key);
  }

  /**
   * Gets the label of the id specified.
   * @param labelId the id to fetch the label to
   * @returns a label for the specified id
   */
  getLabel(labelId: string): string {
    if (labelId === 'date') {
      return 'Datum';
    }
    if (this.conveyor.getDataList(this.selectedCategory)) {
      return this.conveyor.getDataList(this.selectedCategory).getDataType(labelId).label;
    }
    return '';
  }

  /**
   * Gets the type to display in the table.
   * @param key the id to get the label from
   * @returns the type to display in the table
   */
  getVisualType(key: string): DataTypeEnum {
    if (key === 'date') {
      return DataTypeEnum.DATE_TIME;
    }
    if (this.conveyor.getDataList(this.selectedCategory)) {
      return this.categorySpec.dataTypes.get(key).type;
    }
  }

  /**
   * Gets the options to choose from according to a DataType.
   * @param key the id to to fetch the options from
   * @returns a list of options
   */
  getOptions(key: string): DataTypeCodedTextOpt[] {
    if (this.conveyor.getDataList(this.selectedCategory)) {
      const datatypes: DataTypeCodedText = this.conveyor.getDataList(this.selectedCategory).getDataType(key) as DataTypeCodedText;
      return datatypes.options;
    }
    return [];
  }

  /**
   * Gets the minimum of a range of a DataTypeQuantity.
   * @param key the key of the datatype to be fetched.
   * @returns The minimum number accepted of the DataTypeQuantity.
   */
  getMinOfRange(key: string): number {
    if (this.conveyor.getDataList(this.selectedCategory)) {
      const datatype: DataTypeQuantity = this.conveyor.getDataList(this.selectedCategory).getDataType(key) as DataTypeQuantity;
      return datatype.magnitudeMin;
    }
  }

  /**
   * Gets the maximum of a range of a DataTypeQuantity.
   * @param key the key of the datatype to be fetched.
   * @returns The maximum number accepted of the DataTypeQuantity.
   */
  getMaxOfRange(key: string): number {
    const datatype: DataTypeQuantity = this.conveyor.getDataList(this.selectedCategory).getDataType(key) as DataTypeQuantity;
    return datatype.magnitudeMax;
  }

  /**
   * Creates a DataPoint and adds it to the DataList with all the components of this DialogComponent, if the values are not accepted as
   * an input the value will not save and the dialog will not close.
   */
  createDataPoint() {
    console.log(this.pointData);

    // Are all required fields filled?
    for (const field of this.requiredFields) {
      if (!this.pointData.has(field)) {
        return;
      }
    }

    // Are all fields valid?
    for (const [typeId, value] of this.pointData.entries()) {
      if (!this.categorySpec.dataTypes.get(typeId).isValid(value)) {
        return;
      }
    }

    // Fill the field in a new point and add it.
    const dataPoint: DataPoint = new DataPoint();
    for (const data of Array.from(this.pointData.keys())) {
      dataPoint.set(data, this.pointData.get(data));
    }
    this.conveyor.getDataList(this.selectedCategory).addPoint(dataPoint);
    this.dialogRef.close();
  }

  /**
   * Sets the time of the DataType. This is the only exception to the DataType, as the key 'time' will be split into two, a 'date' and a
   * 'time'. The 'date' will be saved separately and the 'time' will be added into the 'date'. When saved into the DataType, the Date object
   * in 'date' will be saved in 'time'.
   * @param time the time to set.
   */
  setTime(time: string) {
    console.log(time);
    this.clockTime = time;
    const date: Date = this.pointData.get('time') as Date;
    const strs = time.split(':');
    date.setHours(+strs[0]);
    date.setMinutes(+strs[1]);
    this.pointData.set('time', date);
  }

  /**
   * Open the time picker to choose a time.
   */
  openTimePicker() {
    const amazingTimePicker = this.atp.open();
    amazingTimePicker.afterClose().subscribe(time => {
      this.setTime(time);
    });
  }

  /**
   * Gets the label of the category.
   * @returns A human readable string of the label of the category.
   */
  getCategoryLabel() {
    if (this.conveyor.getCategoryIds().includes(this.selectedCategory)) {
      return this.conveyor.getCategorySpec(this.selectedCategory).label;
    } else {
      return '';
    }
  }
}
