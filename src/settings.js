var settings = {
  title: 'POC-OAC Viewer',
  description: 'Project description',
  keywords: "Project keywords",
  author: "Project Author",
  stateVersion: '1.0',
  stateLog: {
    dispatchedActions: 'debug',
    performanceLog: 'debug',
    devToolsStatus: 'debug'
  },
  language: 'fr',
  languages: ['fr'],
  country: 'CH',
  countries: ['CH'],
  stateStorageKey: 'bimetat-state',
  defaultRoutes: {
    unauthenticated: 'login',
    authenticated: 'home'
  },
  ux: {
    design: {
      primary: '#337ab7',
      primaryForeground: '#fff',
      accent:  '#333333',
      accentForeground: '#fff',

      primaryLight: '#6ca9ea',
      primaryLightForeground: '#000',
      primaryDark: '#004e87',
      primaryDarkForeground: '#fff',

      accentLight: '#e1e1e1',
      accentLightForeground: '#000',
      accentDark: '#b2b2b2',
      accentDarkForeground: '#333',

      appBackground: '#fff',
      appForeground: '#000',

      surfaceBackground: '#FFFFFF',
      surfaceForeground: '#212121',

      disabledBackground: '#EFEFEF',
      disabledForeground: '#BBBBBB',
      error: '#F44336',
      errorForeground: '#FFFFFF'

    }
  }
};

// auto detection of locale
if (typeof window !== `undefined`) {
  var userLang = navigator.language || navigator.userLanguage; 
  var userLang = navigator.language || navigator.userLanguage; 
  for (var index in settings.languages) {
    var language = settings.languages[index];
    if (userLang.substr(0, 2) === language) {
      settings.language = language;
      break;
    }  
  }
}

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.settings = settings;
exports.default = settings;

