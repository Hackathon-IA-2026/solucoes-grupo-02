import type { NormaEntity } from '../norma/entities/norma.entity';
import { catalogoParaOCopiloto } from './catalogo';

const HOJE = new Date('2026-09-26T12:00:00Z');

function norma(id: string, extra: Partial<NormaEntity> = {}): NormaEntity {
    return {
        id,
        source: 'dou',
        title: `Norma ${id}`,
        code: `Despacho nº ${id}/2026`,
        changes: [],
        changeSources: [],
        impact: 'medio',
        ...extra,
    } as NormaEntity;
}

describe('catalogoParaOCopiloto', () => {
    const feed = [
        norma('1', { publishedAt: '2026-09-25' }),
        norma('2', { publishedAt: '2026-09-20', deadlineAt: '2026-10-20', deadline: 'Envio de propostas até 20/10/2026' }),
        norma('3', { publishedAt: '2026-09-10', deadlineAt: '2026-09-01' }), // prazo vencido
        norma('4', { publishedAt: '2026-09-01', deadlineAt: '2026-09-30' }),
    ];

    it('põe a norma em foco primeiro, depois os prazos abertos (o mais próximo antes) e o resto do feed', () => {
        const foco = norma('9', { publishedAt: '2026-07-01' });
        expect(catalogoParaOCopiloto(feed, foco, HOJE).map((n) => [n.id, n.emFoco])).toEqual([
            ['9', true],
            ['4', false],
            ['2', false],
            ['1', false],
            ['3', false],
        ]);
    });

    it('não repete a norma em foco que também está no feed', () => {
        expect(catalogoParaOCopiloto(feed, feed[2], HOJE).map((n) => n.id)).toEqual(['3', '4', '2', '1']);
    });

    it('leva o prazo e o "o que fazer" que o resumidor extraiu', () => {
        const [n] = catalogoParaOCopiloto([norma('2', { deadline: 'Envio até 20/10/2026', why: 'O que fazer: enviar proposta.' })], null, HOJE);
        expect(n).toMatchObject({
            code: 'Despacho nº 2/2026',
            deadline: 'Envio até 20/10/2026',
            why: 'O que fazer: enviar proposta.',
            emFoco: false,
        });
    });
});
