import { SiteService } from './../../services/site';
import { inject, bindable, customElement, bindingMode } from 'aurelia-framework';
import { notify, errorify, ConfirmDialog, PromptTextDialog } from 'aurelia-resources';
import { AdminExportSettingsDialog, AdminImportSettingsDialog, ThreeSiteModel } from 'aurelia-three';
import { AtvGlobal } from '../../global';
import { Subscription } from 'aurelia-event-aggregator';
import { UxModalService } from '@aurelia-ux/modal';

@customElement('atv-toolbar-panel-site-selector')
@inject(Element, AtvGlobal, UxModalService)
export class AtvToolbarPanelSiteSelector {

  public adminSite: ThreeSiteModel | null = null;

  private subscriptions: Subscription[] = [];
  public uploadingFile: boolean = false;

  public constructor(private element: HTMLElement, public atv: AtvGlobal, private modalService: UxModalService) {

  }

  public attached() {
    this.subscriptions.push(this.atv.subscribe('swissdata:logout', () => {
      this.backToSites();
    }));
  }

  public detached() {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }

  public async selectSite(siteId: string): Promise<void> {
    this.atv.router.navigateToRoute('viewer2-withsite', {siteId});
    setTimeout(() => {
      this.atv.publish('atv-panel-opened', undefined);
    }, 800);
  }

  public async selectSiteForAdmin(site: ThreeSiteModel, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    if (!this.atv.global.state.swissdata.authenticated) {
      return;
    }
    this.adminSite = site;
  }

  public backToSites() {
    this.adminSite = null;
  }

  public saveSiteName() {
    try {
      this.adminSite.updateProperties('', ['name']);
    } catch (error) {
      errorify(error);
    }
  }

  public exportSettings() {
    this.modalService.open({
      viewModel: AdminExportSettingsDialog,
      model: {siteId: this.adminSite.id}
    });
  }

  public async importSettings() {
    const dialog = await this.modalService.open({
      viewModel: AdminImportSettingsDialog,
      model: {siteId: this.adminSite.id}
    });
    const response = await dialog.whenClosed();
    if (!response.wasCancelled) {
      this.atv.publish('atv-data-imported');
    }
  }

  public uploadDataFromFile() {
    let input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('accept', '.ifc,.json');
    input.click();
    input.addEventListener('change', () => {
      console.dir(input);

      if (input.files && input.files.length === 1) {
        const file = input.files[0];
        if (file.name.substr(-4) === '.ifc') {
          this.uploadingFile = true;
          ThreeSiteModel.addIFCData(this.adminSite.id, file).then(() => {
            notify('Data successfuly uploaded', {timeout: 0});
          }).catch(errorify).finally(() => {
            this.uploadingFile = false;
          });
        } else if (file.name.substr(-5) === '.json') {
          ThreeSiteModel.addJsonData(this.adminSite.id, file).then(() => {
            notify('Data successfuly uploaded', {timeout: 0});
          }).catch(errorify).finally(() => {
            this.uploadingFile = false;
          });
        }
      }
    });
  }

  public async clearSiteData(): Promise<any> {
    if (this.uploadingFile) return Promise.resolve();
    try {
      const title = this.atv.global.i18n.tr('three.Clear Data ?');
      const text = this.atv.global.i18n.tr('three.Are you sure that you want to delete all the data related to this site in the API ?');
      const dialog = await this.modalService.open({
        viewModel: ConfirmDialog,
        model: {
          title,
          text
        }
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        await ThreeSiteModel.clearData(this.adminSite.id);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async createNewSite() {
    try {
      const dialog = await this.modalService.open({
        viewModel: PromptTextDialog,
        model: {
          title: this.atv.global.i18n.tr('three.Create a new site'),
          text: this.atv.global.i18n.tr('three.Enter the new site name'),
          label: this.atv.global.i18n.tr('three.Site Name'),
          required: true,
          icon: ''
        }
      });
  
      const result = await dialog.whenClosed();
  
      if (!result.wasCancelled) {
        let site = new ThreeSiteModel();
        site.name = result.output;
        const newSite = await site.save();
        await this.atv.siteService.fetchSites();
        this.selectSite(newSite.id);
      }
    } catch (err) {
      errorify(err);
    }

  }

  public async deleteSite() {
    try {
      const dialog = await this.modalService.open({
        viewModel: ConfirmDialog,
        model: {
          title: this.atv.global.i18n.tr('three.Delete site'),
          text: this.atv.global.i18n.tr('three.Please confirm that you want to remove this site and all its data.'),
        }
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        await ThreeSiteModel.clearData(this.atv.siteService.site.id);
        await this.atv.siteService.site.remove();
        await this.atv.siteService.fetchSites();
        notify(this.atv.global.i18n.tr('three.The site has been deleted'));
        this.backToSites();
      }
    } catch (error) {
      errorify(error);
    }
  }
  
}
