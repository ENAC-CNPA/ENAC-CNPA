import { LoadSiteOptions, AtvFilter } from './../interfaces';
import { AtvGlobal } from './../global';
import { ThreeSiteModel, ThreeThemeModel, ThreeStyleModel, ThreeStylingService, ThreeGenerator, ThreeTheme } from 'aurelia-three';
import { inject, TaskQueue, Container, observable, BindingEngine, Disposable } from 'aurelia-framework';
import { PromptSelectDialog } from 'aurelia-resources';
import { UxModalService } from '@aurelia-ux/modal';
import * as THREE from 'three';
import * as resolvePath from 'object-resolve-path';
import * as moment from 'moment';

@inject(Container, TaskQueue, BindingEngine, UxModalService)
export class SiteService {

  public site: ThreeSiteModel;
  public keyValues: {[key: string]: Array<any>} = {};
  public sites: ThreeSiteModel[];
  public operation: string;

  // styling / theming tool
  public themes: Array<ThreeThemeModel> = [];
  public styles: Array<ThreeStyleModel> = [];
  public selectedTheme: ThreeThemeModel;
  public stylingService: ThreeStylingService;

  // search and filter
  @observable({changeHandler: 'requestApplyFilters'}) public q: string = '';
  @observable({changeHandler: 'requestApplyFilters'}) public filters: AtvFilter[] = [];

  // zone tool
  public hasUnclassified: Array<string> = [];
  public selectedUnclassified: Array<string> = [];
  public selectedSpaces: Array<string> = [];
  public displaySpacesForStoreys: {[key: string]: boolean} = {};
  public selectedBuildings: Array<string> = [];
  public selectedStoreys: Array<string> = [];
  public indeterminateBuildings: Array<string> = [];
  public indeterminateStoreys: Array<string> = [];
  private observers: Array<Disposable> = [];

  private ready = false;
  private siteReady = false;
  private atv: AtvGlobal;

  public constructor(public container: Container, public taskQueue: TaskQueue, private bindingEngine: BindingEngine, private modalService: UxModalService) {
    this.taskQueue.queueTask(() => {
      this.init();
    });
  }

  private init() {
    if (this.ready) {
      return;
    }
    this.atv = this.container.get(AtvGlobal);
    if (!this.atv.three) {
      this.taskQueue.queueTask(() => {
        this.init();
      });
      return;
    }
    this.stylingService = new ThreeStylingService(this.atv.three, this.atv);
    this.ready = true;
    this.fetchSites();
  }

  public async isReady(): Promise<void> {
    if (this.ready) {
      return;
    }
    await new Promise(resolve => this.taskQueue.queueTask(resolve));
    return this.isReady();
  }

  public async fetchSites(): Promise<void> {
    if (!this.ready) {
      throw new Error('SiteService not ready');
    }
    this.sites = await ThreeSiteModel.getAll();
  }

  public async unloadCurrentSite() {
    this.siteReady = false;
    this.atv.three.objects.clearScene();
    this.disposeSpacesObservers();
    this.themes = [];
    this.styles = [];
    clearTimeout(this.requestApplyFiltersTimeout);
    clearTimeout(this.requestSpacesStateDeterminationTimeout);
    this.requestApplyFiltersTimeout = undefined;
    this.requestSpacesStateDeterminationTimeout = undefined;
    this.keyValues = {};
    this.selectedTheme = undefined;
    this.selectedSpaces = [];
    this.selectedStoreys = [];
    this.selectedBuildings = [];
    this.hasUnclassified = [];
    this.selectedUnclassified = [];
    this.displaySpacesForStoreys = {};
    this.indeterminateBuildings = [];
    this.indeterminateStoreys = [];
    this.site = undefined;
  }

