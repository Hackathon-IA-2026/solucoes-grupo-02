import { normalizar } from '../utils/texto';

export interface FonteDeNoticias {
    nome: string;
    url: string;
    formato: 'rss' | 'govbr';
    setores: string[];
}

export const FONTES: FonteDeNoticias[] = [
    { nome: 'ABSOLAR', url: 'https://www.absolar.org.br/feed/', formato: 'rss', setores: ['Solar'] },
    { nome: 'ABEEólica', url: 'https://abeeolica.org.br/feed/', formato: 'rss', setores: ['Eólica'] },
    { nome: 'PV Magazine Brasil', url: 'https://www.pv-magazine-brasil.com/feed/', formato: 'rss', setores: ['Solar'] },
    { nome: 'MegaWhat', url: 'https://megawhat.energy/feed', formato: 'rss', setores: [] },
    { nome: 'ANEEL', url: 'https://www.gov.br/aneel/pt-br/assuntos/noticias', formato: 'govbr', setores: [] },
    { nome: 'MME', url: 'https://www.gov.br/mme/pt-br/assuntos/noticias', formato: 'govbr', setores: [] },
];

const PALAVRAS: Record<string, RegExp> = {
    Solar: /\b(solar|solares|fotovoltaic\w*|geracao distribuida|mmgd|gd|ufv|micro ?geracao|mini ?geracao|curtailment|constrained.off|cortes? de geracao)\b/,
    Eólica: /\b(eolic\w*|aerogerador\w*|curtailment|constrained.off|cortes? de geracao)\b/,
    Armazenamento: /\b(armazenamento|baterias?|bess)\b/,
};

export function setoresDaNoticia(texto: string, fixos: string[] = []): string[] {
    const t = normalizar(texto);
    return [...new Set([...fixos, ...Object.keys(PALAVRAS).filter((area) => PALAVRAS[area].test(t))])];
}

export interface NoticiaColetada {
    titulo: string;
    resumo: string;
    url: string;
    imageUrl?: string;
    publicadoEm?: string; // AAAA-MM-DD
    categorias: string;
}

const MAX_RESUMO = 300;

function decodificar(s: string): string {
    return s
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#?39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function semHtml(s: string): string {
    return decodificar(
        decodificar(s)
            .replace(/<(script|style|figure|figcaption|nav)[\s\S]*?<\/\1>/gi, ' ')
            .replace(/<[^>]+>/g, ' '),
    )
        .replace(/\s+/g, ' ')
        .trim();
}

function cortar(texto: string): string {
    if (texto.length <= MAX_RESUMO) return texto;
    const corte = texto.slice(0, MAX_RESUMO);
    return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : MAX_RESUMO)}…`;
}

function tag(item: string, nome: string): string {
    return item.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, 'i'))?.[1] ?? '';
}

function linkSeguro(url?: string): string | undefined {
    const u = url?.trim();
    return u && /^https?:\/\//i.test(u) ? u : undefined;
}

// "Thu, 03 Sep 2026 01:06:27 +0000" -> "2026-09-03"
function dataRss(valor: string): string | undefined {
    const d = new Date(valor.trim());
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function resumoDoItem(item: string): string {
    const corpo = decodificar(tag(item, 'content:encoded')) || decodificar(tag(item, 'description'));
    const paragrafos = [...corpo.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(([, p]) => semHtml(p))
        .filter((p) => p && !/^(fotos?|imagem|crédito)\b/i.test(p) && !/^O post .+ apareceu primeiro em/i.test(p));
    const texto = paragrafos.length ? paragrafos.join(' ') : semHtml(corpo);
    return cortar(texto.replace(/\s*O post .+ apareceu primeiro em .+$/i, '').trim());
}

export function lerRss(xml: string): NoticiaColetada[] {
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].flatMap(([, item]) => {
        const titulo = semHtml(tag(item, 'title'));
        const url = linkSeguro(semHtml(tag(item, 'link')));
        if (!titulo || !url) return [];
        const imagem = item.match(/<media:content[^>]+url="([^"]+)"|<enclosure[^>]+url="([^"]+)"|<img[^>]+src="([^"]+)"/i);
        return [
            {
                titulo,
                resumo: resumoDoItem(item),
                url,
                imageUrl: linkSeguro(imagem ? decodificar(imagem[1] ?? imagem[2] ?? imagem[3]) : undefined),
                publicadoEm: dataRss(semHtml(tag(item, 'pubDate'))),
                categorias: [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map(([, c]) => semHtml(c)).join(', '),
            },
        ];
    });
}

export function lerGovBr(html: string): NoticiaColetada[] {
    const lista = html.match(/listagem-noticias-com-foto[^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? '';
    return [...lista.matchAll(/<li>([\s\S]*?)<\/li>/gi)].flatMap(([, li]) => {
        const link = li.match(/<h2[^>]*class="[^"]*titulo[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const url = linkSeguro(link?.[1]);
        const titulo = link ? semHtml(link[2]) : '';
        if (!url || !titulo) return [];
        const data = li.match(/<span[^>]*class="data"[^>]*>\s*(\d{2})\/(\d{2})\/(\d{4})/i);
        const descricao = li.match(/<span[^>]*class="descricao"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/i)?.[1] ?? '';
        return [
            {
                titulo,
                resumo: cortar(semHtml(descricao.replace(/<span[^>]*class="data"[\s\S]*?<\/span>\s*<span>\s*-\s*<\/span>/i, ''))),
                url,
                imageUrl: linkSeguro(li.match(/<img[^>]+src="([^"]+)"/i)?.[1]),
                publicadoEm: data ? `${data[3]}-${data[2]}-${data[1]}` : undefined,
                categorias: semHtml(li.match(/<div[^>]*class="subtitulo-noticia"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? ''),
            },
        ];
    });
}
