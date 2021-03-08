import { AtvToolbarPanel } from './../atv-toolbar-panel';
import { AureliaBcf, BcfServices, BcfProjectInterface, BcfTopicInterface, BcfCommentInterface, BcfViewpointInterface, store } from 'aurelia-bcf';
import { AtvGlobal } from './../../global';
import { inject, bindable, customElement, TaskQueue } from 'aurelia-framework';
import { errorify, notify } from 'aurelia-resources'
import { UxModalService } from '@aurelia-ux/modal';
import { Subscription } from 'aurelia-event-aggregator';
import { ThreeGenerator, ThreeUtils } from 'aurelia-three';
import * as THREE from 'three';
import * as FileSaver from 'file-saver';

// TODO: add url support to quickly open a topic or comment
// topic: 5f9c2811570aa81dcbf64825
// comment: 5f9c2976570aa81dcbf6482f

@customElement('atv-toolbar-panel-bcf-editor')
@inject(Element, AtvGlobal, UxModalService, AureliaBcf)
export class AtvToolbarPanelBcfEditor {

  private bcfProject: BcfProjectInterface;
  private bcfTopic: BcfTopicInterface;
  private bcfView: 'topics-list' | 'new-topic' | 'topic' | 'edit-topic' = 'topics-list';
  private bcfNewTopicInstance: BcfTopicInterface;
  private bcfNewCommentInstance: BcfCommentInterface;
  private subscriptions: Subscription[] = [];

  @bindable public panel: AtvToolbarPanel;

  public constructor(private element: HTMLElement, private atv: AtvGlobal, private modalService: UxModalService, private bcf: AureliaBcf) {

  }

  public attached() {
    if (this.atv.global.state.swissdata.authenticated) {
      this.bcf.authenticate(this.atv.global.state.swissdata.accessToken, this.atv.global.state.swissdata.refreshToken);
    }
    this.subscriptions.push(this.atv.subscribe('atv-site-loaded', (_site) => {
      this.backToBcfList();
      this.setBcfProjectAndCreateOneIfNone();
    }));
    this.subscriptions.push(this.atv.subscribe('swissdata:logout', () => {
      this.backToBcfList();
    }));
    this.subscriptions.push(this.atv.subscribe('swissdata:login', () => {
      this.bcf.authenticate(this.atv.global.state.swissdata.accessToken, this.atv.global.state.swissdata.refreshToken);
    }));
    // this.subscriptions.push(this.atv.subscribe('three-selection:changed', (data) => {
    //   // add to BCF viewpoint if necessary
    //   for (let object of data.objects) {
    //     if (object.userData.ifcId) {
    //       this.addIfcToViewpoint(object.userData.ifcId);
    //     }
    //   }
    // }));
    if (this.atv.siteService.site) {
      this.setBcfProjectAndCreateOneIfNone();
    }
    const search = location.search;
    let autoOpenTopicId = '';
    let autoOpenCommentId = '';
    if (search && search.substr(0, 1) === '?') {
      const searchParts = search.substr(1).split('&');
      for (const part of searchParts) {
        const keyValue = part.split('=');
        const key = keyValue[0];
        const value = keyValue[1];
        if (key === 'topic') {
          autoOpenTopicId = value;
        }
        if (key === 'comment') {
          autoOpenCommentId = value;
        }
      }
    }
    this.subscriptions.push(this.atv.subscribeOnce('bcf:fetched-topics', (data) => {
      if (data.projectId === this.atv.siteService.site.bcfProjectId) {
        for (const topic of data.topics) {
          if (topic.guid === autoOpenTopicId) {
            this.openTopic({detail: topic});
            if (this.panel) {
              this.panel.opened = true;
              if (autoOpenCommentId) {
                setTimeout(() => {
                  // bring the comment into view
                  const commentElement = document.querySelector(`[data-comment-id="${autoOpenCommentId}"]`, );
                  if (commentElement) {
                    commentElement.scrollIntoView();
                    const comment = this.bcf.state.bcf.comments.find(c => c.guid === autoOpenCommentId);
                    if (comment) {
                      if (comment.viewpoint_guid) {
                        const viewpoint = this.bcf.state.bcf.viewpoints.find(v => v.guid === comment.viewpoint_guid);
                        if (viewpoint) {
                          this.highlightViewpoint(viewpoint);
                        }
                      }
                    }
                  }
                }, 200);
              }
            }
          }
        }
      }
    }));
    this.bcf.getSnapshot = () => {
      return this.atv.three.getSnapshot('png');
    }
  }

  public detached() {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }

