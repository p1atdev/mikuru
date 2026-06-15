export type AccountStatus =
  | "found"
  | "not_found"
  | "invalid"
  | "blocked"
  | "unknown"
  | "error";

export type RuleResult = Extract<
  AccountStatus,
  "found" | "not_found" | "blocked" | "unknown"
>;

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT";
export type RedirectMode = "follow" | "manual" | "error";

export interface StringMatcher {
  equals?: string;
  includes?: string | string[];
  matches?: string;
  caseSensitive?: boolean;
}

export interface StatusCondition {
  type: "status";
  in?: number[];
  between?: [number, number];
}

export interface UrlCondition extends StringMatcher {
  type: "url";
}

export interface HeaderCondition extends StringMatcher {
  type: "header";
  name: string;
}

export interface BodyCondition extends StringMatcher {
  type: "body";
}

export interface JsonCondition {
  type: "json";
  path: Array<string | number>;
  exists?: boolean;
  equals?: unknown;
  includes?: string;
}

export interface HtmlCondition {
  type: "html";
  selector: string;
  exists?: boolean;
  text?: StringMatcher;
  attribute?: {
    name: string;
    value?: StringMatcher;
  };
}

export type Condition =
  | StatusCondition
  | UrlCondition
  | HeaderCondition
  | BodyCondition
  | JsonCondition
  | HtmlCondition;

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
  not?: Condition[];
}

export interface Rule {
  result: RuleResult;
  reason?: string;
  when: ConditionGroup;
}

export interface RequestConfig {
  url?: string;
  method?: HttpMethod;
  redirects?: RedirectMode;
  timeoutMs?: number;
  headers?: Record<string, string>;
  json?: unknown;
}

export interface SiteConfig {
  id: string;
  name: string;
  profileUrl: string;
  enabled?: boolean;
  tags?: string[];
  username?: {
    pattern?: string;
  };
  request: RequestConfig;
  blockedStatuses?: number[];
  rules: Rule[];
  test?: {
    found: string;
    notFoundTemplate?: string;
  };
}

export interface Manifest {
  version: 1;
  defaults?: {
    concurrency?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
    blockedStatuses?: number[];
  };
  sites: SiteConfig[];
}

export interface LoadedManifest {
  version: 1;
  defaults: {
    concurrency: number;
    timeoutMs: number;
    headers: Record<string, string>;
    blockedStatuses: number[];
  };
  sites: SiteConfig[];
}

export interface ProbeResponse {
  status: number;
  url: string;
  headers: Headers;
  body?: string;
  durationMs: number;
}

export interface RuleEvidence {
  rule: number;
  result: RuleResult;
  reason?: string;
}

export interface CheckResult {
  username: string;
  site: {
    id: string;
    name: string;
  };
  status: AccountStatus;
  profileUrl: string;
  probeUrl?: string;
  httpStatus?: number;
  durationMs: number;
  evidence?: RuleEvidence;
  error?: string;
  checkedAt: string;
}

export interface CheckOptions {
  timeoutMs?: number;
}

export interface RunReport {
  schemaVersion: 1;
  generatedAt: string;
  usernames: string[];
  results: CheckResult[];
  summary: Record<AccountStatus, number>;
}
