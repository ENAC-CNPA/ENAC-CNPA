import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@customElement('atv-toolbar-panel')
@inject(Element, AtvGlobal)
export class AtvToolbarPanel {

  @bindable({defaultBindingMode: bindingMode.twoWay}) active: boolean = false;
  @bindable({defaultBindingMode: bindingMode.twoWay}) opened: boolean = false;

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }

  public openedChanged() {
    if (this.opened) {
      this.atv.publish('atv-panel-opened', this);
      this.listenForClose();
    }
  }

  private listenForClose() {
    this.atv.subscribeOnce('atv-panel-opened', (panel: AtvToolbarPanel) => {
      if (panel !== this) {
        this.opened = false;
      } else if (this.opened) {
        this.listenForClose();
      }
    });
  }
}
