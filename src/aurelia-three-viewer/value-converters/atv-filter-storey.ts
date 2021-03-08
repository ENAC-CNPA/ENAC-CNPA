import { ThreeStorey, ThreeSpace } from 'aurelia-three';
import { valueConverter } from 'aurelia-framework';

@valueConverter('atvFilterStorey')
export class FilterStoreyValueConverter {
  public toView(spaces: Array<ThreeSpace>, storey: ThreeStorey): Array<ThreeSpace> {
    return spaces.filter(s => s.storeyIds.includes(storey.id));
  }
}