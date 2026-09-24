import { assuntosMonitorados } from './assuntos-monitorados';

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
