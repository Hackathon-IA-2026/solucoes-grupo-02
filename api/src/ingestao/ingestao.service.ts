import { Injectable, Logger } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { NormaEntity } from '../norma/entities/norma.entity';
import { ExtracaoEntity } from '../extracao/entities/extracao.entity';
import { LimiteEntity } from '../limite/entities/limite.entity';
import { TrechoEntity } from '../trecho/entities/trecho.entity';
import { AlertEngineService } from '../alerta/alert-engine.service';
import { IngestaoDto } from './dto/ingestao.dto';
import { mapearNorma, NormaMapeada } from './ingestao.mapper';

export interface ResultadoIngestao {
    recebidas: number;
    criadas: number;
    duplicadas: number;
    rejeitadas: Array<{ indice: number; motivo: string }>;
    alertas: number;
}

@Injectable()
export class IngestaoService {
    private readonly logger = new Logger(IngestaoService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly alertEngine: AlertEngineService,
    ) {}

    async ingerir(dto: IngestaoDto): Promise<ResultadoIngestao> {
        const resultado: ResultadoIngestao = { recebidas: dto.normas.length, criadas: 0, duplicadas: 0, rejeitadas: [], alertas: 0 };
        const novas: NormaEntity[] = [];

        for (const [indice, linha] of dto.normas.entries()) {
            const mapeada = mapearNorma(linha);
            if ('erro' in mapeada) {
                resultado.rejeitadas.push({ indice, motivo: mapeada.erro });
                continue;
            }
            try {
                const norma = await this.salvar(mapeada);
                if (norma) novas.push(norma);
                else resultado.duplicadas++;
            } catch (err) {
                this.logger.error(`Falha ao salvar a norma ${indice} ("${mapeada.norma.code}"): ${(err as Error).message}`);
                resultado.rejeitadas.push({ indice, motivo: 'erro ao salvar no banco' });
            }
        }

        resultado.criadas = novas.length;
        resultado.alertas = (await this.alertEngine.aposIngestao(novas)).length;
        this.logger.log(
            `Ingestão: ${resultado.criadas} nova(s), ${resultado.duplicadas} duplicada(s), ${resultado.rejeitadas.length} rejeitada(s), ${resultado.alertas} alerta(s).`,
        );
        return resultado;
    }

    // Norma + extração + limites + trechos numa transação só: se algo falhar no meio,
    // não sobra norma "pela metade" que a próxima coleta consideraria duplicada.
    private async salvar({ norma, extracao, limites, trechos }: NormaMapeada): Promise<NormaEntity | null> {
        return await this.dataSource.transaction(async (m) => {
            const mesma: FindOptionsWhere<NormaEntity>[] = [{ hash: norma.hash }];
            if (norma.url) mesma.push({ url: norma.url });
            if (await m.exists(NormaEntity, { where: mesma })) return null;

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
            return salva;
        });
    }
}
