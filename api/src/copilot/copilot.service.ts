import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrechoService } from '../trecho/trecho.service';
import { NormaService } from '../norma/norma.service';
import { catalogoParaOCopiloto } from './catalogo';
import { PlantService, toPlantResponse } from '../plant/plant.service';
import { escapeHtml } from '../utils/texto';

export interface CopilotCitation {
    label: string;
    excerpt: string;
    normId?: string;
    url?: string;
}

export interface TurnoDaConversa {
    role: 'user' | 'assistant';
    content: string;
}

export interface CopilotAnswer {
    answer: string;
    citations: CopilotCitation[];
}

const FALLBACK: CopilotAnswer = {
    answer: '<p>Não encontrei um dispositivo em vigor que responda a isso com precisão, e prefiro não completar a lacuna por conta própria.</p><p>Reformule com o tema ou o número da norma e eu volto com o artigo exato.</p>',
    citations: [],
};

// Escapado: o front renderiza a resposta com innerHTML.
function textoParaHtml(texto: string): string {
    const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return texto
        .trim()
        .split(/\n\s*\n/)
        .map((bloco) => {
            const linhas = bloco
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);
            if (linhas.every((l) => /^[-*•]\s+/.test(l))) {
                return `<ul>${linhas.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
            }
            return `<p>${linhas.map(inline).join('<br>')}</p>`;
        })
        .join('');
}

function linkSeguro(v: unknown): string | undefined {
    return typeof v === 'string' && /^https?:\/\//i.test(v) ? v : undefined;
}

function lerCitacoes(v: unknown): CopilotCitation[] {
    if (!Array.isArray(v)) return [];
    return v.flatMap((c: Record<string, unknown>) =>
        typeof c?.label === 'string' && typeof c?.excerpt === 'string'
            ? [{ label: c.label, excerpt: c.excerpt, normId: typeof c.normId === 'string' ? c.normId : undefined, url: linkSeguro(c.url) }]
            : [],
    );
}

@Injectable()
export class CopilotService {
    private readonly logger = new Logger(CopilotService.name);

    constructor(
        private readonly trechoService: TrechoService,
        private readonly normaService: NormaService,
        private readonly plantService: PlantService,
        private readonly config: ConfigService,
    ) {}

    async ask(question: string, companyId: string, historico: TurnoDaConversa[] = [], normaId?: string): Promise<CopilotAnswer> {
        return (await this.perguntarAoServicoDeIa(question, companyId, historico, normaId)) ?? (await this.buscarPorPalavraChave(question));
    }

    private async perguntarAoServicoDeIa(
        question: string,
        companyId: string,
        historico: TurnoDaConversa[],
        normaId?: string,
    ): Promise<CopilotAnswer | null> {
        const base = this.config.get<string>('AI_SERVICE_URL');
        if (!base) return null;
        try {
            const plant = await this.plantService.getPlant(companyId);
            const emFoco = normaId ? await this.normaService.getById(normaId).catch(() => null) : null;
            const novidades = catalogoParaOCopiloto(await this.normaService.list(plant), emFoco);
            const canonicas = (await this.normaService.listCanonicas()).map((n) => ({ code: n.code ?? n.title, title: n.title, url: n.url ?? null }));
            const res = await fetch(`${base.replace(/\/+$/, '')}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-internal-key': this.config.get<string>('INTERNAL_API_KEY', '') },
                body: JSON.stringify({ question, perfil: toPlantResponse(plant), historico, normaId: emFoco?.id ?? null, novidades, canonicas }),
                signal: AbortSignal.timeout(180_000),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { answer?: unknown; citations?: unknown };
            if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('resposta sem "answer"');
            return { answer: textoParaHtml(data.answer), citations: lerCitacoes(data.citations) };
        } catch (err) {
            this.logger.warn(`Serviço de IA indisponível (${(err as Error).message}) — usando busca por palavra-chave.`);
            return null;
        }
    }

    private async buscarPorPalavraChave(question: string): Promise<CopilotAnswer> {
        const trechos = await this.trechoService.searchByText(question, 3);
        if (trechos.length === 0) return FALLBACK;

        const citations = await Promise.all(
            trechos.map(async (t): Promise<CopilotCitation> => {
                const norma = await this.normaService.getById(t.normaId).catch(() => null);
                const label = [norma?.code ?? norma?.title, t.artigo].filter(Boolean).join(', ');
                return { label: label || 'Trecho relacionado', excerpt: t.texto, normId: t.normaId, url: linkSeguro(norma?.url) };
            }),
        );
        // O front usa o rótulo como chave.
        const unicas = citations.filter((c, i) => citations.findIndex((o) => o.label === c.label) === i);

        const answer = `<p>Encontrei ${trechos.length} trecho${trechos.length > 1 ? 's' : ''} relacionado${trechos.length > 1 ? 's' : ''} à sua pergunta:</p><ul>${trechos
            .map((t) => `<li>${escapeHtml(t.texto)}</li>`)
            .join('')}</ul>`;

        return { answer, citations: unicas };
    }
}
