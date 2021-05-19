import { inject} from 'aurelia-framework';
import { Global } from 'global';

@inject(Global)
export class Test {    

  constructor(private global: Global) {

  }

  public activate() {

  }




}
