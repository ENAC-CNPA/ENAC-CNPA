import { AtvGlobal } from './../../global';
import { inject, customElement, computedFrom } from 'aurelia-framework';
import { ThreeCheckerReportModel, ThreeCheckerReportDialog, CheckerFlowModel, CheckerFlowDialog, ReportOutput, FlowOutput } from 'aurelia-three';
import { errorify, notify } from 'aurelia-resources'
import { UxModalService } from '@aurelia-ux/modal';
import { Subscription } from 'aurelia-event-aggregator';

@customElement('atv-toolbar-panel-checkers')
@inject(Element, AtvGlobal, UxModalService)
export class AtvToolbarPanelCheckers {

  public reports: Array<ThreeCheckerReportModel> = [];
  public flows: Array<CheckerFlowModel> = [];
  public flowsById: {[key: string]: CheckerFlowModel} = {};

  private subscriptions: Subscription[] = [];

  public selectedReport: ThreeCheckerReportModel | null = null;
  public includedFlowsInSelectedReport: CheckerFlowModel[] = [];

  private reportRunInProgress = false;
  private reportRunOutput: ReportOutput;
  private reportDisplayRun = false;

  public constructor(private element: HTMLElement, private atv: AtvGlobal, private modalService: UxModalService) {

  }

  public attached() {
    this.subscriptions.push(this.atv.subscribe('atv-site-loaded', (_site) => {
      this.backToReports();
      this.getReports();
      this.getFlows();
    }));
    this.subscriptions.push(this.atv.subscribe('atv-data-imported', () => {
      this.getReports();
      this.getFlows();
    }));
    this.subscriptions.push(this.atv.subscribe('swissdata:logout', () => {
      this.backToReports();
    }));
  }

  public detached() {
    for (const sub of this.subscriptions) {
      sub.dispose();
    }
    this.subscriptions = [];
  }

  private async getReports() {
    this.reports = await ThreeCheckerReportModel.getAll(`?siteId=${this.atv.siteService.site.id}`);
  }

  private async getFlows() {
    this.flows = await CheckerFlowModel.getAll(`?siteId=${this.atv.siteService.site.id}`);
    this.flowsById = {};
    for (const flow of this.flows) {
      this.flowsById[flow.id] = flow;
    }
  }

  public selectReport(reportOrReportId: ThreeCheckerReportModel | string) {
    if (!this.atv.global.state.swissdata.authenticated) {
      return;
    }
    this.reportDisplayRun = false;
    const report = reportOrReportId instanceof ThreeCheckerReportModel ? reportOrReportId : this.reports.find(r => r.id === reportOrReportId);
    if (!report) {
      errorify(new Error('Cannot find report with id: ' + reportOrReportId), {formatter: undefined});
    }
    this.selectedReport = report;
    this.setIncludedFlowsInSelectedReport();
  }

  private setIncludedFlowsInSelectedReport() {
    this.includedFlowsInSelectedReport = this.selectedReport.flows.map((flowId) => {
      const flow = this.flows.find((flow) => flow.id === flowId);
      if (!flow) {
        console.warn('Missing flow');
        return null;
      }
      return flow;
    });
  }

  private backToReports() {
    this.selectedReport = null;
  }

