import { UxModalService } from '@aurelia-ux/modal';
import { UxPositioning, UxPositioningFactory } from '@aurelia-ux/positioning';
import { inject, Factory } from 'aurelia-framework';
import { ContextMenu } from './context-menu';

export interface ContextMenuAction {
  icon?: string;
  label: string; 
  callback: Function; 
  disabled?: boolean;
}

@inject(UxModalService, Factory.of(UxPositioning))
export class ContextMenuService {

  constructor(private modalService: UxModalService, private positioningFactory: UxPositioningFactory) {

  }

  public async open(anchor: HTMLElement, config: {title?: string, actions: ContextMenuAction[]}) {
    const modal = await this.modalService.open({
      viewModel: ContextMenu,
      model: config,
      position: 'absolute',
      lock: true,
      outsideDismiss: true,
      openingCallback: (contentWrapperElement: HTMLElement, overlayElement: HTMLElement) => {
        const contentElement = contentWrapperElement.querySelector('.ux-modal__content') as HTMLElement;
        const positioning = this.positioningFactory(anchor, contentElement, {
          placement: 'bottom-start',
          offsetX: 4,
          offsetY: 4,
          constraintMarginX: 8,
          constraintMarginY: 8
        });
      },
    });
    return modal;
  }

}
