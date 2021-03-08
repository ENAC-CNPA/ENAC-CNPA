import {Aurelia} from 'aurelia-framework'
import * as environment from '../config/environment.json';
import {PLATFORM} from 'aurelia-pal';
import { registerCorePlugins } from 'base/base-main';

export function configure(aurelia: Aurelia) {
  aurelia.use
    .standardConfiguration()
  registerCorePlugins(aurelia);
  aurelia.use
    .plugin(PLATFORM.moduleName('aurelia-three'))
    .plugin(PLATFORM.moduleName('aurelia-bcf'), {
      host: `${environment.swissdata.host}/bcf/2.1`, // 'http://localhost:3000/bcf/2.1',
      extendEndpoint: (url) => {
        if (url.indexOf('?') === -1) return url + `?apiKey=${environment.swissdata.apiKey}`;
        return url + `&apiKey=${environment.swissdata.apiKey}`;
      },
      ignoreDebugs: false
    })
    .feature(PLATFORM.moduleName('aurelia-three-viewer/index'))
    .feature(PLATFORM.moduleName('resources/index'));

  aurelia.use.developmentLogging(environment.debug ? 'debug' : 'warn');

  if (environment.testing) {
    aurelia.use.plugin(PLATFORM.moduleName('aurelia-testing'));
  }

  aurelia.start().then(() => aurelia.setRoot(PLATFORM.moduleName('app')));
}

