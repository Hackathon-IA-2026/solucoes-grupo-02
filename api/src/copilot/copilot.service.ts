import { Injectable } from '@nestjs/common';
import { TrechoService } from '../trecho/trecho.service';
import { NormaService } from '../norma/norma.service';

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
    answer:
        '<p>Não encontrei um dispositivo em vigor que responda a isso com precisão, e prefiro não completar a lacuna por conta própria.</p><p>Reformule com o tema ou o número da norma e eu volto com o artigo exato.</p>',
    citations: [],
};

// Implementação "de vitrine" do copiloto: busca por palavra-chave nos `trechos`
// (sem embedding/LLM real) e monta uma resposta a partir dos trechos encontrados.
// O ENDPOINTS.md original previa isso delegado a um microsserviço Python de RAG —
// esse serviço ainda não existe no repo, então isso aqui é o que evita o 404 no
// Copiloto até ele ser construído.
@Injectable()
export class CopilotService {
    constructor(
        private readonly trechoService: TrechoService,
        private readonly normaService: NormaService,
    ) {}

    async ask(question: string): Promise<CopilotAnswer> {
        const trechos = await this.trechoService.searchByText(question, 3);
        if (trechos.length === 0) return FALLBACK;

        const citations = await Promise.all(
            trechos.map(async (t): Promise<CopilotCitation> => {
                const norma = await this.normaService.getById(t.normaId).catch(() => null);
                const label = [norma?.code ?? norma?.title, t.artigo].filter(Boolean).join(', ');
                return { label: label || 'Trecho relacionado', excerpt: t.texto, normId: t.normaId };
            }),
        );

        const answer = `<p>Encontrei ${trechos.length} trecho${trechos.length > 1 ? 's' : ''} relacionado${trechos.length > 1 ? 's' : ''} à sua pergunta:</p><ul>${trechos
            .map((t) => `<li>${t.texto}</li>`)
            .join('')}</ul>`;

        return { answer, citations };
    }
}
