import { ThreeStorey, ThreeBuilding } from 'aurelia-three';
import { valueConverter } from 'aurelia-framework';

@valueConverter('atvFilterBuilding')
export class FilterBuildingValueConverter {
  public toView(storeys: Array<ThreeStorey>, building: ThreeBuilding): Array<ThreeStorey> {
    return storeys;
  }
}