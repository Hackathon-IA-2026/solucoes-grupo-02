export type Source = 'aneel' | 'ccee' | 'dou';
export type Impact = 'alto' | 'medio' | 'baixo';

export interface Norm {
    id: string;
    code: string;
    source: Source;
    sourceLabel: string;
    impact: Impact;
    date: string;
    publishedAt?: string; // AAAA-MM-DD
    title: string;
    lead: string;
    deadline: string;
    deadlineAt?: string; // AAAA-MM-DD do próximo prazo
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

export interface Noticia {
    id: string;
    title: string;
    summary: string;
    source: string;
    url?: string;
    imageUrl?: string;
    setor?: string;
    date: string;
}

export interface Alert {
    id: string;
    severity: Impact;
    title: string;
    message: string;
    at: string;
    lido?: boolean;
    tipo?: string; // 'norma_nova' | 'limite_excedido'
    normId?: string;
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

export interface ChatSession {
    id: string;
    titulo: string;
    atualizadoEm: string;
}

export interface ChatMessage {
    id: string;
    autor: 'user' | 'bot';
    texto: string;
    citacoes: Citation[];
    criadoEm: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    company: string;
    cnpj: string;
    phone: string;
    monthlyReportEnabled: boolean;
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
    getMe(): Promise<User>;
    updateProfile(patch: Partial<Pick<User, 'name' | 'role' | 'phone' | 'monthlyReportEnabled'>>): Promise<User>;
    listNorms(source?: Source | 'todas'): Promise<Norm[]>;
    getNorm(id: string): Promise<Norm>;
    getPlant(): Promise<Plant>;
    updatePlant(patch: Partial<Plant>): Promise<Plant>;
    listAlerts(): Promise<Alert[]>;
    checkAlerts(): Promise<Alert[]>;
    markAlertRead(id: string): Promise<Alert>;
    listNoticias(setor?: string): Promise<Noticia[]>;
    getNormPdf(id: string): Promise<Blob>;
    listChatSessions(): Promise<ChatSession[]>;
    createChatSession(): Promise<ChatSession>;
    listChatMessages(sessionId: string): Promise<ChatMessage[]>;
    sendChatMessage(sessionId: string, question: string): Promise<CopilotAnswer>;
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    role: string;
}
