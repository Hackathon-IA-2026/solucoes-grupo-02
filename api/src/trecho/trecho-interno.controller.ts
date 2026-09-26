import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Interno } from '../ingestao/interno.decorator';
import { NormaService, toNormResponse } from '../norma/norma.service';
import { TrechoService } from './trecho.service';
import { BuscaTrechosDto } from './dto/busca-trechos.dto';

// Busca vetorial usada pelo copiloto (serviço Python): recebe o vetor da pergunta e
// devolve os trechos mais parecidos — normas canônicas e novidades juntas, numa busca
// só —, cada um com os dados da norma para o copiloto ranquear e citar (código e link).
@Interno()
@Controller('interno/trechos')
export class TrechoInternoController {
    constructor(
        private readonly trechoService: TrechoService,
        private readonly normaService: NormaService,
    ) {}

    @Post('busca')
    @HttpCode(200)
    async buscar(@Body() dto: BuscaTrechosDto) {
        const normaIds = [...(dto.normaIds ?? []), ...(dto.numeros?.length ? await this.normaService.findIdsByNumeros(dto.numeros) : [])];
        const semelhantes = await this.trechoService.buscarSemelhantes(dto.vetor, dto.limite ?? 10, {
            normaIds,
            artigos: dto.artigos,
            somenteReferencias: dto.somenteReferencias,
        });
        const normas = new Map((await this.normaService.getByIds([...new Set(semelhantes.map((s) => s.trecho.normaId))])).map((n) => [n.id, n]));

        return semelhantes.flatMap(({ trecho, similaridade }) => {
            const norma = normas.get(trecho.normaId);
            if (!norma) return []; // trecho de norma apagada
            const { id, code, title, url, source, publishedAt } = toNormResponse(norma);
            return [
                {
                    id: trecho.id,
                    artigo: trecho.artigo ?? null,
                    texto: trecho.texto,
                    similaridade,
                    norma: {
                        id,
                        code,
                        title,
                        numero: norma.numero ?? null,
                        url: url ?? null,
                        source,
                        publishedAt: publishedAt ?? null,
                        canonica: norma.canonica,
                    },
                },
            ];
        });
    }
}
