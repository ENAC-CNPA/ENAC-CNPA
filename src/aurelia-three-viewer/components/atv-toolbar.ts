import { inject, bindable, customElement } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@customElement('atv-toolbar')
@inject(Element,  AtvGlobal)
export class AtvToolbar {

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }
}
