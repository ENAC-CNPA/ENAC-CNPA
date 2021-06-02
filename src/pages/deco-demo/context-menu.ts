import { ContextMenuAction } from './context-menu-service';

export class ContextMenu {

  public title: string;
  public actions: ContextMenuAction[];


  public canActivate(params: any) {
    // validate config
  }

  public activate(params: any) {
    this.title = params.title ? params.title : '';
    this.actions = params.actions || [];
  }

}
