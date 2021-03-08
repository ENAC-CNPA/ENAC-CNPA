import { ThreeThemeModel } from 'aurelia-three';
import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../../global';

@customElement('atv-tool-slice')
@inject(Element, AtvGlobal)
export class AtvToolSlice {

  public constructor(private element: HTMLElement, public atv: AtvGlobal) {

  }

  public clearSlicing() {
    if (this.atv.toolsService.currentToolName === 'slice') {
      this.atv.slice.toggleSliceTool();
    }
    this.atv.slice.toggleSlicing(false);
    this.atv.select.setType('select');
  }
  
}
