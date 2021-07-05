import {PLATFORM} from 'aurelia-pal';
import {RouteConfig} from 'aurelia-router';

export let routes: Array<RouteConfig> = [
  { route: '',       name: 'home',       moduleId: PLATFORM.moduleName('pages/home') },
  { route: 'login',       name: 'login',       moduleId: PLATFORM.moduleName('pages/login-page', 'login'), settings: {auth: false} },
  { route: 'account',       name: 'account',       moduleId: PLATFORM.moduleName('pages/account', 'account'), settings: {auth: true} },
  { route: 'profile',       name: 'profile',       moduleId: PLATFORM.moduleName('pages/account-profile', 'account'), settings: {auth: true} },
  { route: 'test',       name: 'test',       moduleId: PLATFORM.moduleName('pages/test', 'test'), settings: {auth: false} },
  { route: 'credentials',       name: 'credentials',       moduleId: PLATFORM.moduleName('pages/account-credentials', 'account'), settings: {auth: true} },
  { route: 'viewer1/:siteId',       name: 'viewer',       moduleId: PLATFORM.moduleName('pages/viewer') },
  { route: 'viewer',       name: 'viewer2',       moduleId: PLATFORM.moduleName('pages/viewer2') },
  { route: 'viewer/:siteId',       name: 'viewer2-withsite',       moduleId: PLATFORM.moduleName('pages/viewer2') },
  { route: 'checker',       name: 'ifc-checker',       moduleId: PLATFORM.moduleName('pages/ifc-checker') },
  { route: 'slice',       name: 'slice',       moduleId: PLATFORM.moduleName('pages/slice') },
  { route: 'admin',       name: 'admin',       moduleId: PLATFORM.moduleName('pages/admin'), settings: {auth: true} },
  { route: 'dico2',       name: 'dico2',       moduleId: PLATFORM.moduleName('aurelia-deco/components/dico2/dico', 'dico'), settings: { auth: true } },
  { route: 'deco',       name: 'deco',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo.html') },
  { route: 'deco1',       name: 'deco1',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo1') },
  { route: 'deco2',       name: 'deco2',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo2') },
  { route: 'deco3',       name: 'deco3',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo3') },
  { route: 'deco4',       name: 'deco4',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo4') },
  { route: 'deco5',       name: 'deco5',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo5') },
  { route: 'deco6',       name: 'deco6',       moduleId: PLATFORM.moduleName('pages/deco-demo/deco-demo6') },
];

export default routes;
