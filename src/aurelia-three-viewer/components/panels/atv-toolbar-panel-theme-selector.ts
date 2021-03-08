import { ThreeThemeModel, ThreeStyleModel, ThreeThemeModelRule, ThreeThemeRule } from 'aurelia-three';
import { inject, customElement } from 'aurelia-framework';
import { AtvGlobal } from '../../global';
import { errorify, notify, PromptTextDialog } from 'aurelia-resources'
import { UxModalService } from '@aurelia-ux/modal';
import { Subscription } from 'aurelia-event-aggregator';
import { AtvThemeDialog } from 'aurelia-three-viewer/dialogs/atv-theme-dialog';

@customElement('atv-toolbar-panel-theme-selector')
@inject(Element, AtvGlobal, UxModalService)
export class AtvToolbarPanelThemeSelector {

  // public themes: Array<ThreeThemeModel> = [];
  // public styles: Array<ThreeStyleModel> = [];
  // public stylesById: {[key: string]: ThreeStyleModel} = {};

  private subscriptions: Subscription[] = [];

  public selectedTheme: ThreeThemeModel | null = null;
  public selectedRuleIndex: number | null = null;
  public includedFlowsInSelectedTheme: ThreeStyleModel[] = [];

  public constructor(private element: HTMLElement, public atv: AtvGlobal, private modalService: UxModalService) {

  }

  public async toggleTheme(theme: ThreeThemeModel, event?: any): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    this.atv.siteService.selectTheme(theme);
  }

  public attached() {
    this.subscriptions.push(this.atv.subscribe('atv-site-loaded', async (_site) => {
      await this.atv.siteService.loadStyles();
      await this.atv.siteService.loadThemes();
      this.backToThemes();
    }));
    this.subscriptions.push(this.atv.subscribe('atv-data-imported', async () => {
      await this.atv.siteService.loadStyles();
      await this.atv.siteService.loadThemes();
      this.backToThemes();
    }));
    this.subscriptions.push(this.atv.subscribe('swissdata:logout', () => {
      this.backToSelectedTheme();
      this.backToThemes();
    }));
  }

  public detached() {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }

  public selectTheme(themeOrThemeId: ThreeThemeModel | string) {
    const theme = themeOrThemeId instanceof ThreeThemeModel ? themeOrThemeId : this.atv.siteService.themes.find(t => t.id === themeOrThemeId);
    if (!theme) {
      throw new Error('Theme not found');
    }
    if (this.atv.siteService.stylingService.currentThemeName !== theme.name) {
      this.atv.siteService.selectTheme(theme);
    }
    if (this.atv.global.state.swissdata.authenticated) {
      this.selectedTheme = theme;
    }
  }

  public selectRule(index: number) {
    this.selectedRuleIndex = index;
  }

  public backToThemes() {
    this.selectedTheme = null;
  }

  public backToSelectedTheme() {
    this.selectedRuleIndex = null;
  }

  public async createNewTheme() {
    try { 
      const dialog = await this.modalService.open({
        viewModel: AtvThemeDialog,
        model: {
          siteId: this.atv.siteService.site.id,
          overlayDismiss: false
        }
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled && result.output instanceof ThreeThemeModel) {
        await this.atv.siteService.loadThemes();
        const createdTheme = this.atv.siteService.themes.find(t => t.id === result.output.id);
        this.selectTheme(createdTheme);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editTheme(theme: ThreeThemeModel) {
    const editedTheme = new ThreeThemeModel;
    editedTheme.id = theme.id;
    await editedTheme.updateInstanceFromElement(theme);
    try { 
      const dialog = await this.modalService.open({
        viewModel: AtvThemeDialog,
        model: {theme: editedTheme},
        overlayDismiss: false
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled && result.output instanceof ThreeThemeModel) {
        await theme.updateInstanceFromElement(result.output);
        notify('The theme has been edited');
      } else if (!result.wasCancelled && result.output === 'remove') {
        this.atv.siteService.loadThemes();
        this.backToThemes();
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async createNewRule() {
    try { 
      const dialog = await this.modalService.open({
        viewModel: PromptTextDialog,
        model: {
          title: 'Create New Rule',
          label: 'Rule Name',
          required: true
        },
        overlayDismiss: false
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        if (typeof result.output === 'string') {
          const rule = new ThreeThemeModelRule();
          rule.name = result.output;
          rule.styles = [];
          rule.conditions = [];
          rule.applyToChildren = false;
          this.selectedTheme.rules.push(rule);
          await this.selectedTheme.updateProperties('', ['rules']);
          await this.atv.siteService.loadThemes();
          this.reselectTheme();
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async updateTheme() {
    await this.atv.siteService.updateTheme(this.selectedTheme);
    await this.atv.siteService.loadThemes();
    this.reselectTheme();
  }

  public reselectTheme() {
    this.selectTheme(this.selectedTheme.id);
  }

  public async ruleRemoved(event: CustomEvent) {
    const rule = event.detail;
    this.backToSelectedTheme();
    const index = this.selectedTheme.rules.indexOf(rule);
    if (index !== -1) {
      this.selectedTheme.rules.splice(index, 1);
      this.updateTheme();
    }
  }
  
}
