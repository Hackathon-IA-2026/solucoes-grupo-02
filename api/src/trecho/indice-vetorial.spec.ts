import { artigoCorresponde, IndiceVetorial, TrechoComVetor } from './indice-vetorial';

function indiceCom(trechos: TrechoComVetor[]) {
    const carregar = jest.fn().mockResolvedValue(trechos);
    return { indice: new IndiceVetorial(carregar), carregar };
}

describe('IndiceVetorial', () => {
    const trechos: TrechoComVetor[] = [
        { id: 'a', normaId: 'n1', texto: 'parecido', vetor: [1, 0, 0] },
        { id: 'b', normaId: 'n1', texto: 'meio', vetor: [1, 1, 0] },
        { id: 'c', normaId: 'n2', texto: 'oposto', vetor: [-1, 0, 0] },
        { id: 'd', normaId: 'n2', texto: 'outro modelo', vetor: [1, 0] },
        { id: 'e', normaId: 'n3', texto: 'sem vetor', vetor: [] },
    ];

    it('ordena por similaridade de cosseno, ignorando vetores de outro tamanho ou vazios', async () => {
        const { indice } = indiceCom(trechos);
        const resultado = await indice.buscar([2, 0, 0], 10);
        expect(resultado.map((r) => r.trecho.id)).toEqual(['a', 'b', 'c']);
        expect(resultado[0].similaridade).toBeCloseTo(1);
        expect(resultado[1].similaridade).toBeCloseTo(Math.SQRT1_2);
        expect(resultado[2].similaridade).toBeCloseTo(-1);
    });

    it('respeita o limite', async () => {
        const { indice } = indiceCom(trechos);
        expect(await indice.buscar([1, 0, 0], 1)).toHaveLength(1);
    });

    it('carrega uma vez e recarrega depois de invalidar', async () => {
        const { indice, carregar } = indiceCom(trechos);
        await indice.buscar([1, 0, 0]);
        await indice.buscar([0, 1, 0]);
        expect(carregar).toHaveBeenCalledTimes(1);
        indice.invalidar();
        await indice.buscar([1, 0, 0]);
        expect(carregar).toHaveBeenCalledTimes(2);
    });

    it('tenta carregar de novo se a carga falhar', async () => {
        const carregar = jest.fn().mockRejectedValueOnce(new Error('banco fora')).mockResolvedValue(trechos);
        const indice = new IndiceVetorial(carregar);
        await expect(indice.buscar([1, 0, 0])).rejects.toThrow('banco fora');
        expect(await indice.buscar([1, 0, 0])).toHaveLength(3);
    });

    it('traz os trechos da norma e do artigo citados mesmo fora dos mais parecidos', async () => {
        const base: TrechoComVetor[] = [
            { id: 'perto', normaId: 'outra', texto: 'x', vetor: [1, 0] },
            { id: 'art26', normaId: 'lei', artigo: 'Art. 26', texto: 'y', vetor: [0, 1] },
            { id: 'art30', normaId: 'lei', artigo: 'Art. 29 a 31', texto: 'z', vetor: [-1, 0] },
        ];
        const { indice } = indiceCom(base);
        expect((await indice.buscar([1, 0], 1)).map((r) => r.trecho.id)).toEqual(['perto']);
        const citados = await indice.buscar([1, 0], 1, { normaIds: ['lei'], artigos: ['30'] });
        expect(citados.map((r) => r.trecho.id).sort()).toEqual(['art26', 'art30', 'perto']);
        const soReferencias = await indice.buscar([1, 0], 1, { normaIds: ['lei'], somenteReferencias: true });
        expect(soReferencias.map((r) => r.trecho.id).sort()).toEqual(['art26', 'art30']);
    });
});

describe('artigoCorresponde', () => {
    it('confere artigo único e intervalo de artigos juntados', () => {
        expect(artigoCorresponde('Art. 26', '26')).toBe(true);
        expect(artigoCorresponde('Art. 29 a 31', '30')).toBe(true);
        expect(artigoCorresponde('Art. 29 a 31', '32')).toBe(false);
        expect(artigoCorresponde('Resumo', '1')).toBe(false);
        expect(artigoCorresponde(undefined, '1')).toBe(false);
    });
});