  public async loadSite(siteId: string, theme?: string, options?: LoadSiteOptions): Promise<void> {
    console.log('loadSite', siteId);
    this.siteReady = false;
    try {
      if (!this.ready) {
        throw new Error('SiteService not ready');
      }
      if (this.operation) {
        throw new Error('Operation in progress, please try later');
      }
      this.operation = 'Loading Site';
      const site = await ThreeSiteModel.getOneWithId(siteId);
      if (!site) {
        throw new Error('Site not found');
      }
      this.site = site;
      this.operation = 'Processing Site Data';
      this.selectedSpaces = [];
      this.disposeSpacesObservers();
      for (const space of this.site.spaces || []) {
        this.selectedSpaces.push(space.id);
      }
      this.startSpacesObservers();
      this.loadThemes(theme);
      this.fetchKeyValues();
      this.operation = 'Loading Objects';
      const json = await ThreeSiteModel.getSiteJson(this.site.id);
      this.operation = 'Building Scene';
      // edges are now handled by theme
      // we should be able to remove this line soon
      // this.atv.three.objects.setShowEdges(options?.showEdges !== false);
      await this.atv.three.objects.loadJSON(json, {
        calculateOffsetCenter: 'never'
      });
      this.prepareZones();
      this.atv.three.navigation.zoomOnScene(1);
      this.taskQueue.queueTask(() => {
        this.generateSpaces();
      });
      this.atv.publish('atv-site-loaded', this.site);
      this.siteReady = true;
      this.operation = '';
    } catch (error) {
      this.operation = '';
      throw error;
    }
  }

  public dispose() {
    this.disposeSpacesObservers();
  }

  // public generateSpaces(): void {
  //   const generator = new ThreeGenerator();
  //   const spaceMaterial = new THREE.MeshBasicMaterial({color: '#337ab7'});
  //   for (let space of this.site.spaces || []) {
  //     const mesh = generator.space2mesh(space, spaceMaterial, 0.01, {alwaysUseDefaultHeight: true});
  //     if (mesh) {
  //       (mesh as any).__ignoreEdges = true;
  //       this.atv.three.objects.addObject(mesh);
  //     }
  //   }
  // }

