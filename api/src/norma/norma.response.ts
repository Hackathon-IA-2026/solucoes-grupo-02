import type { NormaEntity, NormaSource } from './entities/norma.entity';

const SOURCE_LABEL: Record<NormaSource, string> = {
    aneel: 'ANEEL',
    ccee: 'CCEE',
    dou: 'DOU',
};

function formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function toNormResponse(norma: NormaEntity) {
    return {
        id: norma.id,
        code: norma.code ?? [norma.tipo, norma.numero].filter(Boolean).join(' '),
        source: norma.source,
        sourceLabel: SOURCE_LABEL[norma.source],
        impact: norma.impact,
        date: formatDate(norma.publishedAt),
        publishedAt: norma.publishedAt,
        title: norma.title,
        lead: norma.lead ?? '',
        deadline: norma.deadline ?? '',
        deadlineAt: norma.deadlineAt,
        changes: norma.changes ?? [],
        changeSources: norma.changeSources ?? [],
        subareas: (norma.subarea ?? '')
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean),
        why: norma.why ?? '',
        url: norma.url,
        canonica: norma.canonica,
    };
}
