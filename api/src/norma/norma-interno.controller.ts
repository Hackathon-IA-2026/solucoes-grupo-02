import { Controller, Get } from '@nestjs/common';
import { Interno } from '../ingestao/interno.decorator';
import { NormaService } from './norma.service';

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
