import { ThreeStyleModel, ThreeThemeModel } from 'aurelia-three';
import { UxModalService, UxModalServiceResult} from '@aurelia-ux/modal'
import { errorify, ConfirmDialog } from 'aurelia-resources';
import { inject } from 'aurelia-framework';
import { AtvGlobal } from '../global';

@inject(UxModalService,  AtvGlobal)
export class AtvStyleDialog {

  public mode: 'create' | 'edit' = 'create';
  public siteId: string;
  public style: ThreeStyleModel;
  public name: string;

  private handleObject = false;
  private handleLabel = false;
  private handleIcon = false;
  private handleGeometry = false;
  private handleEdges = false;

  constructor(private modalService: UxModalService, private atv: AtvGlobal) {
    
  }

  public activate(params: any) {
    if (params.siteId) {
      this.siteId = params.siteId;
    }
    if (params.style && params.style instanceof ThreeStyleModel) {
      this.style = params.style;
      this.siteId = this.style.siteId;
      this.mode = 'edit';

      console.log('this.style', this.style);

      this.handleObject = this.style.display !== undefined;
      this.handleLabel = this.style.displayLabel !== undefined;
      this.handleIcon = this.style.icon !== undefined;
      this.handleGeometry = this.style.replaceGeometry !== undefined;
      this.handleEdges = this.style.edgesDisplay !== undefined;

    } else {
      this.style = new ThreeStyleModel();
      this.style.siteId = this.siteId;
      this.mode = 'create';
    }
  }

  public async canDeactivate(result: UxModalServiceResult) {
    if (result.wasCancelled) {
      return true;
    }
    if (result.output === 'remove') {
      const themes = (await ThreeThemeModel.getAll(`?siteId=${this.atv.siteService.site.id}`)).filter((theme) => {
        for (const rule of theme.rules) {
          if (rule.styles.includes(this.style.id)) {
            return true;
          }
        }
      });
      let text = `Remove the style ${this.style.name} ?`;
      if (themes.length) {
        text += '<br><br>The style will also be removed from the following themes: <ul>' + themes.map(t => `<li>${t.name}</li>`).join('') + '</ul>';
      }
      const confirm = await this.modalService.open({
        viewModel: ConfirmDialog,
        model: {title: 'Are you sure ?', text: text}
      })
      const confirmResult = await confirm.whenClosed();
      if (!confirmResult.wasCancelled) {
        await this.remove();
        return;
      } else {
        return false;
      }
    }
    const validationResult = await this.style.validationController.validate();
    if (!validationResult.valid) {
      for (let result of validationResult.results) {
        if (!result.valid) {
          errorify(new Error(result.message));
        }
      }
      return false;
    }
    try {
      const style = await this.save();
      result.output = style;
    } catch (error) {
      errorify(error);
      return false;
    }
  }

  public async save(): Promise<ThreeStyleModel> {
    let style: ThreeStyleModel;

    const s: any = this.style;
    s.display            = this.handleObject ? this.style.display === true : 'undefined';
    s.displayLabel       = this.handleLabel ? this.style.displayLabel === true  : 'undefined';
    s.icon               = this.handleIcon ? this.style.icon === true  : 'undefined';
    s.replaceGeometry    = this.handleGeometry ? this.style.replaceGeometry === true  : 'undefined';
    s.edgesDisplay       = this.handleEdges ? this.style.edgesDisplay === true  : 'undefined';

    if (this.mode === 'create') {
      style = await this.style.save();
    } else {
      style = await this.style.updateProperties('', Object.keys(this.style));
    }
    return style;
  }

  public async remove(): Promise<void> {
    if (this.mode === 'edit') {
      await this.style.remove();
    }
  }

  
}
