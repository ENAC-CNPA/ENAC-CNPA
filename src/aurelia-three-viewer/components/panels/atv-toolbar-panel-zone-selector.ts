import { ThreeThemeModel } from 'aurelia-three';
import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../../global';

@customElement('atv-toolbar-panel-zone-selector')
@inject(Element, AtvGlobal)
export class AtvToolbarPanelZoneSelector {

  public constructor(private element: HTMLElement, public atv: AtvGlobal) {

  }
  
}
