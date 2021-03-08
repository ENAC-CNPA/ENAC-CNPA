import { FrameworkConfiguration } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';

export function configure(config: FrameworkConfiguration) {
  config.globalResources([
    PLATFORM.moduleName('./components/panels/theme-editor/atv-theme-rule-editor'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-bcf-editor'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-checker-output'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-checkers'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-search'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-separator.html'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-site-selector'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-theme-selector'),
    PLATFORM.moduleName('./components/panels/atv-toolbar-panel-zone-selector'),
    PLATFORM.moduleName('./components/tools/atv-tool-measure'),
    PLATFORM.moduleName('./components/tools/atv-tool-slice'),
    PLATFORM.moduleName('./components/atv-information-panel'),
    PLATFORM.moduleName('./components/atv-operation-bar'),
    PLATFORM.moduleName('./components/atv-toolbar-button'),
    PLATFORM.moduleName('./components/atv-toolbar-panel'),
    PLATFORM.moduleName('./components/atv-toolbar'),
    PLATFORM.moduleName('./dialogs/atv-style-dialog'),
    PLATFORM.moduleName('./dialogs/atv-theme-dialog'),
    PLATFORM.moduleName('./value-converters/atv-filter-building'),
    PLATFORM.moduleName('./value-converters/atv-filter-storey'),
  ]);
}
