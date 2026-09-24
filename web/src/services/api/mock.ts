import type { Api, Alert, ChatMessage, ChatSession, CopilotAnswer, Norm, Noticia, Plant, RegisterInput, Session, Source, TeamMember, User } from '../../types';

const espera = (ms = 320) => new Promise((r) => setTimeout(r, ms));

let usuario: User = {
    id: 'u1',
    name: 'Mariana Coelho',
    email: 'regulatorio@usinaserradovento.com.br',
    role: 'Coordenadora regulatória',
    company: 'Serra do Vento Energia S.A.',
    cnpj: '12.345.678/0001-90',
    phone: '(81) 99632-4410',
    monthlyReportEnabled: false,
    initials: 'MC',
    isAdmin: true,
};

let equipe: TeamMember[] = [
    { id: 'u1', name: 'Mariana Coelho', email: 'regulatorio@usinaserradovento.com.br', role: 'Coordenadora regulatória', isAdmin: true, convitePendente: false, desde: '2026-08-02T12:00:00Z' },
    { id: 'u2', name: 'Rafael Tavares', email: 'rafael@usinaserradovento.com.br', role: 'Engenheiro de operação', isAdmin: false, convitePendente: false, desde: '2026-08-10T12:00:00Z' },
    { id: 'u3', name: 'Lívia Prado', email: 'livia@usinaserradovento.com.br', role: 'Jurídico', isAdmin: false, convitePendente: true, desde: '2026-09-20T12:00:00Z' },
];

const linkDeConvite = () => `${window.location.origin}/recuperar-senha?token=mock-${Date.now()}&convite=1`;

let usina: Plant = {
    id: 'p1',
    name: 'Usina Serra do Vento',
    kind: 'Eólica',
    submarket: 'Nordeste',
    contractEnv: 'Livre (ACL)',
    capacityMw: 82,
    capacityLimitMw: 100,
    co2: 0.41,
    co2Limit: 0.45,
    availability: 96.2,
    availabilityMin: 92,
    areas: ['Eólica', 'Solar'],
    subareas: ['Outorga e autorização', 'Tarifas e encargos', 'Conexão e acesso', 'Licenciamento ambiental'],
    channels: { email: true, push: true, pdf: false },
    frequency: 'Imediato',
};

export const NORMAS: Norm[] = [
    {
        id: 'n1',
        code: 'REN nº 1.214/2026 — art. 7º ao 11',
        source: 'aneel',
        sourceLabel: 'ANEEL',
        impact: 'alto',
        date: '15/09',
        title: 'Novo critério de medição para usinas eólicas conectadas em 230 kV',
        lead: 'Registro de disponibilidade a cada 5 minutos e comunicação ao ONS em até 24 h após falha de telemedição.',
        deadline: 'Consulta pública aberta até 28/09/2026',
        deadlineAt: '2026-09-28',
        changes: [
            'O intervalo de registro de disponibilidade cai de 30 para 5 minutos.',
            'Falha de telemedição passa a ter prazo de comunicação de 24 h, contra os 5 dias úteis atuais.',
            'O relatório trimestral passa a exigir assinatura do responsável técnico.',
        ],
        why: 'A Serra do Vento está conectada em 230 kV e hoje registra em 30 minutos. Adequar o sistema de aquisição exige contrato com o fornecedor de SCADA — prazo estimado de 45 dias, contra 13 dias até o fim da consulta.',
    },
    {
        id: 'n2',
        code: 'Portaria nº 512/2026',
        source: 'dou',
        sourceLabel: 'DOU',
        impact: 'medio',
        date: '14/09',
        title: 'Atualização da tabela de encargos setoriais para o submercado Nordeste',
        lead: 'Reajuste aplicável a partir do ciclo de outubro, com nova memória de cálculo anexa.',
        deadline: 'Vigência a partir de 01/10/2026',
        deadlineAt: '2026-10-01',
        changes: [
            'A tabela de encargos do Nordeste passa a vigorar com novos valores em outubro.',
            'A memória de cálculo anexa substitui a versão publicada em março.',
            'Contratos com reajuste indexado ao encargo precisam ser revistos no fechamento do mês.',
        ],
        why: 'Seus contratos no ACL usam o encargo como índice. O impacto estimado no faturamento de outubro é de 1,8% sobre a receita bruta.',
    },
    {
        id: 'n3',
        code: 'Ata da 38ª Reunião Pública',
        source: 'ccee',
        sourceLabel: 'CCEE',
        impact: 'baixo',
        date: '12/09',
        title: 'Discussão sobre conexão de usinas híbridas ao mesmo ponto de entrega',
        lead: 'Sinaliza regra futura para rateio de capacidade entre geração eólica e solar no mesmo ponto.',
        deadline: 'Sem prazo — sinalização de regra futura',
        changes: [
            'Indica que o rateio de capacidade entre fontes no mesmo ponto deve virar regra formal.',
            'Não há obrigação imediata; a minuta deve ir a consulta no próximo ciclo.',
        ],
        why: 'Você tem projeto solar previsto no mesmo ponto de conexão. Vale acompanhar antes de fechar o projeto básico.',
    },
    {
        id: 'n4',
        code: 'Despacho nº 3.907/2026',
        source: 'aneel',
        sourceLabel: 'ANEEL',
        impact: 'medio',
        date: '11/09',
        title: 'Prazos de outorga para ampliação de centrais de geração',
        lead: 'Reduz de 180 para 120 dias o prazo de análise, mas exige documentação completa no protocolo.',
        deadline: 'Aplicável a protocolos feitos após 01/11/2026',
        changes: [
            'O prazo de análise cai para 120 dias.',
            'Protocolo incompleto passa a ser indeferido de plano, sem fase de complementação.',
            'O comprovante de licenciamento ambiental passa a ser exigido já no protocolo.',
        ],
        why: 'A ampliação de 18 MW prevista para 2027 depende desse rito. Se o protocolo for em novembro, a licença prévia precisa estar emitida antes.',
    },
    {
        id: 'n5',
        code: 'Nota Técnica nº 89/2026',
        source: 'dou',
        sourceLabel: 'DOU',
        impact: 'baixo',
        date: '09/09',
        title: 'Metodologia de apuração de emissões para fontes renováveis',
        lead: 'Consolida o método de cálculo da emissão específica usada nos programas de incentivo.',
        deadline: 'Sem prazo de ação',
        changes: ['Consolida em um único documento o método de apuração da emissão específica.', 'Não altera os tetos vigentes por faixa.'],
        why: 'Seu indicador atual, de 0,41 tCO₂/MWh, segue calculado pelo mesmo método. Nenhuma ação necessária.',
    },
];

