import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@customElement('atv-information-panel')
@inject(Element, AtvGlobal)
export class AtvInformationPanel {

  public explorerOpened: boolean = false;

  public constructor(private element: HTMLElement, private atv: AtvGlobal) {

  }

  public propertiesExplorerCallback: (object: THREE.Object3D) => Array<string> = (object) => {
    const props: Array<string> = [];
    const userDataKeys = Object.keys(object.userData).filter((key) => {
      return key !== 'pset' && key !== 'id' && key !== 'siteId' && key !== 'parentId' && key !== 'childrenIds' && key !== 'importId';
    });
    props.push(...userDataKeys.map(userDataKey => `userData["${userDataKey}"]`));
    props.push('userData.pset.*');
    return props;
  }

  public filterOutObject(object: THREE.Object3D): void {
    if (object.userData.ifcId) {
      this.atv.siteService.filters.push({key: 'userData.ifcId', operator: '!=', value: object.userData.ifcId});
    } else {
      if (object.uuid) {
        this.atv.siteService.filters.push({key: 'uuid', operator: '!=', value: object.uuid});
      }
    }
    this.atv.siteService.requestApplyFilters();
  }
}