  private setBcfProjectAndCreateOneIfNone() {
    if (this.atv.siteService.site.bcfProjectId) {
      BcfServices.project.getProject(this.atv.siteService.site.bcfProjectId).then((project) => {
        this.bcfProject = project;
      });
    } else {
      BcfServices.project.createProject({name: `BCF for Site ${this.atv.siteService.site.name}`}).then((project) => {
        this.bcfProject = project;
        this.atv.siteService.site.bcfProjectId = project.project_id;
        this.atv.siteService.site.updateProperties('', ['bcfProjectId']);
      });
    }
  }

  public startNewBcfTopic() {
    this.bcfView = 'new-topic';
  }

  public cancelNewBcfTopic() {
    this.bcfView = 'topics-list';
  }

  public async saveNewBcfTopic() {
    const hasComment = this.bcfNewCommentInstance.comment;
    const saveSnapshot = this.bcfViewpointInstance.saveSnapshot;
    const saveComponents = this.bcfViewpointInstance.saveComponents && this.bcfViewpointInstance.components?.selection?.length;
    // if (!hasComment && (saveSnapshot || saveComponents)) {
    //   errorify(new Error('You must write a comment before saving'), {timeout: 2000});
    //   const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
    //   if (textarea instanceof HTMLElement) {
    //     // textarea.focus();
    //   }
    //   return;
    // }
    try {
      const topic = await BcfServices.topic.createTopic(this.bcfProject.project_id, this.bcfNewTopicInstance);
      this.bcfNewCommentInstance._topicId = topic.guid;
      this.bcfTopic = topic;
      if (hasComment || saveSnapshot || saveComponents) {
        this.bcfAddComment = true;
        await this.saveNewBcfComment(true);
        await BcfServices.topic.getTopics(this.bcfProject.project_id);
      }
      this.bcfView = 'topic';
    } catch (error) {
      errorify(error);
    }
  }

  public openTopic(event: {detail?: BcfTopicInterface}) {
    if (event.detail?.guid) {
      this.bcfTopic = event.detail;
      this.bcfView = 'topic';
    }
  }

  public backToBcfList () {
    this.bcfView = 'topics-list';
    this.bcfTopic = undefined;
    this.bcfAddComment = false;
    this.bcfEditComment = false;
    this.bcfNewCommentInstance = undefined;
    this.bcfViewpointInstance = undefined;
  }

  public editTopic() {

  }

  scrollContainer: HTMLElement;
  bcfAddComment: boolean = false;
  bcfEditComment: boolean = false;
  bcfViewpointInstance: BcfViewpointInterface & {saveSnapshot?: boolean, saveComponents?: boolean};

  public addComment() {
    this.bcfAddComment = true;
    this.bcfEditComment = false;
    this.bcfNewCommentInstance = {guid: '', comment: ''};
    this.bcfViewpointInstance = {guid:'', components: {selection: []}};
    
    // publish this "fake" event so that the comment-form can get the current selection
    this.atv.publish('three-selection:changed', {data: this.atv.select.objects});

    if (this.scrollContainer instanceof HTMLElement) {
      this.atv.global.container.get(TaskQueue).queueTask(() => {
        this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
      });
    }
    this.atv.global.container.get(TaskQueue).queueMicroTask(() => {
      const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
      if (textarea instanceof HTMLElement) {
        textarea.focus();
      }
    });
  }

