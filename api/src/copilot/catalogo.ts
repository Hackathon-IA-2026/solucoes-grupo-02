import type { NormaEntity } from '../norma/entities/norma.entity';
import { toNormResponse } from '../norma/norma.response';

const NOVIDADES_NO_CATALOGO = 25;

export interface NovidadeParaOCopiloto {
    id: string;
    code: string;
    title: string;
    lead: string;
    changes: string[];
    deadline: string;
    deadlineAt?: string;
    why: string;
    publishedAt?: string;
    url?: string;
    subareas: string[];
    emFoco: boolean;
}

export function catalogoParaOCopiloto(feed: NormaEntity[], emFoco: NormaEntity | null, hoje = new Date()): NovidadeParaOCopiloto[] {
    const hojeIso = hoje.toISOString().slice(0, 10);
    const comPrazo = feed.filter((n) => n.deadlineAt && n.deadlineAt >= hojeIso).sort((a, b) => a.deadlineAt!.localeCompare(b.deadlineAt!));
    const escolhidas = [...(emFoco ? [emFoco] : []), ...comPrazo, ...feed];
    const vistas = new Set<string>();
    return escolhidas
        .filter((n) => !vistas.has(n.id) && vistas.add(n.id))
        .slice(0, NOVIDADES_NO_CATALOGO)
        .map((n) => {
            const r = toNormResponse(n);
            return {
                id: r.id,
                code: r.code,
                title: r.title,
                lead: r.lead,
                changes: r.changes,
                deadline: r.deadline,
                deadlineAt: r.deadlineAt,
                why: r.why,
                publishedAt: r.publishedAt,
                url: r.url,
                subareas: r.subareas,
                emFoco: n.id === emFoco?.id,
            };
        });
}
