export interface AtvFilter {
  key: string;
  operator: '=' | '!=' | '*' | '<' | '>';
  value: any;
}

export interface LoadSiteOptions {
  showEdges?: boolean; // default true
}