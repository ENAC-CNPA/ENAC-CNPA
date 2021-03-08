import { inject, Container, TaskQueue, observable, computedFrom, BindingEngine, Disposable} from 'aurelia-framework';
import { Global } from 'global';
import { getLogger, Logger } from 'aurelia-logging';
import { ThreeStylingService, ThreeCustomElement, ThreeSiteModel, ThreeObjectPrepareFiltersOptions, ThreeThemeModel, ThreeStyleModel, THREESelectedObject } from 'aurelia-three';
import { errorify, arDialog, ArDialogPromptOption } from 'aurelia-resources';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import * as resolvePath from 'object-resolve-path';
import * as moment from 'moment';
import * as THREE from 'three';
import { ThreeGenerator, ThreeUtils } from 'aurelia-three';
import { AureliaBcf, BcfServices, BcfProjectInterface, BcfTopicInterface, BcfCommentInterface, BcfViewpointInterface, store } from 'aurelia-bcf';
import { ThreeSelectionTool, ThreeToolsService, ThreeSliceTool, ThreeBuilding, ThreeStorey, ThreeSpace, ThreeMeasureTool } from 'aurelia-three';
import * as FileSaver from 'file-saver';
import { ThreeLogger } from 'aurelia-three';

const log = getLogger('viewer');

@inject(Global, AureliaBcf, EventAggregator, BindingEngine)
export class Viewer {    

  private three: ThreeCustomElement;
  private siteId: string;
  private site: ThreeSiteModel;
  private operation: string;
  private themes: Array<ThreeThemeModel> = [];
  private themeAtLoading: string;
  private styles: Array<ThreeStyleModel> = [];
  private selectedTheme: ThreeThemeModel;
  private stylingService: ThreeStylingService;

  private searchOpened: boolean = false;
  private themesOpened: boolean = false;
  private filtersOpened: boolean = false;
  private bcfOpened: boolean = false;
  private zoneSelectorOpened: boolean = false;
  private sliceToolOpened: boolean = false;

  private selectedObject: THREE.Object3D | null = null;
  private explorerOpened: boolean = true;

  public toolsService: ThreeToolsService;
  private select: ThreeSelectionTool;
  private slice: ThreeSliceTool;
  private measure: ThreeMeasureTool;
  private bcfProject: BcfProjectInterface;
  private bcfTopic: BcfTopicInterface;
  private bcfView: 'topics-list' | 'new-topic' | 'topic' | 'edit-topic' = 'topics-list';
  private bcfNewTopicInstance: BcfTopicInterface;
  private bcfNewCommentInstance: BcfCommentInterface;

  @observable public q: string = '';
  public filters: Array<Filter> = [];

  private subscriptions: Array<Subscription> = [];

  public propertiesExplorerCallback: (object: THREE.Object3D) => Array<string> = (object) => {
    const props: Array<string> = [];
    const userDataKeys = Object.keys(object.userData).filter((key) => {
      return key !== 'pset' && key !== 'id' && key !== 'siteId' && key !== 'parentId' && key !== 'childrenIds' && key !== 'importId';
    });
    props.push(...userDataKeys.map(userDataKey => `userData["${userDataKey}"]`));
    props.push('userData.pset.*');
    return props;
  }
  
  constructor(private global: Global, private bcf: AureliaBcf, private eventAggregator: EventAggregator, private bindingEngine: BindingEngine) {
    if (this.global.state.swissdata.authenticated) {
      this.bcf.authenticate(this.global.state.swissdata.accessToken, this.global.state.swissdata.refreshToken);
    }
  }

  public activate(params: any) {
    if (params && params.siteId) {
      this.siteId = params.siteId;
      this.loadSite();
    }
    if (params && params.theme) {
      this.themeAtLoading = params.theme;
    }
  }

