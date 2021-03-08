import { Global } from './global';
import { inject } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { ArDrawer, addNotifyContainerAlias, setNotifyDefaults } from 'aurelia-resources';
import routes from './routes';
import settings from './settings';
import { AuthorizeStep } from 'aurelia-swissdata';
import { BaseApp } from 'base/base-app';
import * as FastClick from 'fastclick';

@inject(Global, Router)
export class App extends BaseApp {

  menuDrawer: ArDrawer;
  bottomDrawerExempleDrawer: ArDrawer;

  public toolbarTopOpened: boolean = false;

  private handleResize: EventListener;

  constructor(private global: Global, private router: Router) {
    super();
    this.handleResize = e => {
    };
    addNotifyContainerAlias('top', '.notify-top-host');
    addNotifyContainerAlias('bottom', '.notify-bottom-host');
    setNotifyDefaults({
      containerSelector: '.notify-top-host'
    });
  }

  public attached() {
    this.handleResize(null);
    window.addEventListener('resize', this.handleResize);
    (FastClick as any).attach(document.body);
  }

  public detached() {
    window.removeEventListener('resize', this.handleResize);
  }

  configureRouter(config: RouterConfiguration) {
    AuthorizeStep.redirectUnauthenticatedTo = settings.defaultRoutes.unauthenticated;
    if (!(window as any).cordova) config.options.pushState = true;
    config.addAuthorizeStep(AuthorizeStep);
    config.map(routes);
  }

}
 