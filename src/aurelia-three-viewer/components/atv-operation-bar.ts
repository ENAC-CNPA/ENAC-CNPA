import { inject, computedFrom, customElement } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@customElement('atv-operation-bar')
@inject(Element, AtvGlobal)
export class AtvOperationBar {

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }

  @computedFrom('atv.siteService.operation')
  public get visible(): boolean {
    return !!this.atv.siteService.operation;
  }
}
