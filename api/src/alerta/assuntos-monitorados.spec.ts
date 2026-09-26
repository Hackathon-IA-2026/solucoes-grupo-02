import { assuntosMonitorados, citaAEmpresa, normaInteressa } from './assuntos-monitorados';

const norma = { area: 'Solar, Eólica', subarea: 'Solar > Geração distribuída; Eólica > Cortes de geração' };

describe('assuntosMonitorados', () => {
    it('casa área e subárea ignorando acento e maiúsculas', () => {
        expect(assuntosMonitorados(norma, { areas: ['eolica'], subareas: ['CORTES DE GERACAO'] })).toEqual(['Eólica › Cortes de geração']);
    });

    it('sem subárea marcada, casa só pela área', () => {
        expect(assuntosMonitorados(norma, { areas: ['Solar', 'Eólica'], subareas: [] })).toEqual([
            'Solar › Geração distribuída',
            'Eólica › Cortes de geração',
        ]);
    });

    it('com subárea marcada, a norma de outra subárea não gera alerta', () => {
        expect(assuntosMonitorados(norma, { areas: ['Solar'], subareas: ['Conexão e acesso'] })).toEqual([]);
    });

    it('sem área marcada, nada casa', () => {
        expect(assuntosMonitorados(norma, { areas: [], subareas: ['Geração distribuída'] })).toEqual([]);
    });

    it('norma cadastrada à mão só com área', () => {
        expect(assuntosMonitorados({ area: 'Hidrelétrica' }, { areas: ['Hidrelétrica'], subareas: ['Leilões'] })).toEqual(['Hidrelétrica']);
    });
});

describe('citaAEmpresa / normaInteressa', () => {
    // Despacho que libera as unidades geradoras de uma usina solar de outra empresa
    const despacho = {
        area: 'Solar',
        subarea: 'Solar > Geração distribuída',
        abrangencia: 'individual' as const,
        cnpjs: ['18565382000166'],
        cegs: ['UFV.RS.PE.075566'],
    };
    const resolucao = { area: 'Solar', subarea: 'Solar > Geração distribuída', abrangencia: 'geral' as const, cnpjs: [], cegs: [] };
    const plant = { areas: ['Solar'], subareas: [], cnpjs: [], cegs: [], company: { cnpj: '11222333000181' } };

    it('ato individual de outra empresa não entra, mesmo na área monitorada', () => {
        expect(citaAEmpresa(despacho, plant)).toBe(false);
        expect(normaInteressa(despacho, plant)).toBe(false);
        expect(normaInteressa(despacho, plant, false)).toBe(false);
    });

    it('ato geral continua casando pela área', () => {
        expect(normaInteressa(resolucao, plant)).toBe(true);
        expect(normaInteressa(resolucao, { ...plant, areas: ['Eólica'] })).toBe(false);
        expect(normaInteressa(resolucao, { ...plant, areas: ['Eólica'] }, false)).toBe(true);
    });

    it('casa pelo CNPJ da empresa, pela raiz (filial) e pelo de uma SPE', () => {
        expect(normaInteressa(despacho, { ...plant, company: { cnpj: '18565382000166' } })).toBe(true);
        expect(normaInteressa(despacho, { ...plant, company: { cnpj: '18565382000247' } })).toBe(true); // filial
        expect(normaInteressa(despacho, { ...plant, cnpjs: ['18565382000166'] })).toBe(true);
    });

    it('casa pelo CEG de uma usina da empresa, mesmo fora das áreas monitoradas', () => {
        expect(normaInteressa(despacho, { ...plant, areas: ['Eólica'], cegs: ['UFV.RS.PE.075566'] })).toBe(true);
    });

    it('empresa sem CNPJ (migração antiga) não quebra', () => {
        expect(citaAEmpresa(despacho, { cnpjs: [], cegs: [], company: { cnpj: null } })).toBe(false);
    });
});