  public attached() {
    this.initStylingService();
    this.subscriptions.push(this.eventAggregator.subscribe('three-cursor:click-tools', (data: THREE.Intersection[]) => {
      // if (this.toolsService.currentToolName === 'slice' && data.length === 0) {
      //   this.slice.toggleSliceTool();
      //   this.select.setType('select');
      // }
    }));
    this.subscriptions.push(this.eventAggregator.subscribe('three-selection:changed', (data) => {
      if (!data.objects || data.objects.length === 0) {
        this.selectedObject = null;
        return;
      }
      // add to BCF viewpoint if necessary
      for (let object of data.objects) {
        if (object.userData.ifcId) {
          this.addIfcToViewpoint(object.userData.ifcId);
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
    this.startSpacesObservers();
  }

  public detached() {
    for (let sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
    this.disposeSpacesObservers();
  }

  private initStylingService() {
    if (!this.three) {
      Container.instance.get(TaskQueue).queueTask(() => {
        this.initStylingService();
      });
      return;
    }
    this.stylingService = new ThreeStylingService(this.three);
  }

  private loadSite() {
    this.filtersOpened = false;
    this.searchOpened = false;
    this.themesOpened = false;
    this.operation = 'Loading Site';
    return ThreeSiteModel.getOneWithId(this.siteId).then((site) => {
      this.site = site;
      log.debug('this.site', site);
      for (let space of this.site.spaces) {
        this.selectedSpaces.push(space.id);
      }
      this.operation = 'Loading Objects';
      this.loadThemes();
      if (this.global.state.swissdata.authenticated) {
        this.setBcfProjectAndCreateOneIfNone();
      }
      return ThreeSiteModel.getSiteJson(this.siteId);
    }).then((json) => {
      this.operation = 'Building Scene';
      this.three.objects.setShowEdges(true);
      return this.three.objects.loadJSON(json, {calculateOffsetCenter: 'never'});
    }).then(() => {

      setTimeout(() => {
        const generator = new ThreeGenerator();
        const spaceMaterial = new THREE.MeshBasicMaterial({color: '#337ab7'});
        for (let space of this.site.spaces || []) {
          const mesh = generator.space2mesh(space, spaceMaterial, 0.01, {alwaysUseDefaultHeight: true});
          if (mesh) {
            (mesh as any).__ignoreEdges = true;
            this.three.objects.addObject(mesh);
          }
        }
        this.initTerrainTrick();
      }, 300);

      this.three.getScene().traverse((object) => {
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
      this.three.navigation.zoomOnScene(1);
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

        this.select.setType('select');
      }, 200);
    }).catch(errorify).finally(() => {
      this.operation = '';
      this.requestApplyFilters();
    });
  }

  public setBcfProjectAndCreateOneIfNone() {
    if (!this.bcf.state.bcf.loggedIn || !this.site) {
      setTimeout(() => {
        this.setBcfProjectAndCreateOneIfNone();
      }, 200);
      return;
    }
    if (this.site.bcfProjectId) {
      BcfServices.project.getProject(this.site.bcfProjectId).then((project) => {
        this.bcfProject = project;
      });
    } else {
      BcfServices.project.createProject({name: `BCF for Site ${this.site.name}`}).then((project) => {
        this.bcfProject = project;
        this.site.bcfProjectId = project.project_id;
        this.site.updateProperties('', ['bcfProjectId']);
      });
    }
  }

  public home() {
    this.three.navigation.zoomOnScene(1, '3d', true);
  }

  private loadThemes() {
    if (!this.siteId) {
      this.themes = [];
      return Promise.resolve();
    }
    return this.loadStyles().then(() => {
      return ThreeThemeModel.getAll(`?siteId=${this.siteId}`)
    }).then((themes) => {
      this.themes = themes;
    }).catch(errorify).finally(() => {
      this.setFirstTheme();
    })
  }

  private setFirstTheme() {
    if (this.themes.length) {
      let selectedTheme = false;
      for (let index in this.themes) {
        if (this.themes[index].name === this.themeAtLoading) {
          this.selectTheme(this.themes[index]);
          selectedTheme = true;
          this.themeAtLoading = '';
          this.global.router.navigateToRoute('viewer', {siteId: this.siteId});
        }
      }
      if (!selectedTheme) {
        this.selectTheme(this.themes[0]);
      }
    }
  }

  private loadStyles() {
    if (!this.siteId) {
      this.themes = [];
      return Promise.resolve();
    }
    return ThreeStyleModel.getAll(`?siteId=${this.siteId}`).then((styles) => {
      this.styles = styles;
    }).catch(errorify);
  }

  public selectTheme(theme: ThreeThemeModel) {
    if (this.select) {
      this.select.clearSelectionStyle();
    }
    if (this.themes.indexOf(theme) !== -1) {
      theme.updateTheme(this.styles);
      if (this.stylingService.currentThemeName !== theme.name) {
        this.selectedTheme = theme;
        this.stylingService.activate(this.selectedTheme.theme);
      } else {
        this.selectedTheme = undefined;
        this.stylingService.clearTheme();
      }
    }
    if (this.select) {
      this.select.applySelectionStyles();
    }
    this.requestApplyFilters();
  }

  public toggleThemes() {
    this.searchOpened = false;
    this.filtersOpened = false;
    this.bcfOpened = false;
    this.zoneSelectorOpened = false;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    this.themesOpened = !this.themesOpened;
  }

  public toggleSearch() {
    this.themesOpened = false;
    this.filtersOpened = false;
    this.bcfOpened = false;
    this.zoneSelectorOpened = false;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    this.searchOpened = !this.searchOpened;
  }

  public toggleFilters() {
    this.themesOpened = false;
    this.searchOpened = false;
    this.bcfOpened = false;
    this.zoneSelectorOpened = false;
    this.filtersOpened = !this.filtersOpened;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    if (this.filtersOpened && this.filters.length === 0) {
      this.addConditionFilter();
    }
  }

  public toggleBcf() {
    this.themesOpened = false;
    this.searchOpened = false;
    this.filtersOpened = false;
    this.zoneSelectorOpened = false;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    this.bcfOpened = !this.bcfOpened;
  }

  public toggleZoneSelector() {
    this.themesOpened = false;
    this.searchOpened = false;
    this.filtersOpened = false;
    this.bcfOpened = false;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    this.zoneSelectorOpened = !this.zoneSelectorOpened;
  }

  public toggleSlicingTool() {
    if (this.toolsService.currentToolName === 'slice') {
      this.deactiveSlicingTool();
    } else {
      this.activeSlicingTool();
    }
  }

  public activeSlicingTool() {
    this.themesOpened = false;
    this.searchOpened = false;
    this.filtersOpened = false;
    this.bcfOpened = false;
    this.explorerOpened = false;
    this.sliceToolOpened = false;
    this.deactiveSlicingTool();
    this.zoneSelectorOpened = false;
    this.sliceToolOpened = true;
    if (this.toolsService.currentToolName !== 'slice') {
      this.slice.toggleSliceTool();
      this.slice.toggleSlicing(true);
      this.slice.setPlane('Y');
    }
  }

  public deactiveSlicingTool() {
    if (this.toolsService.currentToolName === 'slice') {
      // this.slice.toggleSliceTool();
      this.select.setType('select');
    }
  }

  public activeMeasuringTool() {
    if (this.toolsService.currentToolName !== 'measure') {
      this.measure.toggleMeasureTool(this.select);
    }
  }

  public toggleMeasuringTool() {
    this.measure.toggleMeasureTool(this.select);
  }

  public deactiveMeasuringTool() {
    if (this.toolsService.currentToolName === 'measure') {
      this.measure.toggleMeasureTool(this.select);
    }
  }

  public clearSlicing() {
    if (this.toolsService.currentToolName === 'slice') {
      this.slice.toggleSliceTool();
    }
    this.slice.toggleSlicing(false);
    this.select.setType('select');
  }

  public qChanged() {
    this.requestApplyFilters();
  }

  private requestApplyFiltersTimeout;
  public requestApplyFilters(timeout: number = 300) {
    if (this.requestApplyFiltersTimeout) {
      clearTimeout(this.requestApplyFiltersTimeout);
    }
    this.requestApplyFiltersTimeout = setTimeout(() => {
      this.applyFilters();
    }, timeout);
  }

  public clearSearch() {
    log.debug('clearSearch');
    this.q = '';
    this.searchOpened = false;
  }

  public filterOutObject(object: THREE.Object3D) {
    if (object.userData.ifcId) {
      this.filters.push({key: 'userData.ifcId', type: '!=', value: object.userData.ifcId});
    } else {
      if (object.userData.ifcId) {
        this.filters.push({key: 'uuid', type: '!=', value: object.uuid});
      }
    }
    this.requestApplyFilters();
  }

  public clearAllFilters() {
    this.filters = [];
    this.requestApplyFilters();
    this.toggleFilters();
  }

  public addConditionFilter() {
    this.filters.push({key: '', type: '=', value: ''});
  }

  public removeConditionFilter(index: number) {
    this.filters.splice(index, 1);
    this.requestApplyFilters();
  }

  public setConditionType(filter: Filter, type: '<' | '>' | '=' | '!=') {
    filter.type = type;
    this.requestApplyFilters();
  }

  public conditionKeyHelpList(filter: Filter) {
    let options: ArDialogPromptOption[] = [];
    // options.push({value: 'uuid', label: 'uuid'});
    // options.push({value: 'name', label: 'name'});
    // options.push({value: 'type', label: 'type'});
    // options.push({value: 'parent.uuid', label: 'parent.uuid'});
    // options.push({value: 'parent.type', label: 'parent.type'});
    // options.push({value: 'parent.name', label: 'parent.name'});
    // options.push({value: 'position.x', label: 'position.x'});
    // options.push({value: 'position.y', label: 'position.y'});
    // options.push({value: 'position.z', label: 'position.z'});
    // options.push({value: 'visible', label: 'visible'});
    // options.push({value: 'geometry.uuid', label: 'geometry.uuid'});
    // options.push({value: 'geometry.type', label: 'geometry.type'});
    // options.push({value: 'geometry.name', label: 'geometry.name'});
    // options.push({value: 'material.uuid', label: 'material.uuid'});
    // options.push({value: 'material.type', label: 'material.type'});
    // options.push({value: 'material.name', label: 'material.name'});

    if (this.three && this.three instanceof ThreeCustomElement) {
      let userDataKeys: Array<string> = [];
      this.three.getScene().traverse((obj) => {
        let newKeys = Object.keys(obj.userData).filter(i => !userDataKeys.includes(i) && i !== 'pset');
        userDataKeys.push(...newKeys);
        if (obj.userData.pset && typeof obj.userData.pset === 'object') {
          let newKeys = Object.keys(obj.userData.pset).map(i => `pset.${i}`).filter(i => !userDataKeys.includes(i) && i !== 'pset');
          userDataKeys.push(...newKeys);
        }
      });
      for (let key of userDataKeys) {
        options.push({value: `userData.${key}`, label: `userData.${key}`});
      }
    }

    let dialog = arDialog({title: 'Key List', type: 'prompt', promptOptions: options});
    dialog.whenClosed().then((result) => {
      if (!result.dismissed && result.value) {
        filter.key = result.value;
        this.requestApplyFilters()
      }
    })
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

  public conditionValueHelpList(filter: Filter) {
    let options: ArDialogPromptOption[] = [];
    
    if (this.three && this.three instanceof ThreeCustomElement) {
      let values: Array<string> = [];
      this.three.getScene().traverse((obj) => {
        let value = resolvePath(obj, this.preparePathKey(filter.key));
        if (values.indexOf(value) === -1) {
          values.push(value);
        }
      });
      for (let value of values) {
        options.push({value: `${value}`, label: `${value}`});
      }
    }

    let dialog = arDialog({title: 'Value List', type: 'prompt', promptOptions: options});
    dialog.whenClosed().then((result) => {
      if (!result.dismissed && result.value) {
        filter.value = result.value;
        this.requestApplyFilters();
      }
    })
  }

  private applyFilters() {
    if (!this.three) return;
    if (!this.three.getScene()) return;
    const q = this.q.toLowerCase().trim();
    log.debug('applying filters');
    this.three.getScene().traverse((object) => {
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
    });
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
      if (filter.type === '=') {
        if (value != filter.value) {
          return false;
        }
      } else if (filter.type === '!=') {
        if (value == filter.value) return false;
      } else if (filter.type === '<') {
        if (value > filter.value) return false;
      } else if (filter.type === '>') {
        if (value < filter.value) return false;
      } else if (filter.type === '*') {
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

  public startNewBcfTopic() {
    this.bcfView = 'new-topic';
  }

  public cancelNewBcfTopic() {
    this.bcfView = 'topics-list';
  }

  public saveNewBcfTopic() {
    BcfServices.topic.createTopic(this.bcfProject.project_id, this.bcfNewTopicInstance).then((topic) => {
      this.bcfNewCommentInstance._topicId = topic.guid;
      if (this.bcfNewCommentInstance.comment) {
        return BcfServices.comment.createComment(this.bcfProject.project_id, topic.guid, this.bcfNewCommentInstance);
      } else {
        return Promise.resolve();
      }
    }).then((comment) => {
      return BcfServices.topic.getTopics(this.bcfProject.project_id);
    }).then(() => {
      this.bcfView = 'topics-list';
    }).catch(errorify);
  }

  public openTopic(event) {
    if (event.detail?.guid) {
      this.bcfTopic = event.detail;
      this.bcfView = 'topic';
    }
  }

  public backToBcfList () {
    this.bcfView = 'topics-list';
    this.bcfTopic = undefined;
  }

  public editTopic() {

  }

  scrollContainer: HTMLElement;
  bcfAddComment: boolean = false;
  bcfEditComment: boolean = false;
  bcfViewpointInstance: BcfViewpointInterface;
  saveBcfViewpointWithComment: boolean = true;
  viewpointSnapshotObserver: Subscription | null;
  public addComment() {
    this.bcfAddComment = true;
    this.bcfEditComment = false;
    // this.bcfSelectObjectActive = false;
    this.bcfNewCommentInstance = {guid: '', comment: ''};
    this.bcfViewpointInstance = {guid:'', components: {selection: []}};
    this.bcfViewpointInstance.snapshot = {
      snapshot_type: 'png',
      snapshot_data: this.three.getSnapshot('png')
    };
    this.viewpointSnapshotObserver = this.global.subscribe('three-camera:moved', () => {
      this.bcfViewpointInstance.snapshot = {
        snapshot_type: 'png',
        snapshot_data: this.three.getSnapshot('png')
      };
    });
    this.saveBcfViewpointWithComment = true;

    if (this.select.objects.length !== 0) {
      for (let object of this.select.objects) {
        if (object.userData.ifcId) {
          this.addIfcToViewpoint(object.userData.ifcId)
        }
      }
    }

    if (this.scrollContainer instanceof HTMLElement) {
      Container.instance.get(TaskQueue).queueTask(() => {
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
      });
    }
    this.global.container.get(TaskQueue).queueMicroTask(() => {
      const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
      if (textarea instanceof HTMLElement) {
        textarea.focus();
      }
    });
  }

  public editComment(event: {detail: {comment: BcfCommentInterface, viewpoint: BcfViewpointInterface}}) {
    const bcfCommentInstance: BcfCommentInterface = event.detail.comment;
    const bcfViewpointInstance: BcfViewpointInterface = event.detail.viewpoint;
    if (bcfViewpointInstance) {
      this.highlightViewpoint(bcfViewpointInstance);
    }
    this.global.container.get(TaskQueue).queueTask(() => {
      this.bcfAddComment = false;
      this.bcfEditComment = true;
      const hasSnapshot = bcfViewpointInstance !== undefined && bcfViewpointInstance.snapshot !== undefined && bcfViewpointInstance.snapshot.snapshot_data !== undefined;
      this.bcfNewCommentInstance = bcfCommentInstance;
      this.bcfViewpointInstance = bcfViewpointInstance || {guid:'', components: {selection: []}};
      this.viewpointSnapshotObserver = this.global.subscribe('three-camera:moved', () => {
        this.bcfViewpointInstance.snapshot = {
          snapshot_type: 'png',
          snapshot_data: this.three.getSnapshot('png')
        };
      });
      this.saveBcfViewpointWithComment = hasSnapshot;

      if (this.scrollContainer instanceof HTMLElement) {
        Container.instance.get(TaskQueue).queueTask(() => {
          this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
        });
      }
      this.global.container.get(TaskQueue).queueMicroTask(() => {
        const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
        if (textarea instanceof HTMLElement) {
          textarea.focus();
        }
      });
    });
  }

  public cancelNewBcfComment() {
    this.bcfAddComment = false;
    this.bcfEditComment = false;
    this.bcfNewCommentInstance = undefined;
    this.bcfViewpointInstance = undefined;
    this.clearViewpointHighlight();
    this.viewpointSnapshotObserver.dispose();
    this.viewpointSnapshotObserver = null;
  }

  public async saveNewBcfComment() {
    if (this.select.hasSelection) {
      this.select.none();
    }
    this.toolsService.deactivateAll();
    if (!this.bcfNewCommentInstance.comment) {
      errorify(new Error('You must write a comment before saving'), {timeout: 2000});
      const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
      if (textarea instanceof HTMLElement) {
        textarea.focus();
      }
      return;
    }
    let viewpointPromise = Promise.resolve();
    const position = this.three.getCamera().position;
    const direction = this.three.getCamera().getWorldDirection(new THREE.Vector3);
    const up = this.three.getCamera().up;
    const zoom = (this.three.getCamera() as THREE.OrthographicCamera).zoom;
    this.bcfViewpointInstance.orthogonal_camera = {
      camera_view_point: position,
      camera_direction: direction,
      camera_up_vector: up,
      view_to_world_scale: zoom
    };
    const clippingPlanes = (this.three.getRenderer() as THREE.WebGLRenderer).clippingPlanes || [];
    this.bcfViewpointInstance.clipping_planes = clippingPlanes.map((plane: THREE.Plane) => {
      return {
        location: plane.normal.clone().setLength(plane.constant),
        direction: plane.normal 
      };
    });
    // TODO: when the slice tool will have proper slicePosition() and sliceOrientation()
    // we will use these methods to save the slicing
    // if (this.slice.isSlicing) {
    //   this.bcfViewpointInstance.clipping_planes = [{
    //     location: this.slice.slicePosition(),
    //     direction: this.slice.sliceOrientation()
    //   }];
    // }
    
    if (this.saveBcfViewpointWithComment && this.bcfAddComment) {
      viewpointPromise = BcfServices.viewpoint.createViewpoint(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfViewpointInstance).then((viewpoint) => {
        this.bcfNewCommentInstance.viewpoint_guid = viewpoint.guid;
      });
    }
    if (this.saveBcfViewpointWithComment && this.bcfEditComment) {
      viewpointPromise = BcfServices.viewpoint.editViewpoint(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfViewpointInstance.guid, this.bcfViewpointInstance).then((viewpoint) => {
        this.bcfNewCommentInstance.viewpoint_guid = viewpoint.guid;
      });
    }
    if (!this.saveBcfViewpointWithComment && this.bcfEditComment && this.bcfViewpointInstance.guid) {
      viewpointPromise = BcfServices.viewpoint.deleteViewpoint(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfViewpointInstance.guid).then(() => {
        delete this.bcfNewCommentInstance.viewpoint_guid;
      });
    }
    return viewpointPromise.then(() => {
      if (this.bcfAddComment) {
        return BcfServices.comment.createComment(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfNewCommentInstance)
      } else if (this.bcfEditComment) {
        return BcfServices.comment.editComment(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfNewCommentInstance.guid, this.bcfNewCommentInstance)
      } else {
        throw new Error('Operation unknown');
      }
    }).then((comment) => {
      this.bcfAddComment = false;
      this.bcfEditComment = false;
      this.bcfNewCommentInstance = undefined;
      this.bcfViewpointInstance = undefined;
      this.viewpointSnapshotObserver.dispose();
    this.viewpointSnapshotObserver = null;
      // this.bcfSelectObjectActive = false;
    }).catch(errorify).finally(() => {
      this.clearViewpointHighlight();
    });
  }

  public startNewBcfViewpoint() {
    this.bcfViewpointInstance = {
      guid:'',
      components: {
        selection: []
      }
    };
  }


  public addIfcToViewpoint(ifcGuid: string) {
    if (!this.bcfViewpointInstance?.components?.selection) return;
    for (let component of this.bcfViewpointInstance.components.selection) {
      if (component.ifc_guid === ifcGuid) {
        return; // prevent adding twice the same object
      }
    }
    this.bcfViewpointInstance.components.selection.push({ifc_guid: ifcGuid});
    const event = {
      detail: this.bcfViewpointInstance
    };
    this.highlightViewpoint(event);
    this.bcfViewpointInstance.snapshot = {
      snapshot_type: 'png',
      snapshot_data: this.three.getSnapshot('png')
    };
  }

  public removeIfcFromViewpoint(ifcGuid: string) {
    if (!this.bcfViewpointInstance?.components?.selection) return;
    let index = -1;
    for (let i in this.bcfViewpointInstance.components.selection) {
      if (this.bcfViewpointInstance.components.selection[i].ifc_guid === ifcGuid) {
        index = parseInt(i, 10);
        break;
      }
    }
    if (index !== -1) {
      this.bcfViewpointInstance.components.selection.splice(index, 1);
    }
    const event = {
      detail: this.bcfViewpointInstance
    };
    this.highlightViewpoint(event);
    this.bcfViewpointInstance.snapshot = {
      snapshot_type: 'png',
      snapshot_data: this.three.getSnapshot('png')
    };
  }

  public startEditTopic() {
    if (!this.bcfTopic) return;
    this.bcfView = 'edit-topic';
  }

  public cancelEditTopic() {
    this.bcfView = 'topic';
    BcfServices.topic.getTopic(this.bcfProject.project_id, this.bcfTopic.guid);
    this.clearViewpointHighlight();
  }

  public saveEditedTopic() {
    return BcfServices.topic.editTopic(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfTopic).then((comment) => {
      this.bcfView = 'topic';
    }).catch(errorify).finally(() => {
      this.clearViewpointHighlight();
    });
  }

  
  public bcfViewpointHighlighted: boolean = false;
  public highlightViewpoint(eventOrViewpoint: {detail: BcfViewpointInterface} | BcfViewpointInterface) {
    if (this.select.hasSelection) {
      this.select.none();
    }
    this.toolsService.deactivateAll();
    const viewpoint: BcfViewpointInterface = (eventOrViewpoint as any).detail !== undefined ? (eventOrViewpoint as any).detail : eventOrViewpoint;
    
    if (viewpoint?.orthogonal_camera) {
      const camera = this.three.getCamera() as THREE.OrthographicCamera;
      const position = viewpoint.orthogonal_camera.camera_view_point;
      const direction = viewpoint.orthogonal_camera.camera_direction;
      const up = viewpoint.orthogonal_camera.camera_up_vector;
      const zoom = viewpoint.orthogonal_camera.view_to_world_scale;
      camera.position.set(position.x, position.y, position.z);
      camera.up.set(up.x, up.y, up.z);
      camera.zoom = zoom;
      const lookAt: THREE.Vector3 = new THREE.Vector3(direction.x, direction.y, direction.z).sub(camera.position);
      camera.lookAt(lookAt);

      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      this.three.requestRendering();
    }
    if (viewpoint.clipping_planes && viewpoint.clipping_planes.length > 0) {
      const plane = new THREE.Plane();
      const direction = viewpoint.clipping_planes[0].direction;
      const location = viewpoint.clipping_planes[0].location;
      const {normal, constant} = ThreeUtils.planePositionDirectionToConstantNormal(new THREE.Vector3(location.x, location.y, location.z), new THREE.Vector3(direction.x, direction.y, direction.z));
      plane.normal = normal;
      plane.constant = constant;
      (this.three.getRenderer() as THREE.WebGLRenderer).clippingPlanes = [plane];
      // TODO: when the slice tool will have proper slicePosition() and sliceOrientation()
      // as setters we will use these methods to bring back the slicing
      // instead of using the clippingPlanes attributes of the renderer
    }
    if (viewpoint?.components?.selection?.length) {
      const ifcIds = viewpoint.components.selection.map(component => component.ifc_guid);
      this.three.getScene().traverse((obj) => {
        if (obj instanceof THREE.Mesh && ifcIds.indexOf(obj.userData.ifcId) !== -1) {
          this.select.addObjectsToSelection([obj]);
        }
      });
    }
    this.select.setType('select');
  }

  public clearViewpointHighlight() {
    this.select.none();
    this.select.setType('select');
  }

  public exportBcf() {
    this.global.swissdataApi.get(`/bcf/2.1/projects/${this.bcfProject.project_id}/export-file`).then((response: Response) => {
      return response.blob();
    }).then((value) => {
      FileSaver.saveAs(value, `${this.bcfProject.name}.bcf`);
    });
  }

  public hasUnclassified: Array<string> = [];
  public selectedUnclassified: Array<string> = [];
  public selectedSpaces: Array<string> = [];
  public displaySpacesForStoreys: {[key: string]: boolean} = {};

  private observers: Array<Disposable> = [];
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

  public selectedBuildings: Array<string> = [];
  public selectedStoreys: Array<string> = [];
  public indeterminateBuildings: Array<string> = [];
  public indeterminateStoreys: Array<string> = [];

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


  originalGeometry: THREE.BufferGeometry;
  terrainObj: THREE.Mesh;
  axisX = 0;
  axisY = 0;
  axisZ = 0;
  angle = Math.PI / 2;

  public initTerrainTrick() {
    this.three.addAxis();
    this.three.getScene().traverse((obj) => {
      if (obj.name === 'VRMb$TMZQ_ihUOkbYn11Tg' && obj instanceof THREE.Mesh) {
        this.terrainObj = obj;
      }
    });
    if (this.terrainObj) {
      const geometry = this.terrainObj.geometry;
      if (geometry instanceof THREE.BufferGeometry) {
        this.originalGeometry = geometry.clone();
        (window as any).matrix = new THREE.Matrix4();
        (window as any).loc = new THREE.Vector3(2499309.62, 1117675.73, 0);
        (window as any).refDirection = new THREE.Vector3(0.970716481578189, 0.240228042477269, 0);
        (window as any).refDirection2 = new THREE.Vector3(0.970716481578189, 0, 0.240228042477269);
        (window as any).axis = new THREE.Vector3(0, 0, 1);
      }
    }
  }

  public backToPosition() {
    if (this.originalGeometry && this.terrainObj) {
      this.terrainObj.geometry = this.originalGeometry;
      (window as any).matrix = new THREE.Matrix4();
    }
  }

  public applyMatrix() {
    console.log('applyMatrix', (window as any).matrix);
    if (!(window as any).matrix) {
      errorify(new Error('Missing matrix'));
      return;
    }
    if (!this.terrainObj || !this.originalGeometry) {
      errorify(new Error('Missing terrain or originalGeometry'));
      return;
    }
    const newGeometry = this.originalGeometry.clone();
    newGeometry.applyMatrix((window as any).matrix);
    this.terrainObj.geometry = newGeometry;
  }

  public applyRotMatrix() {
    console.log('applyRotmatrix');
    (window as any).matrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(this.axisX, this.axisY, this.axisZ), this.angle);
    this.applyMatrix();
  }

}

export interface Filter {
  key: string;
  type: '=' | '<' | '>' | '!=' | '*';
  value: string | number | Date;
}

export class FilterBuildingValueConverter {
  public toView(storeys: Array<ThreeStorey>, building: ThreeBuilding): Array<ThreeStorey> {
    return storeys;
  }
}

export class FilterStoreyValueConverter {
  public toView(spaces: Array<ThreeSpace>, storey: ThreeStorey): Array<ThreeSpace> {
    return spaces.filter(s => s.storeyIds.includes(storey.id));
  }
}
