import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrechoService } from '../trecho/trecho.service';
import { NormaService } from '../norma/norma.service';
import { PlantService, toPlantResponse } from '../plant/plant.service';
import { escapeHtml } from '../utils/texto';

export interface CopilotCitation {
    label: string;
    excerpt: string;
    normId?: string;
}

export interface CopilotAnswer {
    answer: string;
    citations: CopilotCitation[];
}

const FALLBACK: CopilotAnswer = {
    answer: '<p>Não encontrei um dispositivo em vigor que responda a isso com precisão, e prefiro não completar a lacuna por conta própria.</p><p>Reformule com o tema ou o número da norma e eu volto com o artigo exato.</p>',
    citations: [],
};

// A resposta do LLM chega como texto (com markdown simples, no máximo). Vira HTML
// aqui, escapado: o modelo lê texto de norma externa e não pode injetar HTML no
// front, que renderiza a resposta com innerHTML.
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

function lerCitacoes(v: unknown): CopilotCitation[] {
    if (!Array.isArray(v)) return [];
    return v.flatMap((c: Record<string, unknown>) =>
        typeof c?.label === 'string' && typeof c?.excerpt === 'string'
            ? [{ label: c.label, excerpt: c.excerpt, normId: typeof c.normId === 'string' ? c.normId : undefined }]
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

    async ask(question: string, companyId: string): Promise<CopilotAnswer> {
        return (await this.perguntarAoServicoDeIa(question, companyId)) ?? (await this.buscarPorPalavraChave(question));
    }

    // Com AI_SERVICE_URL no .env, a pergunta vai pro microsserviço Python de RAG junto
    // com o perfil da usina (o "Envia perfil do cliente e dúvida" do diagrama).
    // Contrato: POST {AI_SERVICE_URL}/ask {question, perfil} -> {answer, citations}.
    // Se o serviço não estiver configurado ou falhar, cai na busca por palavra-chave.
    private async perguntarAoServicoDeIa(question: string, companyId: string): Promise<CopilotAnswer | null> {
        const base = this.config.get<string>('AI_SERVICE_URL');
        if (!base) return null;
        try {
            const perfil = toPlantResponse(await this.plantService.getPlant(companyId));
            const res = await fetch(`${base.replace(/\/+$/, '')}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, perfil }),
                signal: AbortSignal.timeout(60_000),
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

    // Implementação "de vitrine": busca por palavra-chave nos `trechos` (sem
    // embedding/LLM) e devolve os trechos encontrados, com a norma de cada um.
    private async buscarPorPalavraChave(question: string): Promise<CopilotAnswer> {
        const trechos = await this.trechoService.searchByText(question, 3);
        if (trechos.length === 0) return FALLBACK;

        const citations = await Promise.all(
            trechos.map(async (t): Promise<CopilotCitation> => {
                const norma = await this.normaService.getById(t.normaId).catch(() => null);
                const label = [norma?.code ?? norma?.title, t.artigo].filter(Boolean).join(', ');
                return { label: label || 'Trecho relacionado', excerpt: t.texto, normId: t.normaId };
            }),
        );
        // Um artigo longo vira mais de um trecho com o mesmo rótulo — o front usa o rótulo como chave.
        const unicas = citations.filter((c, i) => citations.findIndex((o) => o.label === c.label) === i);

        const answer = `<p>Encontrei ${trechos.length} trecho${trechos.length > 1 ? 's' : ''} relacionado${trechos.length > 1 ? 's' : ''} à sua pergunta:</p><ul>${trechos
            .map((t) => `<li>${escapeHtml(t.texto)}</li>`)
            .join('')}</ul>`;

        return { answer, citations: unicas };
    }
}