const ALERTAS: Alert[] = [
    {
        id: 'a1',
        severity: 'alto',
        title: 'Prazo de consulta pública encerra em 13 dias',
        message: 'Medição em 5 minutos para eólicas em 230 kV. Sua usina está no escopo.',
        at: 'hoje, 07h12',
    },
    {
        id: 'a2',
        severity: 'medio',
        title: 'Emissão específica a 9% do teto',
        message: 'Com o despacho médio de agosto, a margem cai para 4% em novembro.',
        at: 'ontem, 18h40',
    },
    {
        id: 'a3',
        severity: 'baixo',
        title: 'Nova tabela de encargos publicada',
        message: 'Reajuste aplicável ao submercado Nordeste a partir de outubro.',
        at: '12/09, 09h05',
    },
    {
        id: 'a4',
        severity: 'baixo',
        title: 'Ata de reunião pública disponível',
        message: 'Trata de conexão de usinas híbridas — relacionada à sua subárea.',
        at: '10/09, 15h22',
    },
];

const NOTICIAS: Noticia[] = [
    {
        id: 'no1',
        title: 'Leilão de eólicas offshore no Nordeste atrai fundos internacionais',
        summary: 'Investidores europeus sinalizam interesse em blocos próximos ao litoral pernambucano, o que pode pressionar o preço da terra e do frete portuário na região.',
        source: 'Canal Energia',
        setor: 'Eólica',
        date: '16/09',
        url: 'https://www.canalenergia.com.br',
    },
    {
        id: 'no2',
        title: 'Custo de baterias para armazenamento cai 12% no último trimestre',
        summary: 'Queda no preço do lítio e novos fornecedores asiáticos tornam projetos híbridos eólica+armazenamento mais competitivos frente ao gás.',
        source: 'Valor Econômico',
        setor: 'Armazenamento',
        date: '15/09',
        url: 'https://valor.globo.com',
    },
    {
        id: 'no3',
        title: 'ONS projeta recorde de geração renovável para o próximo verão',
        summary: 'Previsão aponta para participação inédita de eólica e solar na matriz do Nordeste entre dezembro e março, com risco de curtailment em dias de baixa carga.',
        source: 'Agência CanalEnergia',
        setor: 'Eólica',
        date: '14/09',
        url: 'https://www.canalenergia.com.br',
    },
    {
        id: 'no4',
        title: 'Fabricantes de turbinas revisam prazo de entrega para 2027',
        summary: 'Gargalos na cadeia de componentes na Ásia devem atrasar encomendas — projetos que dependem de equipamento novo já sentem o efeito nos cronogramas.',
        source: 'Reuters Brasil',
        setor: 'Eólica',
        date: '11/09',
        url: 'https://www.reuters.com',
    },
];