  public prepareZones(): void {
    this.atv.three.getScene().traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const buildingId = object.userData.buildingId;
        const storeys = Array.isArray(object.userData.storeys) ? object.userData.storeys : [];
        const spaceId = object.userData.spaceId;
        if (!buildingId && !this.hasUnclassified.includes('')) {
          this.hasUnclassified.push('');
          this.selectedUnclassified.push('');
        }
        if (buildingId && storeys.length === 0 && !this.hasUnclassified.includes(buildingId)) {
          this.hasUnclassified.push(buildingId);
          this.selectedUnclassified.push(buildingId);
        }
        if (buildingId && storeys.length > 0 && !spaceId) {
          for (let storey of storeys) {
            if (!this.hasUnclassified.includes(storey)) {
              this.hasUnclassified.push(storey);
              this.selectedUnclassified.push(storey);
            }
          }
        }
      }
    });
  }

  public async loadStyles(): Promise<void> {
    if (!this.site.id) {
      throw new Error('Missing site');
    }
    this.styles = await ThreeStyleModel.getAll(`?siteId=${this.site.id}`);
  }

  public async loadThemes(firstThemeIfPossible?: string): Promise<void> {
    if (!this.site.id) {
      throw new Error('Missing site');
    }
    await this.loadStyles();
    this.themes = await ThreeThemeModel.getAll(`?siteId=${this.site.id}`);
    this.setFirstTheme(firstThemeIfPossible);
  }

  private setFirstTheme(firstThemeIfPossible?: string) {
    if (this.themes.length) {
      let selectedTheme = false;
      for (let index in this.themes) {
        if (this.themes[index].name === firstThemeIfPossible) {
          this.selectTheme(this.themes[index]);
          selectedTheme = true;
        }
      }
      if (!selectedTheme) {
        // we use to select the first theme by default
        // trying not to do this anymore
        // this.selectTheme(this.themes[0]);
      }
    }
  }

  public selectTheme(theme: ThreeThemeModel) {
    if (this.themes.indexOf(theme) !== -1) {
      theme.updateTheme(this.styles);
      if (this.stylingService.currentThemeName !== theme.name) {
        this.selectedTheme = theme;
      } else {
        this.selectedTheme = undefined;
      }
    }
    this.applyFilters();
    // this.renderSelectedTheme(); // render will be called by applyFilters
  }

  private renderSelectedTheme() {
    if (this.atv.select) {
      this.atv.select.clearSelectionStyle();
    }
    if (this.selectedTheme) {
      this.stylingService.activate(this.selectedTheme.theme);
    } else {
      this.stylingService.clearTheme();
    }
    if (this.atv.select) {
      this.atv.select.applySelectionStyles();
    }
  }
  
  public async updateTheme(theme: ThreeThemeModel, updateApi: boolean = true) {
    // update theme (API)
    const updatedTheme = updateApi ? await theme.updateProperties('', Object.keys(theme)) : theme;
    // update its ref in the .themes property
    for (const currentTheme of this.themes) {
      if (currentTheme.id === updatedTheme.id) {
        await currentTheme.updateInstanceFromElement(updatedTheme);
      }
    }
    // update its ref in selectedTheme if the currentTheme is the same
    if (this.selectedTheme.id === updatedTheme.id) {
      await this.selectedTheme.updateInstanceFromElement(updatedTheme);
      // update the theme in stylingService if its the current theme
      this.selectedTheme.updateTheme(this.styles);
      this.stylingService.activate(this.selectedTheme.theme);
    }
  }

  private removeSpaces() {
    const objToRemove: THREE.Object3D[] = [];
    this.atv.three.getScene().traverse((obj) => {
      if (obj.userData.type === 'IfcSpace') {
        objToRemove.push(obj);
      }
    });
    for (const obj of objToRemove) {
      this.atv.three.getScene().remove(obj);
      this.stylingService.removeRelatedObjects(obj);
    }
  }

  private generateSpaces(theme?: ThreeTheme) {
    if (!this.atv) {
      return;
    }
    theme = theme || this.selectedTheme?.theme;
    this.removeSpaces();
    const themeSpaceHeight: string | number | undefined | unknown = theme?.spaceHeight as unknown;
    if (themeSpaceHeight === 0 || themeSpaceHeight === '0') {
      return; // no space
    }
    const generator = new ThreeGenerator();
    const spaceMaterial = new THREE.MeshBasicMaterial({color: '#337ab7'});
    const alwaysUseDefaultHeight = themeSpaceHeight !== undefined && themeSpaceHeight !== '' && themeSpaceHeight !== null;
    for (let space of this.atv.siteService.site.spaces || []) {
      const mesh = generator.space2mesh(space, spaceMaterial, theme?.spaceHeight || parseFloat(space.userData?.height) || 0.01, {alwaysUseDefaultHeight: alwaysUseDefaultHeight});
      if (mesh) {
        (mesh as any).__ignoreEdges = true;
        this.atv.three.objects.addObject(mesh);
      } else {
        console.warn('Error while generating space', space);
      }
    }
  }
  
  private requestApplyFiltersTimeout;
  public requestApplyFilters(timeout: number = 300) {
    if (!this.ready || !this.atv || !this.atv.three) {
      return;
    }
    if (this.requestApplyFiltersTimeout) {
      clearTimeout(this.requestApplyFiltersTimeout);
    }
    this.requestApplyFiltersTimeout = setTimeout(() => {
      this.applyFilters();
    }, timeout);
  }

  private applyFilters() {
    if (!this.ready || !this.atv || !this.atv.three) {
      return;
    }

    this.generateSpaces(this.selectedTheme?.theme);
    
    const q = this.q.toLowerCase().trim();
    this.atv.three.getScene().traverse((object) => {
      if (object instanceof THREE.Camera) return;
      if (object instanceof THREE.Light) return;
      if (object.userData.__isOverlay) return;
      const o: any = object;
      if (o.__filterToolOriginalVisible === undefined) o.__filterToolOriginalVisible = object.visible;
      let hideObject = false;
      if (q) {
        let foundObjectWithSearch = false;
        if (!foundObjectWithSearch && object.userData && object.userData.name && object.userData.name.toLowerCase().indexOf(q) !== -1) {
          foundObjectWithSearch = true;
        }
        if (!foundObjectWithSearch && object.userData && object.userData.type && object.userData.type.toLowerCase().indexOf(q) !== -1) {
          foundObjectWithSearch = true;
        }
        if (!foundObjectWithSearch && object.userData && object.userData.pset) {
          for (let key in object.userData.pset) {
            if (object.userData.pset[key].toLowerCase().indexOf(q) !== -1) {
              foundObjectWithSearch = true;
              break;
            }
          }
        }
        if (!foundObjectWithSearch) {
          hideObject = true;
        }
      }
      if (!hideObject) {
        if (!this.compareFilterWithObject(object)) {
          hideObject = true;
        }
      }
      if (!hideObject) {
        let zoneActive = false;
        const buildingId: string = (o.userData.buildingId);
        const storeys: string[] = (o.userData.storeys || []);
        const spaceId: string = (o.userData.spaceId);

        if (buildingId && this.selectedBuildings.includes(buildingId)) {
          zoneActive = true;
        } else if (storeys.length > 0 && this.selectedStoreys.some(i => storeys.includes(i))) {
          zoneActive = true;
        } else if (spaceId && this.selectedSpaces.includes(spaceId)) {
          zoneActive = true;
        } else if (!buildingId && this.selectedUnclassified.includes('')) {
          zoneActive = true;
        } else if (storeys.length === 0 && buildingId && this.selectedUnclassified.includes(buildingId)) {
          zoneActive = true;
        } else if (!spaceId && storeys.length > 0 && this.selectedUnclassified.some(i => storeys.includes(i))) {
          zoneActive = true;
        }

        if (!zoneActive) {
          hideObject = true;
        }
      }
      if (hideObject) {
        object.visible = false;
      } else {
        object.visible = o.__filterToolOriginalVisible;
        if (object.visible) {
          if (object.parent) object.parent.visible = true;
          if (object.parent?.parent) object.parent.parent.visible = true;
          if (object.parent?.parent?.parent) object.parent.parent.parent.visible = true;
        }
      }
      o.__filterToolVisible = object.visible;
    });

    // request apply current Theme
    this.renderSelectedTheme();
  }

  private compareFilterWithObject(object: THREE.Object3D): boolean {
    for (let filter of this.filters) {
      if (!filter.key || !filter.value) continue;
      let value = resolvePath(object, this.preparePathKey(filter.key));
      if (typeof filter.value === 'number' && typeof value === 'string') {
        value = parseFloat(value);
      } else if (filter.value instanceof Date && typeof value === 'string') {
        value = moment(value).toDate();
      }
      if (filter.operator === '=') {
        if (value != filter.value) {
          return false;
        }
      } else if (filter.operator === '!=') {
        if (value == filter.value) return false;
      } else if (filter.operator === '<') {
        if (value > filter.value) return false;
      } else if (filter.operator === '>') {
        if (value < filter.value) return false;
      } else if (filter.operator === '*') {
        if (typeof filter.value !== 'string' && filter.value.toString) filter.value = filter.value.toString();
        if (typeof value !== 'string' && value.toString) value = value.toString();
        if (typeof value !== 'string' || typeof filter.value !== 'string') {
          // could not convert values to string
          return false;
        }
        if (value.toLowerCase().indexOf(filter.value.toLowerCase()) === -1) return false;
      }
    }
    return true;
  }

  private preparePathKey(key: string) {
    const parts = key.split('.');
    for (let i = 0; i < parts.length; i++) {
      if (i === 0) {
        continue;
      }
      parts[i] = `["${parts[i]}"]`;
    }
    return parts.join('');
  }

  private startSpacesObservers() {
    this.observers.push(this.bindingEngine.collectionObserver(this.selectedSpaces).subscribe(() => {
      this.requestSpacesStateDetermination();
    }));
    this.observers.push(this.bindingEngine.collectionObserver(this.selectedUnclassified).subscribe(() => {
      this.requestSpacesStateDetermination();
    }));
  }

  private disposeSpacesObservers() {
    for (let obs of this.observers) {
      obs.dispose();
    }
    this.observers = [];
  }

  private requestSpacesStateDeterminationTimeout: any;
  private requestSpacesStateDetermination() {
    if (this.requestSpacesStateDeterminationTimeout) {
      clearTimeout(this.requestSpacesStateDeterminationTimeout);
    }
    this.requestSpacesStateDeterminationTimeout = setTimeout(() => {
      this.computeSelectedStoreys();
      this.computeSelectedBuildings();
      this.computeIndeterminateStoreys();
      this.computeIndeterminateBuildings();
      this.requestApplyFilters();
      delete this.requestSpacesStateDeterminationTimeout;
    }, 120);
  }

  public computeSelectedBuildings(): Array<string> {
    const result: Array<string> = [];
    for (let building of this.site.buildings) {
      let foundSelected = this.selectedUnclassified.includes(building.id) && this.hasUnclassified.includes(building.id);
      let foundUnselected = !this.selectedUnclassified.includes(building.id) && this.hasUnclassified.includes(building.id);
      for (let storey of this.site.storeys) {
        if (storey.buildingId === building.id) {
          const selected = this.selectedStoreys.indexOf(storey.id) !== -1;
          if (selected) {
            foundSelected = true;
          } else {
            foundUnselected = true;
          }
        }
      }
      if (foundSelected && !foundUnselected) {
        result.push(building.id);
      }
    }
    this.selectedBuildings = result;
    return result;
  }

  public computeSelectedStoreys(): Array<string> {
    const result: Array<string> = [];
    for (let storey of this.site.storeys) {
      let foundSelected = this.selectedUnclassified.includes(storey.id) && this.hasUnclassified.includes(storey.id);
      let foundUnselected = !this.selectedUnclassified.includes(storey.id) && this.hasUnclassified.includes(storey.id);
      for (let space of this.site.spaces) {
        if (space.storeyIds.includes(storey.id)) {
          const selected = this.selectedSpaces.indexOf(space.id) !== -1;
          if (selected) {
            foundSelected = true;
          } else {
            foundUnselected = true;
          }
        }
      }
      if (foundSelected && !foundUnselected) {
        result.push(storey.id);
      }
    }
    this.selectedStoreys = result;
    return result;
  }

  public computeIndeterminateBuildings(): Array<string> {
    const result: Array<string> = [];
    for (let building of this.site.buildings) {
      let foundSelected = this.selectedUnclassified.includes(building.id) && this.hasUnclassified.includes(building.id);
      let foundUnselected = !this.selectedUnclassified.includes(building.id) && this.hasUnclassified.includes(building.id);
      for (let storey of this.site.storeys) {
        if (storey.buildingId === building.id) {
          const selected = this.selectedStoreys.indexOf(storey.id) !== -1;
          if (selected) {
            foundSelected = true;
          } else {
            foundUnselected = true;
          }
        }
      }
      if (foundSelected && foundUnselected) {
        result.push(building.id);
      }
    }
    this.indeterminateBuildings = result;
    return result;
  }

  public computeIndeterminateStoreys(): Array<string> {
    const result: Array<string> = [];
    for (let storey of this.site.storeys) {
      let foundSelected = this.selectedUnclassified.includes(storey.id) && this.hasUnclassified.includes(storey.id);
      let foundUnselected = !this.selectedUnclassified.includes(storey.id) && this.hasUnclassified.includes(storey.id);
      for (let space of this.site.spaces) {
        if (space.storeyIds.includes(storey.id)) {
          const selected = this.selectedSpaces.indexOf(space.id) !== -1;
          if (selected) {
            foundSelected = true;
          } else {
            foundUnselected = true;
          }
        }
      }
      if (foundSelected && foundUnselected) {
        result.push(storey.id);
      }
    }
    this.indeterminateStoreys = result;
    return result;
  }

  public toggleDisplaySpacesForStorey(storey: string) {
    this.displaySpacesForStoreys[storey] = !this.displaySpacesForStoreys[storey];
  }

  public toggleBuilding(buildingId: string) {
    const index = this.selectedBuildings.indexOf(buildingId);
    const mustBeChecked = index === -1;

    const unclassifiedIndex = this.selectedUnclassified.indexOf(buildingId);
    if (unclassifiedIndex === -1 && mustBeChecked && this.hasUnclassified.includes(buildingId)) {
      this.selectedUnclassified.push(buildingId);
    } else if (unclassifiedIndex !== -1 && !mustBeChecked && this.hasUnclassified.includes(buildingId)) {
      this.selectedUnclassified.splice(unclassifiedIndex, 1);
    }
    for (let storey of this.site.storeys) {
      if (storey.buildingId === buildingId) {
        const unclassifiedIndex = this.selectedUnclassified.indexOf(storey.id);
        if (unclassifiedIndex === -1 && mustBeChecked && this.hasUnclassified.includes(storey.id)) {
          this.selectedUnclassified.push(storey.id);
        } else if (unclassifiedIndex !== -1 && !mustBeChecked && this.hasUnclassified.includes(storey.id)) {
          this.selectedUnclassified.splice(unclassifiedIndex, 1);
        }
        for (let space of this.site.spaces) {
          if (space.storeyIds.includes(storey.id)) {
            const index = this.selectedSpaces.indexOf(space.id);
            if (index === -1 && mustBeChecked) {
              this.selectedSpaces.push(space.id);
            } else if (index !== -1 && !mustBeChecked) {
              this.selectedSpaces.splice(index, 1);
            }
          }
        }
      }
    }
    this.requestSpacesStateDetermination();
  }

  public toggleStorey(storeyId: string) {
    const index = this.selectedStoreys.indexOf(storeyId);
    const mustBeChecked = index === -1;
    const unclassifiedIndex = this.selectedUnclassified.indexOf(storeyId);
    if (unclassifiedIndex === -1 && mustBeChecked) {
      this.selectedUnclassified.push(storeyId);
    } else if (unclassifiedIndex !== -1 && !mustBeChecked) {
      this.selectedUnclassified.splice(unclassifiedIndex, 1);
    }
    for (let space of this.site.spaces) {
      if (space.storeyIds.includes(storeyId)) {
        const index = this.selectedSpaces.indexOf(space.id);
        if (index === -1 && mustBeChecked) {
          this.selectedSpaces.push(space.id);
        } else if (index !== -1 && !mustBeChecked) {
          this.selectedSpaces.splice(index, 1);
        }
      }
    }
    this.requestSpacesStateDetermination();
  }

  public async fetchKeyValues(): Promise<void> {
    const response = await ThreeSiteModel.api.get(`/three/site/${this.site.id}/key-values`);
    const json = await response.json();
    this.keyValues = json;
  }

  public async keyHelperList(destinationObject: any, destinationKey: string = 'key') {
    const currentValue = destinationObject[destinationKey];
    let options: Array<string> = [];
    for (const key in this.keyValues) {
      options.push(key);
    }

    const dialog = await this.modalService.open({
      viewModel: PromptSelectDialog,
      model: {
        options: options,
        autoClose: true,
        required: false,
        mode: 'single',
        value: currentValue
      }
    });
    const result = await dialog.whenClosed();
    if (!result.wasCancelled && result.output) {
      destinationObject[destinationKey] = result.output;
    }
  }

  public async valueHelperList(key: string, destinationObject: any, destinationKey: string = 'value') {
    if (!key) return;
    const currentValue = destinationObject[destinationKey];
    let options: Array<string> = this.keyValues[key] || [];

    const dialog = await this.modalService.open({
      viewModel: PromptSelectDialog,
      model: {
        options: options,
        autoClose: true,
        required: false,
        mode: 'single',
        value: currentValue
      }
    });
    const result = await dialog.whenClosed();
    if (!result.wasCancelled && result.output) {
      destinationObject[destinationKey] = result.output;
    }
  }


}
