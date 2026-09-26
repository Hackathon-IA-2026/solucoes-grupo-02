import { createHash } from 'crypto';
import type { CreateNormaDto } from '../norma/dto/create-norma.dto';
import type { NormaImpact, NormaSource } from '../norma/entities/norma.entity';
import type { CreateLimiteDto } from '../limite/dto/create-limite.dto';
import type { CreateTrechoDto } from '../trecho/dto/create-trecho.dto';
import { normalizarCeg } from '../utils/ceg';
import { cnpjValido, somenteDigitos } from '../utils/cnpj';

// Converte uma linha do DataFrame final do pipeline Python (saída do `coletar_df`
// em ai/models/summarizer.py, enviada com `df.to_json(orient="records")`) nos
// registros do banco: norma, extração, limites e trechos. As colunas vêm do pandas,
// então tudo é lido de forma defensiva — campo ausente, `null` ou de tipo errado é ignorado.

export type LimiteMapeado = Omit<CreateLimiteDto, 'normaId' | 'extracaoId'>;
export type TrechoMapeado = Omit<CreateTrechoDto, 'normaId'>;

export interface NormaMapeada {
    norma: CreateNormaDto;
    extracao?: { resumo?: string; modelo?: string; tokensGastos?: number };
    limites: LimiteMapeado[];
    trechos: TrechoMapeado[];
}

type Linha = Record<string, unknown>;

const OPERADORES = ['>', '<', '>=', '<=', '='];
const MAX_TITULO = 140;
const MAX_AFETADOS = 5;

function str(v: unknown): string | undefined {
    if (typeof v !== 'string') return undefined;
    const t = v.trim();
    return t ? t : undefined;
}

function num(v: unknown): number | undefined {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return undefined;
}

function lista(v: unknown): unknown[] {
    return Array.isArray(v) ? v : [];
}

function listaDeTextos(v: unknown): string[] {
    if (typeof v === 'string') return str(v) ? [v.trim()] : [];
    return lista(v)
        .map(str)
        .filter((s): s is string => Boolean(s));
}

function listaDeObjetos(v: unknown): Linha[] {
    return lista(v).filter((o): o is Linha => typeof o === 'object' && o !== null && !Array.isArray(o));
}

function comPonto(frase: string): string {
    return /[.!?…]$/.test(frase) ? frase : `${frase}.`;
}

// Aceita "23/09/2026" (formato do pubDate do DOU) e "2026-09-23..." (ISO). Devolve AAAA-MM-DD.
export function paraDataIso(v: unknown): string | undefined {
    const t = str(v);
    if (!t) return undefined;
    const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : t.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (!iso || Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) return undefined;
    return iso;
}

function dataBr(iso: string): string {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}

export function fonteDoLink(link?: string): NormaSource {
    if (link?.includes('aneel.gov.br')) return 'aneel';
    if (link?.includes('ccee.org.br')) return 'ccee';
    return 'dou';
}

export function impactoDaRelevancia(relevancia?: number): NormaImpact {
    if (relevancia !== undefined && relevancia >= 3) return 'alto';
    if (relevancia !== undefined && relevancia >= 2) return 'medio';
    return 'baixo';
}

// Primeira frase do resumo vira a manchete do card, cortada num tamanho de título.
function primeiraFrase(texto?: string): string | undefined {
    if (!texto) return undefined;
    const frase = texto.split(/(?<=[.!?])\s/)[0].trim();
    if (frase.length <= MAX_TITULO) return frase.replace(/\.$/, '');
    const corte = frase.slice(0, MAX_TITULO);
    return `${corte.slice(0, corte.lastIndexOf(' ') > 0 ? corte.lastIndexOf(' ') : MAX_TITULO)}…`;
}

// "DESPACHO Nº 2.345, DE 22 DE SETEMBRO DE 2026" + tipo "Despacho" -> "Despacho nº 2.345/2026"
function codigoDaNorma(titulo: string, tipo?: string, numero?: string, dataIso?: string): string {
    const ano = titulo.match(/DE (\d{4})\s*$/i)?.[1] ?? dataIso?.slice(0, 4);
    if (!tipo || !numero) return titulo;
    return `${tipo} nº ${numero}${ano ? `/${ano}` : ''}`;
}

// CNPJ formatado ("18.565.382/0001-66") ou só dígitos logo depois da palavra CNPJ.
const CNPJ_NO_TEXTO = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|CNPJ\D{0,15}(\d{14})\b/g;
const CEG_NO_TEXTO = /\b[A-Z]{3}\s*\.\s*[A-Z]{2}\s*\.\s*[A-Z]{2}\s*\.\s*\d{4,6}/g;