const RESPOSTAS: Array<{ m: RegExp } & CopilotAnswer> = [
    {
        m: /medi(ç|c)(ã|a)o|230|5 minutos/i,
        answer: '<p>A minuta em consulta troca o registro de disponibilidade de 30 para 5 minutos e reduz o prazo de comunicação de falha de telemedição para 24 horas.</p><p>Para a Serra do Vento, isso significa duas frentes: atualizar o SCADA para a granularidade de 5 minutos e criar o procedimento interno de comunicação ao ONS. A consulta fica aberta até 28/09 — dá tempo de enviar contribuição pedindo prazo de adequação.</p>',
        citations: [
            {
                label: 'REN nº 1.214/2026, art. 7º',
                excerpt:
                    'Trecho recuperado da base vetorial: registro de disponibilidade em intervalos não superiores a cinco minutos, com retenção mínima de 24 meses.',
                normId: 'n1',
            },
            {
                label: 'REN nº 1.214/2026, art. 11',
                excerpt: 'Trecho recuperado da base vetorial: comunicação de falha de telemedição em até 24 horas contadas da detecção.',
                normId: 'n1',
            },
        ],
    },
    {
        m: /prazo|vence|este m(ê|e)s/i,
        answer: '<p>Dois prazos tocam a sua operação neste mês:</p><ul><li><b>28/09</b> — fim da consulta pública sobre medição em 230 kV.</li><li><b>30/09</b> — envio do relatório trimestral de disponibilidade, que na nova redação pede assinatura do responsável técnico.</li></ul><p>O reajuste de encargos do Nordeste só produz efeito em outubro, mas convém revisar os contratos indexados antes do fechamento.</p>',
        citations: [
            {
                label: 'REN nº 1.214/2026, art. 11',
                excerpt: 'Trecho recuperado da base vetorial: o relatório trimestral será assinado pelo responsável técnico da central geradora.',
                normId: 'n1',
            },
        ],
    },
    {
        m: /faturamento|encargo|tarifa|receita/i,
        answer: '<p>O que mexe no faturamento é a nova tabela de encargos do Nordeste, com vigência em outubro. Seus contratos no ambiente livre usam o encargo como índice de reajuste.</p><p>Pela memória de cálculo anexa à portaria, o efeito estimado é de 1,8% sobre a receita bruta de outubro.</p>',
        citations: [
            {
                label: 'Portaria nº 512/2026, Anexo I',
                excerpt:
                    'Trecho recuperado da base vetorial: tabela de encargos setoriais aplicável ao submercado Nordeste, substituindo o anexo publicado em março de 2026.',
                normId: 'n2',
            },
        ],
    },
    {
        m: /protocol|outorga|amplia/i,
        answer: '<p>Para a ampliação de 18 MW prevista para 2027, sim. O despacho reduz a análise para 120 dias, mas passa a indeferir de plano o protocolo incompleto.</p><p>Na prática, a licença prévia ambiental precisa estar emitida <b>antes</b> do protocolo, e não durante a análise como hoje.</p>',
        citations: [
            {
                label: 'Despacho nº 3.907/2026, item 4',
                excerpt:
                    'Trecho recuperado da base vetorial: o requerimento instruído de forma incompleta será indeferido, vedada a abertura de prazo para complementação.',
                normId: 'n4',
            },
        ],
    },
];

let SESSOES: ChatSession[] = [
    { id: 'c1', titulo: 'Medição em 230 kV', atualizadoEm: new Date().toISOString() },
    { id: 'c2', titulo: 'Encargos no Nordeste', atualizadoEm: new Date(Date.now() - 86400000).toISOString() },
];

const MENSAGENS: Record<string, ChatMessage[]> = {
    c1: [
        {
            id: 'm1',
            autor: 'bot',
            texto: '<p>Bom dia. Acompanhei 142 publicações nos últimos 7 dias e 3 delas tocam a sua usina.</p><p>Posso detalhar qualquer uma, ou responder direto sobre prazos, encargos e obrigações.</p>',
            citacoes: [],
            criadoEm: new Date().toISOString(),
        },
    ],
    c2: [],
};

const FALLBACK: CopilotAnswer = {
    answer: '<p>Não encontrei um dispositivo em vigor que responda a isso com precisão, e prefiro não completar a lacuna por conta própria.</p><p>Nas bases indexadas há material próximo sobre medição, encargos e outorga. Reformule com o tema ou o número da norma e eu volto com o artigo exato.</p>',
    citations: [],
};

