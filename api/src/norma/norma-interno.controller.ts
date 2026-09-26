import { Controller, Get } from '@nestjs/common';
import { Interno } from '../ingestao/interno.decorator';
import { NormaService } from './norma.service';

// Para o `ai/reclassificar.py`: as novidades já gravadas, com o texto e o link. O script
// classifica de novo e devolve pela ingestão, que acha cada norma pelo hash do texto ou pelo
// link e só atualiza `abrangencia`, `cnpjs` e `cegs` — sem apagar, sem resumir de novo e sem
// gerar alerta.
@Interno()
@Controller('interno/normas')
export class NormaInternoController {
    constructor(private readonly normaService: NormaService) {}

    @Get()
    async listar() {
        const normas = await this.normaService.listNovidadesComTexto();
        return normas.map((n) => ({
            id: n.id,
            titulo: n.code ?? n.title,
            link: n.url ?? null,
            texto: n.textoCompleto ?? null,
            abrangencia: n.abrangencia,
        }));
    }
}
