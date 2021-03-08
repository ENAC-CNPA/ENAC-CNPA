import { inject } from 'aurelia-framework';
import { AtvGlobal } from '../aurelia-three-viewer/global';
import { AtvFilter } from './../aurelia-three-viewer/interfaces';
import { activationStrategy } from 'aurelia-router';
import { errorify } from 'aurelia-resources';

@inject(AtvGlobal)
export class Viewer2 {

  public siteId: string;
  // public filters: AtvFilter[] = [];

  public constructor(private atv: AtvGlobal) {

  }

  public async determineActivationStrategy(params): Promise<string | void> {
    if (this.siteId && params.siteId !== this.siteId) {
      if (this.atv.siteService) {
        this.siteId = params.siteId;
        this.atv.siteService.unloadCurrentSite();
        //await new Promise(resolve => setTimeout(resolve, 100));
        this.atv.siteService.loadSite(this.siteId);
      }
      // return activationStrategy.replace;
    }
    if (params.refresh) return activationStrategy.replace;
  }

  public themeAtLoading: string = '';
  public activate(params: any) {
    if (params && params.siteId) {
      this.siteId = params.siteId;
    }
    if (params && params.theme) {
      this.themeAtLoading = params.theme;
      this.atv.router.navigateToRoute('viewer2', {siteId: this.siteId});
    }
  }

  public async attached() {
    this.atv.registerViewer();
    try {
      await this.atv.siteService.isReady();
      this.atv.siteService.loadSite(this.siteId, this.themeAtLoading);
      this.themeAtLoading = '';
    } catch (error) {
      errorify(error);
      this.atv.router.navigateToRoute('viewer2');
    }
  }


}
