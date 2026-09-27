// Índice em memória (sem pgvector não há busca vetorial no banco), recarregado após cada ingestão.

export interface TrechoComVetor {
    id: string;
    normaId: string;
    artigo?: string;
    texto: string;
    vetor: number[];
}

// Vetor já normalizado (norma 1): a similaridade de cosseno vira um produto escalar.
export interface TrechoIndexado extends Omit<TrechoComVetor, 'vetor'> {
    vetor: Float32Array;
}

export interface TrechoSemelhante {
    trecho: TrechoIndexado;
    similaridade: number;
}

export interface Referencias {
    normaIds?: string[];
    artigos?: string[]; // só o número: "26"
    somenteReferencias?: boolean;
}

const TRECHOS_POR_NORMA_CITADA = 3;
const TRECHOS_POR_ARTIGO_CITADO = 5;

// "Art. 26" contém 26; "Art. 29 a 31" (artigos curtos juntados) contém 30.
export function artigoCorresponde(rotulo: string | undefined, artigo: string): boolean {
    const numeros = (rotulo?.match(/\d+/g) ?? []).map(Number);
    const alvo = Number(artigo);
    if (numeros.length === 0 || Number.isNaN(alvo)) return false;
    return alvo >= numeros[0] && alvo <= numeros[numeros.length - 1];
}

function normalizarVetor(v: ArrayLike<number>): Float32Array {
    const saida = Float32Array.from(v);
    let norma = 0;
    for (const x of saida) norma += x * x;
    norma = Math.sqrt(norma) || 1;
    for (let i = 0; i < saida.length; i++) saida[i] /= norma;
    return saida;
}

export class IndiceVetorial {
    private indice: Promise<TrechoIndexado[]> | null = null;

    constructor(private readonly carregarTrechos: () => Promise<TrechoComVetor[]>) {}

    invalidar(): void {
        this.indice = null;
    }

    private carregar(): Promise<TrechoIndexado[]> {
        this.indice ??= this.carregarTrechos()
            .then((trechos) => trechos.filter((t) => t.vetor?.length).map((t) => ({ ...t, vetor: normalizarVetor(t.vetor) })))
            .catch((erro: unknown) => {
                this.indice = null;
                throw erro;
            });
        return this.indice;
    }

    async buscar(vetor: number[], limite = 10, referencias: Referencias = {}): Promise<TrechoSemelhante[]> {
        const consulta = normalizarVetor(vetor);
        const todos: TrechoSemelhante[] = [];
        for (const trecho of await this.carregar()) {
            if (trecho.vetor.length !== consulta.length) continue;
            let similaridade = 0;
            for (let i = 0; i < consulta.length; i++) similaridade += consulta[i] * trecho.vetor[i];
            todos.push({ trecho, similaridade });
        }
        todos.sort((a, b) => b.similaridade - a.similaridade);

        const escolhidos = new Map<string, TrechoSemelhante>();
        const incluir = (r: TrechoSemelhante) => escolhidos.set(r.trecho.id, r);
        if (!referencias.somenteReferencias) todos.slice(0, limite).forEach(incluir);

        for (const normaId of new Set(referencias.normaIds ?? [])) {
            const daNorma = todos.filter((r) => r.trecho.normaId === normaId);
            daNorma.slice(0, TRECHOS_POR_NORMA_CITADA).forEach(incluir);
            const artigos = referencias.artigos ?? [];
            daNorma
                .filter((r) => artigos.some((a) => artigoCorresponde(r.trecho.artigo, a)))
                .slice(0, TRECHOS_POR_ARTIGO_CITADO)
                .forEach(incluir);
        }
        return [...escolhidos.values()].sort((a, b) => b.similaridade - a.similaridade);
    }
}
