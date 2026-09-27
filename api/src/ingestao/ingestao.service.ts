import { Injectable, Logger } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { NormaEntity } from '../norma/entities/norma.entity';
import { ExtracaoEntity } from '../extracao/entities/extracao.entity';
import { LimiteEntity } from '../limite/entities/limite.entity';
import { TrechoEntity } from '../trecho/entities/trecho.entity';
import { AlertEngineService } from '../alerta/alert-engine.service';
import { TrechoService } from '../trecho/trecho.service';
import { IngestaoDto } from './dto/ingestao.dto';
import { mapearNorma, NormaMapeada } from './ingestao.mapper';

export interface ResultadoIngestao {
    recebidas: number;
    criadas: number;
    duplicadas: number;
    reindexadas: number;
    rejeitadas: Array<{ indice: number; motivo: string }>;
    alertas: number;
}

@Injectable()
export class IngestaoService {
    private readonly logger = new Logger(IngestaoService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly alertEngine: AlertEngineService,
        private readonly trechoService: TrechoService,
    ) {}

    async ingerir(dto: IngestaoDto): Promise<ResultadoIngestao> {
        const resultado: ResultadoIngestao = {
            recebidas: dto.normas.length,
            criadas: 0,
            duplicadas: 0,
            reindexadas: 0,
            rejeitadas: [],
            alertas: 0,
        };
        const novas: NormaEntity[] = [];

        for (const [indice, linha] of dto.normas.entries()) {
            const mapeada = mapearNorma(linha);
            if ('erro' in mapeada) {
                resultado.rejeitadas.push({ indice, motivo: mapeada.erro });
                continue;
            }
            try {
                const salvo = await this.salvar(mapeada, linha.somente_atualizar === true);
                if (salvo.naoEncontrada) {
                    resultado.rejeitadas.push({ indice, motivo: 'norma não encontrada para atualizar' });
                    continue;
                }
                if (salvo.norma) novas.push(salvo.norma);
                else resultado.duplicadas++;
                if (salvo.reindexada) resultado.reindexadas++;
            } catch (err) {
                this.logger.error(`Falha ao salvar a norma ${indice} ("${mapeada.norma.code}"): ${(err as Error).message}`);
                resultado.rejeitadas.push({ indice, motivo: 'erro ao salvar no banco' });
            }
        }

        resultado.criadas = novas.length;
        if (novas.length || resultado.reindexadas) this.trechoService.invalidarIndice();
        resultado.alertas = (await this.alertEngine.aposIngestao(novas.filter((n) => !n.canonica))).length;
        this.logger.log(
            `Ingestão: ${resultado.criadas} nova(s), ${resultado.duplicadas} duplicada(s) (${resultado.reindexadas} reindexada(s)), ` +
                `${resultado.rejeitadas.length} rejeitada(s), ${resultado.alertas} alerta(s).`,
        );
        return resultado;
    }

    private async salvar(
        { norma, extracao, limites, trechos }: NormaMapeada,
        somenteAtualizar = false,
    ): Promise<{ norma?: NormaEntity; reindexada?: boolean; naoEncontrada?: boolean }> {
        return await this.dataSource.transaction(async (m) => {
            const mesma: FindOptionsWhere<NormaEntity>[] = [{ hash: norma.hash }];
            if (norma.url) mesma.push({ url: norma.url });
            const existente = await m.findOne(NormaEntity, { where: mesma, select: { id: true } });
            if (existente) {
                await m.update(NormaEntity, existente.id, { abrangencia: norma.abrangencia, cnpjs: norma.cnpjs, cegs: norma.cegs });
                if (!trechos.some((t) => t.vetor?.length)) return {};
                await m.delete(TrechoEntity, { normaId: existente.id });
                await m.save(
                    m.create(
                        TrechoEntity,
                        trechos.map((t) => ({ ...t, normaId: existente.id, vetor: t.vetor ?? [] })),
                    ),
                );
                return { reindexada: true };
            }
            if (somenteAtualizar) return { naoEncontrada: true };

            const salva = await m.save(m.create(NormaEntity, norma));
            const extracaoSalva = extracao
                ? await m.save(m.create(ExtracaoEntity, { ...extracao, normaId: salva.id, hashDoTextoUsado: norma.hash }))
                : undefined;
            if (limites.length) {
                await m.save(
                    m.create(
                        LimiteEntity,
                        limites.map((l) => ({ ...l, normaId: salva.id, extracaoId: extracaoSalva?.id })),
                    ),
                );
            }
            if (trechos.length) {
                await m.save(
                    m.create(
                        TrechoEntity,
                        trechos.map((t) => ({ ...t, normaId: salva.id, vetor: t.vetor ?? [] })),
                    ),
                );
            }
            return { norma: salva };
        });
    }
}
