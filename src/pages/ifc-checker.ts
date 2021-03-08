import { notify, errorify } from 'aurelia-resources';
import { ThreeSiteModel, ThreeCheckerReportModel, CheckerFlowModel, CheckerModuleBaseModel } from 'aurelia-three';
import { CheckerModuleFilterModel, CheckerModuleExtractModel, CheckerModuleMathModel } from 'aurelia-three';
import { CheckerModuleNormalDistanceModel, CheckerModuleDistanceModel, CheckerModuleReducerModel } from 'aurelia-three';
import { CheckerModuleProjectionModel, CheckerModuleIfModel, CheckerModuleOutputModel } from 'aurelia-three';
import * as moment from 'moment';

export class IfcChecker {
  
  public step: 'welcome' | 'select-report' | 'email' | 'uploading' | 'end' = 'welcome';
  public siteId: string;
  public reports: ThreeCheckerReportModel[] = [];
  public selectedReportId: string;
  public email: string;
  public file: File;
  public uploadingFile: boolean = false;
  public operationId: string;

  private originalSiteId: string = '5f8758c25c65ee00080eb06e';
  private newReportId: string;

  public async selectIfcFile() {
    try {
      this.file = await this.inputIFCFile();
      this.reports = await this.getReports();
      this.step = 'select-report';
    } catch (error) {
      errorify(error);
      this.step = 'welcome';
    }
  }

  public async inputIFCFile(): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.setAttribute('type', 'file');
      input.setAttribute('accept', '.ifc');
      document.body.appendChild(input);
      input.style.display = "none";
      input.onchange = async (event) => {
        // validate input
        const file = input.files.length === 1 ? input.files[0] : undefined;
        if (!file) {
          return reject(new Error('Missing file'));
        }
        if (file.name.substr(-4) !== '.ifc') {
          return reject(new Error('Invalid file (must be .ifc)'));
        }
        // quick content validatoin
        let reader = new FileReader();
        reader.onload = async (e) => {
          if (typeof e.target.result !== 'string') {
            return reject(new Error('Invalid file (must be .ifc with ISO 10303-21)'));
          }
          const lines = e.target.result.split('\n');
          if (lines[0].substr(0, 13) !== 'ISO-10303-21;' || lines[1].substr(0, 7) !== 'HEADER;') {
            return reject(new Error('Invalid file (must be .ifc with ISO 10303-21)'));
          }
          resolve(file);
        };
  
        reader.readAsText((event.target as any).files[0]);
      };
      input.onabort = (ev: UIEvent) => {
        reject(new Error('Operation aborted'));
      };
      input.click();
    })
  }

  public async getReports(): Promise<ThreeCheckerReportModel[]> {
    const reports = await ThreeCheckerReportModel.getAll(`?siteId=${this.originalSiteId}`);
    return reports;
  }

  public selectReport() {
    if (!this.selectedReportId || !this.reports.map(r => r.id).includes(this.selectedReportId)) {
      errorify(new Error('Please select a report from the list before to continue'));
      return;
    }
    this.step = 'email';
  }

  public async startCheck() {
    try {
      if (!this.email) {
        throw new Error('Missing email address');
      }
      if (this.email.indexOf('@') === -1) {
        throw new Error('Invalid email address');
      }

      await this.createNewSite();
      await this.duplicateReport()
      await this.uploadFile();


    } catch (error) {
      errorify(error);
    }
  }

  public async createNewSite() {
    const newSite = new ThreeSiteModel();
    newSite.name = `BIMETAT-Auto-Checker ${moment().format('DD.MM.YY-HH:mm:ss')}`;
    newSite.metadata = [];
    newSite.metadata.push({
      key: 'generator', value: 'bimetat-checker'
    });
    newSite.metadata.push({
      key: 'expires', value: moment().add(1, 'day').format('DD.MM.YY-HH:mm:ss')
    });
    

    const createdSite = await newSite.save();
    this.siteId = createdSite.id;
  }

  public async duplicateReport() {
    const originalReport = await ThreeCheckerReportModel.getOneWithId(this.selectedReportId);
    const flowsIds = originalReport.flows;
    const originalFlows = await CheckerFlowModel.getAll(`?id=${flowsIds.join(',')}`);
    delete originalReport.id;
    originalReport.siteId = this.siteId;
    const newReport: ThreeCheckerReportModel = await originalReport.save();
    this.newReportId = newReport.id;

    const newFlowsIds: string[] = [];
    for (const flow of originalFlows) {
      const originalModulesIds = flow.modulesIds;
      const originalFlowId = flow.id;
      delete flow.id;
      flow.siteId = this.siteId;
      flow.modulesIds = [];
      const newFlow = await flow.save();
      newFlowsIds.push(newFlow.id);

      for (const moduleId of originalModulesIds) {
        const mod = await CheckerModuleBaseModel.getOne(originalFlowId, moduleId);

        let instance: CheckerModuleFilterModel | CheckerModuleExtractModel | CheckerModuleMathModel | CheckerModuleNormalDistanceModel | CheckerModuleReducerModel | CheckerModuleIfModel | CheckerModuleProjectionModel |  CheckerModuleDistanceModel | CheckerModuleOutputModel;
        switch (mod.moduleType) {
          case 'filter': instance = new CheckerModuleFilterModel(); break;
          case 'extract': instance = new CheckerModuleExtractModel(); break;
          case 'math': instance = new CheckerModuleMathModel(); break;
          case 'normal-distance': instance = new CheckerModuleNormalDistanceModel(); break;
          case 'distance': instance = new CheckerModuleDistanceModel(); break;
          case 'reducer': instance = new CheckerModuleReducerModel(); break;
          case 'projection': instance = new CheckerModuleProjectionModel(); break;
          case 'if': instance = new CheckerModuleIfModel(); break;
          case 'output': instance = new CheckerModuleOutputModel(); break;
        }
        if (instance) {
          for (const key in mod) {
            instance[key] = mod[key];
          }
          delete instance.id;
          instance.siteId = newFlow.siteId;
          instance.flowId = newFlow.id;
          const newModule = await instance.save();
          newFlow.modulesIds.push(newModule.id);
        }

      }

      await newFlow.updateProperties('', ['modulesIds']);
    }

    newReport.flows = newFlowsIds;
    await newReport.updateProperties('', ['flows']);
  }

  // TODO: from the server side we might want to inform
  // better between upload and processing
  public async uploadFile() {
    this.uploadingFile = true;
    try {
      const result = await ThreeSiteModel.addIFCData(
        this.siteId, 
        this.file, 
        {
          ignoreWaitForCompletion: true, 
          callbackWhenUploadDone: (result) => {
            this.uploadingFile = false;
            this.step = 'end';
            this.operationId = result.id;
          },
          reportId: this.newReportId,
          sendReportToEmail: this.email
        }
      );
      notify('Data successfuly uploaded', {timeout: 0});
    } catch (error) {
      this.uploadingFile = false;
      throw error;
    }
  }

}