export const api: Api = {
    async login(email) {
        await espera();
        return {
            token: 'mock-token',
            user: { ...usuario, email: email || usuario.email },
        };
    },
    async register(input: RegisterInput) {
        await espera(500);
        const initials =
            input.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('') || 'ES';
        return {
            token: 'mock-token',
            user: {
                ...usuario,
                name: input.name,
                email: input.email,
                role: input.role,
                company: input.companyName,
                cnpj: input.cnpj,
                isAdmin: true,
                initials,
            },
        };
    },
    async forgotPassword() {
        await espera(500);
    },
    async resetPassword() {
        await espera(400);
    },
    async getMe() {
        await espera(150);
        return usuario;
    },
    async updateProfile(patch) {
        await espera(260);
        usuario = { ...usuario, ...patch };
        return usuario;
    },
    async listNorms(source) {
        await espera(200);
        return !source || source === 'todas' ? NORMAS : NORMAS.filter((n) => n.source === source);
    },
    async getNorm(id) {
        await espera(150);
        const n = NORMAS.find((x) => x.id === id);
        if (!n) throw new Error('Norma não encontrada');
        return n;
    },
    async getPlant() {
        await espera(180);
        return usina;
    },
    async updatePlant(patch) {
        await espera(260);
        usina = { ...usina, ...patch };
        return usina;
    },
    async listAlerts() {
        await espera(200);
        return ALERTAS;
    },
    async checkAlerts() {
        await espera(200);
        return [];
    },
    async markAlertRead(id: string) {
        await espera(120);
        const alerta = ALERTAS.find((a) => a.id === id);
        if (!alerta) throw new Error('Alerta não encontrado');
        alerta.lido = true;
        return alerta;
    },
    async listNoticias(setor?: string) {
        await espera(220);
        return !setor ? NOTICIAS : NOTICIAS.filter((n) => n.setor === setor);
    },
    async getNormPdf() {
        await espera(300);
        return new Blob(['Resumo (mock) — sem PDF real fora do modo conectado à API.'], { type: 'application/pdf' });
    },
    async listChatSessions() {
        await espera(150);
        return [...SESSOES].sort((a, b) => +new Date(b.atualizadoEm) - +new Date(a.atualizadoEm));
    },
    async createChatSession() {
        await espera(150);
        const sessao: ChatSession = { id: `c${Date.now()}`, titulo: 'Nova conversa', atualizadoEm: new Date().toISOString() };
        SESSOES = [sessao, ...SESSOES];
        MENSAGENS[sessao.id] = [];
        return sessao;
    },
    async listChatMessages(sessionId: string) {
        await espera(150);
        return MENSAGENS[sessionId] ?? [];
    },
    async sendChatMessage(sessionId: string, question: string) {
        await espera(820);
        const mensagens = MENSAGENS[sessionId] ?? (MENSAGENS[sessionId] = []);
        mensagens.push({ id: `m${Date.now()}`, autor: 'user', texto: question, citacoes: [], criadoEm: new Date().toISOString() });

        const hit = RESPOSTAS.find((r) => r.m.test(question));
        const resposta = hit ? { answer: hit.answer, citations: hit.citations } : FALLBACK;
        mensagens.push({ id: `m${Date.now() + 1}`, autor: 'bot', texto: resposta.answer, citacoes: resposta.citations, criadoEm: new Date().toISOString() });

        const sessao = SESSOES.find((s) => s.id === sessionId);
        if (sessao) {
            if (sessao.titulo === 'Nova conversa') sessao.titulo = question.length > 60 ? `${question.slice(0, 57)}…` : question;
            sessao.atualizadoEm = new Date().toISOString();
        }

        return resposta;
    },
    async listTeam() {
        await espera(200);
        return equipe;
    },
    async inviteMember(input) {
        await espera(400);
        if (equipe.some((m) => m.email === input.email)) throw new Error('Já existe uma conta com esse e-mail.');
        const membro: TeamMember = { id: `u${Date.now()}`, name: input.name, email: input.email, role: input.role ?? '', isAdmin: input.isAdmin ?? false, convitePendente: true, desde: new Date().toISOString() };
        equipe = [...equipe, membro];
        return { membro, linkConvite: linkDeConvite() };
    },
    async renewInvite(id: string) {
        await espera(300);
        const membro = equipe.find((m) => m.id === id);
        if (!membro) throw new Error('Usuário não encontrado nesta empresa.');
        return { membro, linkConvite: linkDeConvite() };
    },
    async setMemberAdmin(id: string, isAdmin: boolean) {
        await espera(250);
        if (!isAdmin && equipe.filter((m) => m.isAdmin).length <= 1 && equipe.find((m) => m.id === id)?.isAdmin) {
            throw new Error('A empresa precisa de pelo menos um administrador.');
        }
        equipe = equipe.map((m) => (m.id === id ? { ...m, isAdmin } : m));
        return equipe.find((m) => m.id === id)!;
    },
    async removeMember(id: string) {
        await espera(250);
        if (id === usuario.id) throw new Error('Você não pode remover a própria conta.');
        equipe = equipe.filter((m) => m.id !== id);
    },
};
