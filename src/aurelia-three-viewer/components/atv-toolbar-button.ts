import { AtvToolbarPanel } from './atv-toolbar-panel';
import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@customElement('atv-toolbar-button')
@inject(Element, AtvGlobal)
export class AtvToolbarButton {

  @bindable icon: string = '';
  @bindable panel: AtvToolbarPanel;
  @bindable({defaultBindingMode: bindingMode.twoWay}) active: boolean = false;
  @bindable({defaultBindingMode: bindingMode.twoWay}) opened: boolean = false;

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }

  public togglePanel() {
    if (!this.panel) {
      return true; // forward
    }
    const rightInstance = this.panel instanceof AtvToolbarPanel;
    if (!rightInstance) {
      console.warn('Atv Button linked to an invalid panel', this.panel);
      return false; // something is wrong
    }
    this.panel.opened = !this.panel.opened;
  }
}