// Quem o ato cita: o pipeline manda as listas (`cnpjs`, `cegs`); sem elas, saem do texto.
// Em qualquer caso ficam só CNPJs válidos (só dígitos) e CEGs normalizados, sem repetição.
export function identificadoresCitados(linha: Record<string, unknown>, texto = ''): { cnpjs: string[]; cegs: string[] } {
    const cnpjs = Array.isArray(linha.cnpjs) ? listaDeTextos(linha.cnpjs) : [...texto.matchAll(CNPJ_NO_TEXTO)].map((m) => m[1] ?? m[0]);
    const cegs = Array.isArray(linha.cegs) ? listaDeTextos(linha.cegs) : (texto.match(CEG_NO_TEXTO) ?? []);
    return {
        cnpjs: [...new Set(cnpjs.map(somenteDigitos).filter(cnpjValido))],
        cegs: [...new Set(cegs.map(normalizarCeg).filter((c): c is string => Boolean(c)))],
    };
}

const INICIO_ARTIGO = /^Art\.?\s*\d+(?:\.\d+)*\s*[º°o]?(?:-[A-Z])?/i;

// Quebra o texto da norma em trechos por artigo (o que o copiloto cita), e artigos
// longos em pedaços de até `maxChars`, sem cortar no meio de um parágrafo.
// O que vem antes do Art. 1º (preâmbulo, "resolve:") vira um trecho sem artigo.
export function dividirEmTrechos(texto: string, maxChars = 1500): Array<{ artigo?: string; texto: string }> {
    const blocos: Array<{ artigo?: string; linhas: string[] }> = [];
    let atual: { artigo?: string; linhas: string[] } = { linhas: [] };

    for (const linha of texto.split('\n').map((l) => l.trim())) {
        if (!linha) continue;
        const inicio = linha.match(INICIO_ARTIGO);
        if (inicio) {
            if (atual.linhas.length) blocos.push(atual);
            atual = { artigo: inicio[0].trim(), linhas: [] };
        }
        atual.linhas.push(linha);
    }
    if (atual.linhas.length) blocos.push(atual);

    const trechos: Array<{ artigo?: string; texto: string }> = [];
    for (const bloco of blocos) {
        let buffer = '';
        for (const linha of bloco.linhas) {
            if (buffer && buffer.length + linha.length + 1 > maxChars) {
                trechos.push({ artigo: bloco.artigo, texto: buffer });
                buffer = '';
            }
            buffer = buffer ? `${buffer}\n${linha}` : linha;
        }
        if (buffer) trechos.push({ artigo: bloco.artigo, texto: buffer });
    }
    return trechos;
}