  public async createNewReport() {
    try { 
      const dialog = await this.modalService.open({
        viewModel: ThreeCheckerReportDialog,
        model: {siteId: this.atv.siteService.site.id, three: this.atv.three, flows: this.flows},
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        notify('three.The new report has been created');
        this.getReports();
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editReport(report: ThreeCheckerReportModel) {
    try { 
      const dialog = await this.modalService.open({
        viewModel: ThreeCheckerReportDialog,
        model: {report, three: this.atv.three, flows: this.flows},
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        await this.getReports();
        if (result.output === 'remove') {
          notify('three.The report has been removed');
          this.backToReports();
        } else {
          notify('three.The report has been edited');
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async runPdfReport(event: MouseEvent, reportId: string) {
    event.stopPropagation();
    if (this.reportRunInProgress) {
      errorify(new Error('There is a run in progress, please wait until it finishes before to run a new one'));
      return;
    }
    this.reportRunInProgress = true;
    
    let requestUrl = `/three/checker/report/${reportId}/run?pdf=true`;
    try {
      const response = await ThreeCheckerReportModel.api.get(requestUrl);

      const blob = await response.blob();
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = "filename.pdf";
      document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
      a.click();    
      a.remove();  //afterwards we remove the element again         
    } catch (error) {
      errorify(error);
    } finally {
      this.reportRunInProgress = false;
    }
  }

  public async runReport(event: MouseEvent, reportId: string) {
    event.stopPropagation();
    if (this.reportRunInProgress) {
      errorify(new Error('There is a run in progress, please wait until it finishes before to run a new one'));
      return;
    }
    this.reportRunInProgress = true;
    // delete this.reportRunOutput;
    let requestUrl = `/three/checker/report/${reportId}/run`;
    this.reportDisplayRun = true;
    try {
      const response = await ThreeCheckerReportModel.api.get(requestUrl);
      if (response.status !== 200) {
        const json = await response.json();
        if (json.error) {
          throw new Error(json.error);
        } else {
          throw new Error('Unkown error');
        }
      } else {
        this.reportRunOutput = {
          name: '',
          description: '',
          flows: [],
        };
        setTimeout(async() => {
          this.reportRunOutput = await response.json();
        }, 100);
      }
    } catch (error) {
      errorify(error);
    } finally {
      this.reportRunInProgress = false;
    }
  }

  public async createNewFlow() {
    try { 
      const dialog = await this.modalService.open({
        viewModel: CheckerFlowDialog,
        model: {siteId: this.atv.siteService.site.id, three: this.atv.three},
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        
        if (result.output instanceof CheckerFlowModel && this.selectedReport) {
          this.selectedReport.flows.push(result.output.id);
          await this.selectedReport.updateProperties('', ['flows']);
          await this.getFlows();
          notify('three.The new flow has been added to the report');
          this.selectReport(this.selectedReport.id);
        } else {
          await this.getFlows();
          notify('three.The new flow has been created');
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async editFlow(flow: CheckerFlowModel) {
    try { 
      const dialog = await this.modalService.open({
        viewModel: CheckerFlowDialog,
        model: {flow, three: this.atv.three},
      });
      const result = await dialog.whenClosed();
      if (!result.wasCancelled) {
        await this.getFlows();
        if (result.output === 'remove') {
          notify('three.The flow has been removed from all reports');
          await this.getReports();
          this.selectReport(this.selectedReport.id);
        } else {
          notify('three.The flow has been edited');
        }
      }
    } catch (error) {
      errorify(error);
    }
  }

  public async updateSelectedReportWithIncludedFlows() {
    this.selectedReport.flows = this.includedFlowsInSelectedReport.map(i => i.id);
    await this.selectedReport.updateProperties('', ['flows']);
    this.setIncludedFlowsInSelectedReport();
  }

  public addFlow(flow: CheckerFlowModel) {
    this.includedFlowsInSelectedReport.push(flow);
    this.updateSelectedReportWithIncludedFlows();
  }

  public removeFlow(index: number, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    this.includedFlowsInSelectedReport.splice(index, 1);
    this.updateSelectedReportWithIncludedFlows();
  }

  @computedFrom('flows', 'includedFlowsInSelectedReport.length')
  public get availableFlowsForSelectedReport(): CheckerFlowModel[] {
    const flows: CheckerFlowModel[] = [];
    const inclIds = this.includedFlowsInSelectedReport.map(f => f.id);
    for (let flow of this.flows) {
      if (!inclIds.includes(flow.id)) {
        flows.push(flow);
      }
    }
    return flows;
  }

  public flowOrderChanged(newOrder: CheckerFlowModel[]) {
    this.updateSelectedReportWithIncludedFlows();
  }
  
}

export class FilterFlowValueConverter {
  public toView(flows: CheckerFlowModel[], searchFlow: string): CheckerFlowModel[] {
    const result: CheckerFlowModel[] = [];
    if (searchFlow) {
      const q = searchFlow.toLowerCase();
      for (const flow of flows) {
        if (flow.name && flow.name.toLowerCase().indexOf(q) !== -1) {
          result.push(flow);
        }
      }
    } else {
      for (const flow of flows) {
        result.push(flow);
      }
    }
    result.sort((a, b) => {
      const va = a.name ? a.name.toLowerCase() : '';
      const vb = b.name ? b.name.toLowerCase() : '';
      if (va < vb) {
        return -1;
      }
      if (va < vb) {
        return 1;
      }
      return 0;
    })
    return result;
  }
}
