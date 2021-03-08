import { SwissdataGlobal } from 'aurelia-swissdata';
import { ThreeCustomElement, ThreeToolsService, ThreeSelectionTool, ThreeSliceTool, ThreeMeasureTool } from 'aurelia-three';
import { inject, Container } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { SiteService } from './services/site';
import { Router } from 'aurelia-router';

@inject( Router, EventAggregator, SiteService, Container )
export class AtvGlobal {

  public three: ThreeCustomElement;
  public toolsService: ThreeToolsService;
  public select: ThreeSelectionTool;
  public slice: ThreeSliceTool;
  public measure: ThreeMeasureTool;

  public selectedObject: THREE.Object3D | null = null;
  private subscriptions: Subscription[] = [];

  public global: SwissdataGlobal;

  public constructor(public router: Router, public eventAggregator: EventAggregator, public siteService: SiteService, private container: Container) {

  }

  public registerViewer(): boolean {
    const global = this.container.get('sd-global');
    if (global instanceof SwissdataGlobal) {
      this.global = global;
    } else {
      throw new Error('Failed to get SwissdataGlobal from container');
    }
    const threeElement = document.querySelector('three');
    if (!threeElement) {
      return false;
    }
    const anyThreeElement: any = threeElement;
    const viewModel = anyThreeElement.au?.controller?.viewModel;
    if (viewModel && viewModel instanceof ThreeCustomElement) {
      this.three = viewModel;
      this.registerTools();
      return true;
    }
    return false;
  }

  private registerTools(): void {
    this.toolsService = new ThreeToolsService(this.three);
    this.select = new ThreeSelectionTool(this.toolsService);
    this.slice = new ThreeSliceTool(this.toolsService);
    this.measure = new ThreeMeasureTool(this.toolsService);
    setTimeout(() => {
      this.measure.setType('horizontal');
    }, 100);
    setTimeout(() => {
      this.select.filterObjects = (type: 'hover' | 'click', intersections: THREE.Intersection[]) => {
        let relevantObject: THREE.Object3D;
        for (let i of intersections) {
          const o = i.object;
          if (!o.userData.name) {
            continue;
          }
          if (o.userData.__isOverlay) {
            continue;
          }
          if (o.type === 'Scene' || o.type === 'Group') {
            continue;
          }
          relevantObject = o;
          if (relevantObject && (o.children.length === 0 || o.type === 'Mesh')) {
            this.select.rootObject = relevantObject.parent;
            return [i];
          }
        }
        return [];
      };
      this.subscriptions.push(this.subscribe('three-selection:changed', (data) => {
        if (!data.objects || data.objects.length === 0) {
          this.selectedObject = null;
          return;
        }
        // add to BCF viewpoint if necessary
        for (let object of data.objects) {
          if (object.userData.ifcId) {
            // TODO: fix when working on BCF IFC
            // this.addIfcToViewpoint(object.userData.ifcId);
          }
        }
        if (!this.selectedObject) {
          this.selectedObject = data.objects[0];
        } else if (this.selectedObject) {
          for (let obj of data.objects || []) {
            if (this.selectedObject === obj) {
              return;
            }
          }
          this.selectedObject = data.objects[0];
        }
      }));
      this.select.setType('select');
    }, 200);
  }

  public toggleMeasuringTool() {
    this.publish('atv-panel-opened', 'tool-measure');
    this.measure.toggleMeasureTool(this.select);
  }

  public toggleSlicingTool() {
    this.publish('atv-panel-opened', 'tool-slice');
    if (this.toolsService.currentToolName === 'slice') {
      this.deactiveSlicingTool();
    } else {
      this.activeSlicingTool();
    }
  }

  public activeSlicingTool() {
    this.deactiveSlicingTool();
    if (this.toolsService.currentToolName !== 'slice') {
      this.slice.toggleSliceTool();
      if (!this.slice.isSlicing) {
        this.slice.toggleSlicing(true);
        this.slice.setPlane('Y');
      }
    }
  }

  public deactiveSlicingTool() {
    if (this.toolsService.currentToolName === 'slice') {
      this.select.setType('select');
    }
  }

  public dispose() {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.siteService.dispose();
    this.subscriptions = [];
  }

  public publish(event: any, data?: any) {
    return this.eventAggregator.publish(event, data);
  }

  public subscribe(event: string | Function, callback: Function) {
    return this.eventAggregator.subscribe(event, callback);
  }

  public subscribeOnce(event: string | Function, callback: Function) {
    return this.eventAggregator.subscribeOnce(event, callback);
  }

}

// TODO: BCF
// TODO: port the setBcfProjectAndCreateOneIfNone function
