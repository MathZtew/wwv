import {Component, Input, OnInit} from '@angular/core';
import {DataPoint, DataTypeCodedText, DataTypeCodedTextOpt, DataTypeEnum} from '../shared/spec';
import {Conveyor} from '../conveyor.service';

@Component({
  selector: 'app-health-list-items',
  templateUrl: './health-list-items.component.html',
  styleUrls: ['./health-list-items.component.scss']
})
export class HealthListItemsComponent implements OnInit {

  @Input() selectedCategory: string;

  displayedColumns: string[] = [];
  dataTypeEnum = DataTypeEnum;
  a: number = 1;

  categories: string[] = [];

  /**
   * Gets a string representation of the date correctly formatted to be read by a human.
   * @param date the date to format
   * @returns a formatted string representing a date
   */
  static getDate(date: Date): string {
    return date.toLocaleDateString('sv-SE');
  }

  /**
   * Gets a string representation of the time correctly formatted to be read by a human.
   * @param date the date to get the time from to format
   * @returns a formatted string representing a time
   */
  static getTime(date: Date): string {
    return date.toLocaleTimeString('sv-SE');
  }

  constructor(private conveyor: Conveyor) {

    for (const platform of conveyor.getPlatforms()) {
      for (const category of conveyor.getCategories(platform)) {
        this.categories.push(category);
        conveyor.fetchData(platform, category, new Date(), new Date()); // TODO: remove this later
      }
    }
    console.log(this.categories[0]);
  }

  ngOnInit() {
  }

  getData(category: string): DataPoint[] {
    return this.conveyor.getDataList(category).getPoints();
  }

  /**
   * Gets the label of the id specified.
   * @param category the category in which the id is in
   * @param labelId the id to fetch the label to
   * @returns a label for the specified id
   */
  getLabel(category: string, labelId: string): string {
    if (labelId === 'date') {
      return 'Datum';
    }
    return this.conveyor.getDataList(category).getDataType(labelId).label;
  }

  /**
   * Returns the columns which should be displayed in the table depending on which
   * category it is.
   * @param category the category to be displayed
   * @returns a list of labels for the specified category
   */
  getDisplayedColumns(category: string): string[] {
    const result: string[] = [];
    if (this.getData(category)) {
      for (const column of Array.from(this.conveyor.getDataList(category).spec.dataTypes.keys())) {
        if (column === 'time') {
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
   * Gets the type to display in the table.
   * @param category the category to fetch types from
   * @param key the id to get the label from
   * @returns the type to display in the table
   */
  getVisualType(category: string, key: string): DataTypeEnum {
    if (key === 'date') {
      return DataTypeEnum.DATE_TIME;
    }
    return this.conveyor.getDataList(category).spec.dataTypes.get(key).type;
  }

  /**
   * Gets the options to choose from according to a DataType.
   * @param category the category to fetch options from
   * @param key the id to to fetch the options from
   * @returns a list of options
   */
  getOptions(category: string, key: string): DataTypeCodedTextOpt[] {
    const datatypes: DataTypeCodedText = this.conveyor.getDataList(category).getDataType(key) as DataTypeCodedText;
    return datatypes.options;
  }

  /**
   * Gets the data to be displayed from the point
   * @param point the datapoint to get the data from
   * @param key the data category to get
   * @returns a string of the value to show
   */
  getPointData(point: DataPoint, key: string): string {
    if (key === 'date') {
      return HealthListItemsComponent.getDate(point.get('time'));
    }
    if (key === 'time') {
      return HealthListItemsComponent.getTime(point.get('time'));
    }
    return point.get(key);
  }

  /**
   * Sets the data category in the dataPoint to the set option
   * @param key the data category to set
   * @param point the point to set data in
   * @param option the option to set
   */
  setOption(key: string, point: DataPoint, option: string) {
    point.set(key, option);
    this.a = this.a + 1;
    console.log(Array.from(point.keys()));
  }

  /**
   * Set all unset data types in a category
   * @param key the data category to be set
   * @param option the option to set
   * @param category the category the points are in
   */
  setAllOptions(key: string, option: string, category: string) {
    let allData = true;
    for (const point of this.getData(category)) {
      if (!point.has(key)) {
        this.setOption(key, point, option);
        allData = false;
      }
    }
    if (allData) {
      for (const point of this.getData(category)) {
        this.setOption(key, point, option);
      }
    }
  }

}
