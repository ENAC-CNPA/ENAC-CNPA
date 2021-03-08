import { inject, customElement } from 'aurelia-framework';
import { AtvGlobal } from '../../global';
import { UxIconMap } from '@aurelia-ux/icons';
import { Cube } from 'aurelia-resources';

@customElement('atv-tool-measure')
@inject(Element, AtvGlobal, UxIconMap)
export class AtvToolMeasure {

  public constructor(private element: HTMLElement, public atv: AtvGlobal, private iconMap: UxIconMap) {
    this.iconMap.registerIcon(Cube);
  }
  
}
