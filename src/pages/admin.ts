import { inject, computedFrom } from 'aurelia-framework';
import { Global } from 'global';
import { getLogger, Logger } from 'aurelia-logging';

@inject(Global)
export class Admin {    

  private log: Logger;
  private initialSiteId: string;
  
  constructor(private global: Global) {
    this.log = getLogger('page:admin');
  }

  public activate(params: any) {
    if (params && params.siteId) {
      this.initialSiteId = params.siteId;
    }
  }

  @computedFrom('global.state.swissdata.authenticated', 'global.state.swissdata.user.roles')
  get hasAccess() {
    if (!this.global.state.swissdata?.authenticated) {
      return false;
    }
    if (!this.global.state.swissdata?.user?.roles) {
      return false;
    }
    return this.global.state.swissdata.user.roles.indexOf('admin') !== -1;
  }
}
