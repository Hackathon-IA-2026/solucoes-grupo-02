import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NoticiaService } from './noticia.service';
import { FONTES, FonteDeNoticias, lerGovBr, lerRss, setoresDaNoticia } from './coleta';

// Notícia mais velha que isso não entra (as associações publicam pouco: o feed da ABEEólica
// chega a ter itens de meses atrás).
const DIAS_MAXIMOS = 90;

export interface ResultadoColeta {
    novas: number;
    porFonte: Record<string, { lidas: number; daTaxonomia: number; novas: number; erro?: string }>;
}

// Coleta as notícias das FONTES (coleta.ts) a cada 3 horas e quando a API sobe, e guarda as
// que tratam de uma área da taxonomia. Uma fonte fora do ar não atrapalha as outras.
@Injectable()
export class NoticiaColetorService implements OnApplicationBootstrap {
    private readonly logger = new Logger(NoticiaColetorService.name);
    private emAndamento?: Promise<ResultadoColeta>;

    constructor(private readonly noticiaService: NoticiaService) {}

    onApplicationBootstrap() {
        // sem esperar: a API sobe na hora e as notícias chegam em alguns segundos
        void this.coletar();
    }

    @Cron('0 */3 * * *', { timeZone: 'America/Sao_Paulo' })
    async aCadaTresHoras() {
        await this.coletar();
    }

    async coletar(): Promise<ResultadoColeta> {
        this.emAndamento ??= this.coletarTodas().finally(() => (this.emAndamento = undefined));
        return await this.emAndamento;
    }

    private async coletarTodas(): Promise<ResultadoColeta> {
        const resultado: ResultadoColeta = { novas: 0, porFonte: {} };
        for (const fonte of FONTES) {
            try {
                resultado.porFonte[fonte.nome] = await this.coletarFonte(fonte);
                resultado.novas += resultado.porFonte[fonte.nome].novas;
            } catch (err) {
                resultado.porFonte[fonte.nome] = { lidas: 0, daTaxonomia: 0, novas: 0, erro: (err as Error).message };
                this.logger.warn(`Notícias de ${fonte.nome} indisponíveis: ${(err as Error).message}`);
            }
        }
        this.logger.log(`Coleta de notícias: ${resultado.novas} nova(s).`);
        return resultado;
    }

    private async coletarFonte(fonte: FonteDeNoticias) {
        const r = await fetch(fonte.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (EnergyStart; noticias do setor)' },
            signal: AbortSignal.timeout(30_000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const lidas = (fonte.formato === 'rss' ? lerRss : lerGovBr)(await r.text());

        const limite = new Date(Date.now() - DIAS_MAXIMOS * 86_400_000).toISOString().slice(0, 10);
        const daTaxonomia = lidas
            .filter((n) => !n.publicadoEm || n.publicadoEm >= limite)
            .map((n) => ({ ...n, setores: setoresDaNoticia(`${n.titulo} ${n.resumo} ${n.categorias}`, fonte.setores) }))
            .filter((n) => n.setores.length > 0);

        const existentes = await this.noticiaService.urlsExistentes(daTaxonomia.map((n) => n.url));
        const novas = daTaxonomia
            .filter((n, i) => !existentes.has(n.url) && daTaxonomia.findIndex((o) => o.url === n.url) === i)
            .map((n) => ({
                titulo: n.titulo,
                resumo: n.resumo || undefined,
                fonte: fonte.nome,
                url: n.url,
                imageUrl: n.imageUrl,
                setor: n.setores[0],
                setores: n.setores,
                publicadoEm: n.publicadoEm,
            }));
        return { lidas: lidas.length, daTaxonomia: daTaxonomia.length, novas: await this.noticiaService.createMany(novas) };
    }
}
