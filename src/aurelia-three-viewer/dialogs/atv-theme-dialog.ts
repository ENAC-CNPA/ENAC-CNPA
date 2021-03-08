import { ThreeThemeModel } from 'aurelia-three';
import { UxModalService, UxModalServiceResult} from '@aurelia-ux/modal'
import { errorify, ConfirmDialog } from 'aurelia-resources';
import { inject } from 'aurelia-framework';

@inject(UxModalService)
export class AtvThemeDialog {

  public mode: 'create' | 'edit' = 'create';
  public siteId: string;
  public theme: ThreeThemeModel;
  public name: string;

  constructor(private modalService: UxModalService) {
    
  }

  public activate(params: any) {
    if (params.siteId) {
      this.siteId = params.siteId;
    }
    if (params.theme && params.theme instanceof ThreeThemeModel) {
      this.theme = params.theme;
      this.siteId = this.theme.siteId;
      this.mode = 'edit';
    } else {
      this.theme = new ThreeThemeModel();
      this.theme.siteId = this.siteId;
      this.mode = 'create';
    }
  }

  public async canDeactivate(result: UxModalServiceResult) {
    if (result.wasCancelled) {
      return true;
    }
    if (result.output === 'remove') {
      const confirm = await this.modalService.open({
        viewModel: ConfirmDialog,
        model: {title: 'Are you sure ?', text: `Remove the theme ${this.theme.name} ?`}
      })
      const confirmResult = await confirm.whenClosed();
      if (!confirmResult.wasCancelled) {
        this.remove();
      }
      return;
    }
    const validationResult = await this.theme.validationController.validate();
    if (!validationResult.valid) {
      for (let result of validationResult.results) {
        if (!result.valid) {
          errorify(new Error(result.message));
        }
      }
      return false;
    }
    try {
      const theme = await this.save();
      result.output = theme;
    } catch (error) {
      errorify(error);
      return false;
    }
  }

  public async save(): Promise<ThreeThemeModel> {
    let theme: ThreeThemeModel;
    if (this.mode === 'create') {
      theme = await this.theme.save();
    } else {
      theme = await this.theme.updateProperties('', ['name', 'spaceHeight']);
    }
    return theme;
  }

  public async remove(): Promise<void> {
    if (this.mode === 'edit') {
      await this.theme.remove();
    }
  }

  
}
