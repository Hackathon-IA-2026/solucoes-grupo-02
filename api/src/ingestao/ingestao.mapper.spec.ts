import { dividirEmTrechos, mapearNorma, NormaMapeada, paraDataIso } from './ingestao.mapper';

const HOJE = new Date('2026-09-24T12:00:00Z');

// Uma linha como sai do `coletar_df` (ai/models/summarizer.py) via df.to_json(orient="records").
const linhaDoPipeline = {
    data: '23/09/2026',
    orgao: 'Ministério de Minas e Energia/Agência Nacional de Energia Elétrica/Superintendência de Regulação',
    tipo: 'Despacho',
    titulo: 'DESPACHO Nº 2.345, DE 22 DE SETEMBRO DE 2026',
    texto: 'O SUPERINTENDENTE DE REGULAÇÃO resolve:\nArt. 1º Fica aberta a Consulta Pública nº 12/2026.\nArt. 2º As contribuições vão até 15 de outubro.',
    link: 'https://www.in.gov.br/web/dou/-/despacho-n-2.345-de-22-de-setembro-de-2026-123',
    area: ['Solar'],
    subarea: ['Solar > Geração distribuída'],
    relevancia: 3,
    temas: ['consulta pública'],
    subarea_bruta: ['Solar > Geração distribuída'],
    justificativa: 'Abre consulta sobre o SCEE.',
    resumo: 'Abre consulta pública sobre as regras de compensação da geração distribuída. As contribuições vão até outubro.',
    mudancas: [
        { o_que_mudou: 'Prazo de compensação dos créditos', antes: '60 meses', depois: '48 meses', trecho: '...' },
        { o_que_mudou: 'Abertura da consulta', antes: null, depois: null, trecho: '...' },
    ],
    valores: [{ parametro: 'prazo_creditos', valor: 48, unidade: 'meses', trecho: '...' }],
    prazos: [
        { tipo: 'vigencia', data: '2026-01-01', descricao: 'vigência anterior', trecho: '...' },
        { tipo: 'contribuicao', data: '2026-10-15', descricao: 'envio de contribuições', trecho: '...' },
        { tipo: 'cumprimento', data: null, descricao: 'sem data', trecho: '...' },
    ],
    quem_e_afetado: ['minigeração solar', 'distribuidoras'],
    acao_necessaria: 'Avaliar o impacto e enviar contribuição',
    itens_gerados: 3,
    itens_descartados: 0,
};

function mapear(linha: Record<string, unknown>): NormaMapeada {
    const r = mapearNorma(linha, HOJE);
    if ('erro' in r) throw new Error(r.erro);
    return r;
}

