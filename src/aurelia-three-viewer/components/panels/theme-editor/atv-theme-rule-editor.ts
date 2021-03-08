import { ThreeThemeRuleCondition, ThreeThemeModelRule, ThreeThemeModel, ThreeStyleModel } from 'aurelia-three';
import { inject, bindable, DOM, customElement, computedFrom, bindingMode } from 'aurelia-framework';
import { ConfirmDialog, errorify, notify } from 'aurelia-resources';
import { UxModalService } from '@aurelia-ux/modal';
import { AtvGlobal } from '../../../global';
import { AtvStyleDialog } from 'aurelia-three-viewer/dialogs/atv-style-dialog';

@customElement('atv-theme-rule-editor')
@inject(Element, AtvGlobal,  UxModalService)
export class AtvThemeRuleEditor {    

  @bindable({defaultBindingMode: bindingMode.twoWay}) private theme: ThreeThemeModel;
  @bindable public ruleIndex: number;

  public includedStylesInRule: ThreeStyleModel[] = [];
  public counter = 0;
  
  constructor(private element: Element, private atv: AtvGlobal, private modalService: UxModalService) {

  }

  @computedFrom('theme', 'theme.rules.length', 'ruleIndex', 'counter')
  public get rule(): ThreeThemeModelRule {
    return this.theme.rules[this.ruleIndex];
  }

  public bind() {
    this.counter = 0;
    this.ruleIndexChanged();
  }

  public ruleIndexChanged() {
    this.setIncludedStylesInRule();
  }

  public addConditionToRule(e) {
    if (!Array.isArray(this.rule.conditions)) {
      this.rule.conditions = [];
    }
    this.rule.conditions.push({key: '', type: '=', value: ''});
    this.notifyModification();
  }

  public removeConditionFromRule(index: number) {
    if (!Array.isArray(this.rule.conditions)) {
      this.rule.conditions = [];
      return;
    }
    this.rule.conditions.splice(index, 1);
    this.notifyModification();
  }

  public styleNameFromId(styleId) {
    for (let style of this.atv.siteService.styles) {
      if (style.id === styleId) return style.name
    }
    return '';
  }

  public async notifyModification() {
    // await this.theme.updateProperties('', ['rules']);
    this.setIncludedStylesInRule();
    let event = DOM.createCustomEvent('rule-updated', {detail: this.rule, bubbles: true});
    this.element.dispatchEvent(event);
  }

  private setIncludedStylesInRule() {
    if (this.ruleIndex === null) {
      this.includedStylesInRule = [];
      return;
    }
    if (!Array.isArray(this.rule.styles)) {
      this.rule.styles = [];
    }
    this.includedStylesInRule = this.rule.styles.map((styleId) => {
      const style = this.atv.siteService.styles.find((style) => style.id === styleId);
      if (!style) {
        console.warn('Missing style');
        return null;
      }
      return style;
    });
    const tmp = this.includedStylesInRule;
    this.includedStylesInRule = [];
    this.includedStylesInRule = tmp.map(i => i);
  }

  public async updateRuleWithIncludedStyles() {
    this.rule.styles = this.includedStylesInRule.map(i => i.id);
    // await this.theme.updateProperties('', ['rules']);
    // this.setIncludedStylesInRule();
    await this.notifyModification();
  }

  public addStyle(style: ThreeStyleModel, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    this.includedStylesInRule.push(style);
    this.updateRuleWithIncludedStyles();
  }

  public removeStyle(index: number, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    this.includedStylesInRule.splice(index, 1);
    this.updateRuleWithIncludedStyles();
  }

  public async createNewStyle() {
    try { 
      const dialog = await this.modalService.open({
        viewModel: AtvStyleDialog,
        model: {
          siteId: this.atv.siteService.site.id
        },
        overlayDismiss: false
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled && result.output instanceof ThreeStyleModel) {
        await this.atv.siteService.loadStyles();
        const createdStyle = this.atv.siteService.styles.find(s => s.id === result.output.id);
        this.addStyle(createdStyle);
        const customEvent = DOM.createCustomEvent('styles-changed', {bubbles: true});
        this.element.dispatchEvent(customEvent);
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editStyle(style: ThreeStyleModel) {
    const editedStyle = new ThreeStyleModel;
    editedStyle.id = style.id;
    await editedStyle.updateInstanceFromElement(style);
    try { 
      const dialog = await this.modalService.open({
        viewModel: AtvStyleDialog,
        model: {style: editedStyle},
        overlayDismiss: false
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled && result.output instanceof ThreeStyleModel) {
        await this.atv.siteService.loadStyles();
        this.setIncludedStylesInRule();
        this.counter++;
        // await style.updateInstanceFromElement(result.output);
        notify('The style has been edited');
        const customEvent = DOM.createCustomEvent('styles-changed', {bubbles: true});
        this.element.dispatchEvent(customEvent);
      } else if (!result.wasCancelled && result.output === 'remove') {
        const index = this.includedStylesInRule.map(s => s.id).indexOf(style.id);
        this.includedStylesInRule.splice(index, 1);
        await this.atv.siteService.loadThemes();
        await this.atv.siteService.loadStyles();
        this.counter++;
        notify('The style has been removed');
        let event = DOM.createCustomEvent('reselect-theme', {bubbles: true});
        this.element.dispatchEvent(event);
      }
    } catch (error) {
      errorify(error);
    }
  }

  @computedFrom('atv.siteService.styles', 'includedStylesInRule.length')
  public get availableStylesForRule(): ThreeStyleModel[] {
    const styles: ThreeStyleModel[] = [];
    const inclIds = this.includedStylesInRule.map(s => s.id);
    for (let style of this.atv.siteService.styles) {
      if (!style) {
        continue; // can happen when deleting a style
      }
      if (!inclIds.includes(style.id)) {
        styles.push(style);
      }
    }
    return styles;
  }

  public stylesOrderChanged(newOrder: ThreeStyleModel[]) {
    this.updateRuleWithIncludedStyles();
  }

  public async removeRule() {
    const confirm = await this.modalService.open({
      viewModel: ConfirmDialog,
      model: {title: 'Are you sure ?', text: `Remove the rule ${this.rule.name} from the theme ${this.theme.name} ?`}
    })
    const confirmResult = await confirm.whenClosed();
    if (!confirmResult.wasCancelled) {
      let event = DOM.createCustomEvent('rule-removed', {detail: this.rule, bubbles: true});
      this.element.dispatchEvent(event);
    }
  }



}

export class FilterStyleValueConverter {
  public toView(styles: ThreeStyleModel[], searchStyle: string): ThreeStyleModel[] {
    const result: ThreeStyleModel[] = [];
    if (searchStyle) {
      const q = searchStyle.toLowerCase();
      for (const style of styles) {
        if (style.name && style.name.toLowerCase().indexOf(q) !== -1) {
          result.push(style);
        }
      }
    } else {
      for (const style of styles) {
        result.push(style);
      }
    }
    result.sort((a, b) => {
      const va = a.name ? a.name.toLowerCase() : '';
      const vb = b.name ? b.name.toLowerCase() : '';
      if (va < vb) {
        return -1;
      }
      if (va < vb) {
        return 1;
      }
      return 0;
    })
    return result;
  }
}
