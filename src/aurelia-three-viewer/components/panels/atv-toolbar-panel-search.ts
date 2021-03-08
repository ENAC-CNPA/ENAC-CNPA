import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../../global';
import { AtvFilter } from '../../interfaces';

@customElement('atv-toolbar-panel-search')
@inject(Element, AtvGlobal)
export class AtvToolbarPanelSearch {

  @bindable({defaultBindingMode: bindingMode.twoWay}) q: boolean = false;
  @bindable({defaultBindingMode: bindingMode.twoWay}) filters: AtvFilter[] = [];

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }

  public addFilter() {
    this.filters.push({
      key: '',
      operator: '=',
      value: ''
    });
    this.applyFilters();
  }

  public removeFilter(index: number) {
    this.filters.splice(index, 1);
    this.applyFilters();
  }

  public clearFilters() {
    while (this.filters.length) {
      this.filters.pop();
    }
    this.applyFilters();
  }

  private applyFilters() {
    this.atv.siteService.requestApplyFilters();
  }
  
}
