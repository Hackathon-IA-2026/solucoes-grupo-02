export type Source = 'aneel' | 'ccee' | 'dou';
export type Impact = 'alto' | 'medio' | 'baixo';

export interface Norm {
  id: string;
  code: string;
  source: Source;
  sourceLabel: string;
  impact: Impact;
  date: string;
  title: string;
  lead: string;
  deadline: string;
  changes: string[];
  why: string;
  url?: string;
}

export interface Plant {
  id: string;
  name: string;
  kind: string;
  submarket: string;
  contractEnv: string;
  capacityMw: number;
  capacityLimitMw: number;
  co2: number;
  co2Limit: number;
  availability: number;
  availabilityMin: number;
  areas: string[];
  subareas: string[];
  channels: { email: boolean; push: boolean; pdf: boolean };
  frequency: string;
}

export interface Alert {
  id: string;
  severity: Impact;
  title: string;
  message: string;
  at: string;
}

export interface Citation {
  label: string;
  excerpt: string;
  normId?: string;
}

export interface CopilotAnswer {
  answer: string;
  citations: Citation[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  cnpj: string;
  phone: string;
  initials: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Api {
  login(email: string, password: string): Promise<Session>;
  register(input: RegisterInput): Promise<Session>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  listNorms(source?: Source | 'todas'): Promise<Norm[]>;
  getNorm(id: string): Promise<Norm>;
  getPlant(): Promise<Plant>;
  updatePlant(patch: Partial<Plant>): Promise<Plant>;
  listAlerts(): Promise<Alert[]>;
  ask(question: string): Promise<CopilotAnswer>;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  company: string;
  cnpj: string;
  role: string;
  kind: string;
}