describe('mapearNorma', () => {
    it('converte a linha do resumidor no formato que o front consome', () => {
        const { norma } = mapear(linhaDoPipeline);

        expect(norma.source).toBe('dou');
        expect(norma.code).toBe('Despacho nº 2.345/2026');
        expect(norma.numero).toBe('2.345');
        expect(norma.title).toBe('Abre consulta pública sobre as regras de compensação da geração distribuída');
        expect(norma.lead).toBe(linhaDoPipeline.resumo);
        expect(norma.impact).toBe('alto');
        expect(norma.publishedAt).toBe('2026-09-23');
        expect(norma.url).toBe(linhaDoPipeline.link);
        expect(norma.area).toBe('Solar');
        expect(norma.subarea).toBe('Solar > Geração distribuída');
        expect(norma.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('monta "o que muda" com antes/depois quando o texto traz os dois', () => {
        const { norma } = mapear(linhaDoPipeline);
        expect(norma.changes).toEqual(['Prazo de compensação dos créditos. Antes: 60 meses. Agora: 48 meses.', 'Abertura da consulta.']);
    });

    it('usa o próximo prazo ainda não vencido', () => {
        const { norma } = mapear(linhaDoPipeline);
        expect(norma.deadlineAt).toBe('2026-10-15');
        expect(norma.deadline).toBe('Envio de contribuições até 15/10/2026');
    });

    it('junta ação necessária e quem é afetado em "por que importa"', () => {
        const { norma } = mapear(linhaDoPipeline);
        expect(norma.why).toBe('O que fazer: Avaliar o impacto e enviar contribuição. Quem é afetado: minigeração solar, distribuidoras.');
    });

    it('quebra o texto em trechos por artigo quando o Python não manda trechos', () => {
        const { trechos } = mapear(linhaDoPipeline);
        expect(trechos.map((t) => t.artigo)).toEqual([undefined, 'Art. 1º', 'Art. 2º']);
        expect(trechos.map((t) => t.ordem)).toEqual([0, 1, 2]);
    });

    it('usa os trechos com embedding quando vierem do Python', () => {
        const { trechos } = mapear({ ...linhaDoPipeline, trechos: [{ artigo: 'Art. 1º', texto: 'abc', vetor: [0.1, 0.2] }] });
        expect(trechos).toEqual([{ artigo: 'Art. 1º', ordem: 0, texto: 'abc', vetor: [0.1, 0.2] }]);
    });

    it('aceita limites explícitos e descarta os malformados', () => {
        const { limites } = mapear({
            ...linhaDoPipeline,
            limites: [
                { parametro: 'capacityMw', operador: '<=', valor: 5, unidade: 'MW', artigo: 'Art. 3º' },
                { parametro: 'co2', operador: 'menor que', valor: 1 },
                { parametro: 'co2', operador: '<=' },
            ],
        });
        expect(limites).toHaveLength(1);
        expect(limites[0]).toMatchObject({ parametro: 'capacityMw', operador: '<=', valor: 5, unidade: 'MW', artigo: 'Art. 3º' });
    });

    it('não usa o "ERRO: ..." do resumidor como resumo', () => {
        const { norma, extracao } = mapear({ ...linhaDoPipeline, resumo: 'ERRO: resposta inválida' });
        expect(norma.lead).toBeUndefined();
        expect(norma.title).toBe(linhaDoPipeline.titulo);
        expect(extracao).toBeUndefined();
    });

    it('tolera colunas nulas (NaN do pandas vira null no to_json)', () => {
        const { norma, limites } = mapear({
            titulo: 'PORTARIA Nº 10',
            link: 'https://www.aneel.gov.br/x',
            area: null,
            subarea: null,
            relevancia: null,
            mudancas: null,
            prazos: null,
            limites: null,
        });
        expect(norma.source).toBe('aneel');
        expect(norma.impact).toBe('baixo');
        expect(norma.changes).toEqual([]);
        expect(norma.area).toBeUndefined();
        expect(limites).toEqual([]);
    });

    it('rejeita linha sem título ou sem texto e link', () => {
        expect(mapearNorma({ texto: 'x' })).toEqual({ erro: 'sem "titulo"' });
        expect(mapearNorma({ titulo: 'x' })).toEqual({ erro: 'sem "texto" nem "link"' });
    });
});

describe('paraDataIso', () => {
    it('aceita o formato do DOU e ISO', () => {
        expect(paraDataIso('23/09/2026')).toBe('2026-09-23');
        expect(paraDataIso('2026-09-23T10:00:00')).toBe('2026-09-23');
        expect(paraDataIso('ontem')).toBeUndefined();
        expect(paraDataIso(null)).toBeUndefined();
    });
});

describe('dividirEmTrechos', () => {
    it('quebra artigos longos sem cortar parágrafos', () => {
        const paragrafo = 'x'.repeat(60);
        const texto = ['Art. 5º Caput.', paragrafo, paragrafo, paragrafo].join('\n');
        const trechos = dividirEmTrechos(texto, 130);
        expect(trechos.length).toBeGreaterThan(1);
        expect(trechos.every((t) => t.artigo === 'Art. 5º')).toBe(true);
        expect(trechos.map((t) => t.texto).join('\n')).toBe(texto);
    });
});