  public editComment(event: {detail: {comment: BcfCommentInterface, viewpoint: BcfViewpointInterface}}) {
    const bcfCommentInstance: BcfCommentInterface = event.detail.comment;
    const bcfViewpointInstance: BcfViewpointInterface = event.detail.viewpoint;
    this.atv.global.container.get(TaskQueue).queueTask(() => {
      this.bcfAddComment = false;
      this.bcfEditComment = true;
      this.bcfNewCommentInstance = bcfCommentInstance;
      this.bcfViewpointInstance = bcfViewpointInstance || {guid:'', components: {selection: []}};

      if (this.scrollContainer instanceof HTMLElement) {
        this.atv.global.container.get(TaskQueue).queueTask(() => {
          this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
        });
      }
      this.atv.global.container.get(TaskQueue).queueMicroTask(() => {
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
  }

  public async saveNewBcfComment(allowEmptyText = false) {
    if (this.atv.select.hasSelection) {
      this.atv.select.none();
    }
    this.atv.toolsService.deactivateAll();
    if (!this.bcfNewCommentInstance.comment && !allowEmptyText) {
      errorify(new Error('You must write a comment before saving'), {timeout: 2000});
      const textarea = document.querySelector('bcf-comment-form ux-textarea textarea');
      if (textarea instanceof HTMLElement) {
        textarea.focus();
      }
      return;
    }
    let viewpointPromise = Promise.resolve();
    const position = this.atv.three.getCamera().position;
    const direction = this.atv.three.getCamera().getWorldDirection(new THREE.Vector3);
    const up = this.atv.three.getCamera().up;
    const zoom = (this.atv.three.getCamera() as THREE.OrthographicCamera).zoom;
    this.bcfViewpointInstance.orthogonal_camera = {
      camera_view_point: position,
      camera_direction: direction,
      camera_up_vector: up,
      view_to_world_scale: zoom
    };
    const clippingPlanes = (this.atv.three.getRenderer() as THREE.WebGLRenderer).clippingPlanes || [];
    this.bcfViewpointInstance.clipping_planes = clippingPlanes.map((plane: THREE.Plane) => {
      return {
        location: plane.normal.clone().setLength(plane.constant),
        direction: plane.normal 
      };
    });
    
    const saveSnapshot = this.bcfViewpointInstance.saveSnapshot;
    const saveComponents = this.bcfViewpointInstance.saveComponents && this.bcfViewpointInstance.components?.selection?.length;
    const saveViewpoint = saveSnapshot || saveComponents;
    this.bcfViewpointInstance.components = this.bcfViewpointInstance.saveComponents ? this.bcfViewpointInstance.components : {selection: []};
    this.bcfViewpointInstance.snapshot = this.bcfViewpointInstance.saveSnapshot ? this.bcfViewpointInstance.snapshot : undefined;

    if (saveViewpoint && this.bcfAddComment) {
      viewpointPromise = BcfServices.viewpoint.createViewpoint(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfViewpointInstance).then((viewpoint) => {
        this.bcfNewCommentInstance.viewpoint_guid = viewpoint.guid;
      });
    }
    if (saveViewpoint && this.bcfEditComment) {
      viewpointPromise = BcfServices.viewpoint.editViewpoint(this.bcfProject.project_id, this.bcfTopic.guid, this.bcfViewpointInstance.guid, this.bcfViewpointInstance).then((viewpoint) => {
        this.bcfNewCommentInstance.viewpoint_guid = viewpoint.guid;
      });
    }
    if (!saveViewpoint && this.bcfEditComment && this.bcfViewpointInstance.guid) {
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
    if (this.atv.select.hasSelection) {
      this.atv.select.none();
    }
    this.atv.toolsService.deactivateAll();
    const viewpoint: BcfViewpointInterface = (eventOrViewpoint as any).detail !== undefined ? (eventOrViewpoint as any).detail : eventOrViewpoint;
    if (viewpoint?.orthogonal_camera) {
      const camera = this.atv.three.getCamera() as THREE.OrthographicCamera;
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
      this.atv.three.requestRendering();
    }
    if (viewpoint.clipping_planes && viewpoint.clipping_planes.length > 0) {
      const plane = new THREE.Plane();
      const direction = viewpoint.clipping_planes[0].direction;
      const location = viewpoint.clipping_planes[0].location;
      const {normal, constant} = ThreeUtils.planePositionDirectionToConstantNormal(new THREE.Vector3(location.x, location.y, location.z), new THREE.Vector3(direction.x, direction.y, direction.z));
      plane.normal = normal;
      plane.constant = constant;
      (this.atv.three.getRenderer() as THREE.WebGLRenderer).clippingPlanes = [plane];
      // TODO: when the slice tool will have proper slicePosition() and sliceOrientation()
      // as setters we will use these methods to bring back the slicing
      // instead of using the clippingPlanes attributes of the renderer
    }
    if (viewpoint?.components?.selection?.length) {
      const ifcIds = viewpoint.components.selection.map(component => component.ifc_guid);
      this.atv.three.getScene().traverse((obj) => {
        if (obj instanceof THREE.Mesh && ifcIds.indexOf(obj.userData.ifcId) !== -1) {
          this.atv.select.addObjectsToSelection([obj]);
        }
      });
    }
    this.atv.select.setType('select');
    this.atv.select.applySelectionStyles();
  }

  public clearViewpointHighlight() {
    this.atv.select.none();
    this.atv.select.setType('select');
  }

  public exportBcf() {
    this.atv.global.swissdataApi.get(`/bcf/2.1/projects/${this.bcfProject.project_id}/export-file`).then((response: Response) => {
      return response.blob();
    }).then((value) => {
      FileSaver.saveAs(value, `${this.bcfProject.name}.bcf`);
    });
  }
  
}
