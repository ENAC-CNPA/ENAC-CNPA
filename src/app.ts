import { Global } from './global';
import { inject } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { ArDrawer, addNotifyContainerAlias, setNotifyDefaults } from 'aurelia-resources';
import routes from './routes';
import settings from './settings';
import { AuthorizeStep } from 'aurelia-deco';
import { BaseApp } from 'base/base-app';
import * as FastClick from 'fastclick';
import { StyleEngine } from '@aurelia-ux/core';
import { UxInputTheme } from '@aurelia-ux/input';

@inject(Global, Router, StyleEngine)
export class App extends BaseApp {

  menuDrawer: ArDrawer;
  bottomDrawerExempleDrawer: ArDrawer;

  public toolbarTopOpened: boolean = false;

  private handleResize: EventListener;

  constructor(private global: Global, private router: Router, private styleEngine: StyleEngine) {
    super();
    this.handleResize = e => {
    };
    addNotifyContainerAlias('top', '.notify-top-host');
    addNotifyContainerAlias('bottom', '.notify-bottom-host');
    setNotifyDefaults({
      containerSelector: '.notify-top-host'
    });
    const inputTheme: UxInputTheme = {
      themeKey: "input",
      borderRadius: '0px'
    };
    this.styleEngine.applyTheme(inputTheme, document.body);
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
 