export function mapearNorma(linha: Linha, hoje = new Date()): NormaMapeada | { erro: string } {
    const titulo = str(linha.titulo);
    const texto = str(linha.texto);
    const link = str(linha.link);
    if (!titulo) return { erro: 'sem "titulo"' };
    if (!texto && !link) return { erro: 'sem "texto" nem "link"' };

    const fonteInformada = str(linha.fonte);
    const source: NormaSource =
        fonteInformada === 'aneel' || fonteInformada === 'ccee' || fonteInformada === 'dou' ? fonteInformada : fonteDoLink(link);
    const tipo = str(linha.tipo);
    const numero = str(linha.numero) ?? titulo.match(/N[º°o.]\s*([\d.\-/]+\d)/i)?.[1];
    const publishedAt = paraDataIso(linha.data);

    // O resumidor devolve "ERRO: ..." quando o modelo falha — isso não vai pro card.
    const resumoBruto = str(linha.resumo);
    const resumo = resumoBruto && !resumoBruto.startsWith('ERRO') ? resumoBruto : undefined;

    // Cada mudança vem com o trecho literal que o resumidor já conferiu contra o texto:
    // ele vai junto (mesma posição) para a tela mostrar de onde saiu a afirmação.
    const mudancas = listaDeObjetos(linha.mudancas).flatMap((m) => {
        const oQue = str(m.o_que_mudou) ?? str(m.depois);
        if (!oQue) return [];
        const antes = str(m.antes);
        const depois = str(m.depois);
        const texto = antes && depois ? `${comPonto(oQue)} Antes: ${antes}. Agora: ${depois}.` : comPonto(oQue);
        return [{ texto, fonte: str(m.trecho) ?? '' }];
    });

    // Próximo prazo ainda não vencido (vigência, contribuição de consulta pública, cumprimento...).
    const hojeIso = hoje.toISOString().slice(0, 10);
    const proximoPrazo = listaDeObjetos(linha.prazos)
        .flatMap((p) => {
            const data = paraDataIso(p.data);
            return data && data >= hojeIso ? [{ data, descricao: str(p.descricao) }] : [];
        })
        .sort((a, b) => a.data.localeCompare(b.data))[0];
    const deadline = proximoPrazo
        ? `${proximoPrazo.descricao ? proximoPrazo.descricao.charAt(0).toUpperCase() + proximoPrazo.descricao.slice(1) : 'Prazo'} até ${dataBr(proximoPrazo.data)}`
        : undefined;

    const acao = str(linha.acao_necessaria);
    // Despachos da ANEEL podem listar dezenas de empresas; o card mostra as primeiras.
    const afetados = listaDeTextos(linha.quem_e_afetado);
    const listaAfetados =
        afetados.length > MAX_AFETADOS
            ? `${afetados.slice(0, MAX_AFETADOS).join(', ')} e mais ${afetados.length - MAX_AFETADOS}`
            : afetados.join(', ');
    const why = [acao && `O que fazer: ${comPonto(acao)}`, afetados.length && `Quem é afetado: ${listaAfetados}.`].filter(Boolean).join(' ');

    const limites: LimiteMapeado[] = listaDeObjetos(linha.limites).flatMap((l) => {
        const parametro = str(l.parametro);
        const operador = str(l.operador);
        const valor = num(l.valor);
        if (!parametro || !operador || !OPERADORES.includes(operador) || valor === undefined) return [];
        return [
            {
                parametro,
                operador,
                valor,
                unidade: str(l.unidade),
                artigo: str(l.artigo),
                trechoLiteral: str(l.trecho),
                vigencia: str(l.vigencia),
                condicoes: str(l.condicoes),
            },
        ];
    });

    // Se o Python já mandar os trechos (com embedding em `vetor`), usa esses; senão
    // quebra o texto por artigo aqui, sem vetor — o copiloto busca por palavra-chave.
    const trechosEnviados: TrechoMapeado[] = listaDeObjetos(linha.trechos).flatMap((t, i) => {
        const textoTrecho = str(t.texto);
        if (!textoTrecho) return [];
        const vetor = lista(t.vetor).every((x) => typeof x === 'number') ? (lista(t.vetor) as number[]) : [];
        return [{ artigo: str(t.artigo), ordem: i, texto: textoTrecho, vetor }];
    });
    const trechos = trechosEnviados.length ? trechosEnviados : texto ? dividirEmTrechos(texto).map((t, i) => ({ ...t, ordem: i })) : [];

    const { cnpjs, cegs } = identificadoresCitados(linha, texto);

    const modelo = str(linha.modelo);
    const tokensGastos = num(linha.tokens_gastos);

    return {
        norma: {
            source,
            title: str(linha.titulo_curto) ?? primeiraFrase(resumo) ?? titulo,
            code: str(linha.code) ?? codigoDaNorma(titulo, tipo, numero, publishedAt),
            lead: resumo,
            deadline,
            deadlineAt: proximoPrazo?.data,
            changes: mudancas.map((m) => m.texto),
            changeSources: mudancas.map((m) => m.fonte),
            why: why || undefined,
            impact: impactoDaRelevancia(num(linha.relevancia)),
            publishedAt,
            url: link,
            orgao: str(linha.orgao),
            tipo,
            numero,
            // Áreas e pares "Área > Subárea" do classificador, guardados como texto
            // (o motor de alertas separa de volta para cruzar com o perfil da usina).
            area: listaDeTextos(linha.area).join(', ') || undefined,
            subarea: listaDeTextos(linha.subarea).join('; ') || undefined,
            // Do classificador: "individual" = ato dirigido a uma empresa/usina (só vai para quem ele cita).
            abrangencia: linha.abrangencia === 'individual' ? 'individual' : 'geral',
            cnpjs,
            cegs,
            hash: createHash('sha256')
                .update(texto ?? link!)
                .digest('hex'),
            textoCompleto: texto,
            canonica: linha.canonica === true,
        },
        extracao: resumo || modelo ? { resumo, modelo, tokensGastos } : undefined,
        limites,
        trechos,
    };
}
