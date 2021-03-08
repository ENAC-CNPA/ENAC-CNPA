import { bindable, inject } from 'aurelia-framework';
import {AtvGlobal } from '../../global';
import * as THREE from 'three';

@inject(AtvGlobal)
export class AtvToolbarPanelCheckerOutput {

  @bindable public output: {[key: string]: any, ref: undefined | {ifcId: string} | {ifcId: string}[]};
  public nbRef = 0;

  public constructor(private atv: AtvGlobal) {

  }

  public bind() {
    if (Array.isArray(this.output.ref)) {
      this.nbRef = this.output.ref.length;
    } else if (this.output.ref) {
      this.nbRef = 1;
    } else {
      this.nbRef = 0;
    }
  }

  public highlightRef() {
    const objectsToSelect: THREE.Object3D[] = [];
    let ifcIds: string[] = [];
    if (Array.isArray(this.output.ref)) {
      ifcIds = this.output.ref.map(r => r.ifcId);
    } else if (this.output.ref.ifcId) {
      ifcIds = [this.output.ref.ifcId];
    }
    if (ifcIds.length === 0) {
      return;
    }
    this.atv.three.getScene().traverse((object) => {
      if (object.userData.ifcId && ifcIds.includes(object.userData.ifcId)) {
        objectsToSelect.push(object);
      }
    });
    this.atv.select.none();
    this.atv.select.addObjectsToSelection(objectsToSelect);
  }

}
