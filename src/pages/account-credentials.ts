import {inject} from 'aurelia-framework';
import { Global } from 'global';
import { getLogger, Logger } from 'aurelia-logging';

@inject(Global)
export class AccountCredentials {    

  private log: Logger;
  
  constructor(private global: Global) {
    this.log = getLogger('page:account-credentials');
  }
}
