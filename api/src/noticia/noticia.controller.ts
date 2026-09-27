import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Request } from '@nestjs/common';
import { NoticiaService, toNoticiaResponse } from './noticia.service';
import { CreateNoticiaDto } from './dto/create-noticia.dto';
import { Interno } from '../ingestao/interno.decorator';
import { PlantService } from '../plant/plant.service';
import { UserPayload } from '../auth/types/user.payload.type';
import { NoticiaColetorService } from './coletor.service';

@Controller('noticias')
export class NoticiaController {
    constructor(
        private readonly noticiaService: NoticiaService,
        private readonly plantService: PlantService,
        private readonly coletor: NoticiaColetorService,
    ) {}

    @Interno()
    @Post()
    async create(@Body() dto: CreateNoticiaDto) {
        const noticia = await this.noticiaService.create(dto);
        return toNoticiaResponse(noticia);
    }

    @Get()
    async list(@Request() req: { user: UserPayload }, @Query('setor') setor?: string, @Query('escopo') escopo?: 'minhas' | 'todas') {
        const areas = escopo === 'todas' ? undefined : (await this.plantService.getPlant(req.user.companyId)).areas;
        const noticias = await this.noticiaService.list(setor, areas);
        return noticias.map(toNoticiaResponse);
    }

    @Interno()
    @Post('coletar')
    @HttpCode(200)
    async coletar() {
        return await this.coletor.coletar();
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        const noticia = await this.noticiaService.getById(id);
        return toNoticiaResponse(noticia);
    }

    @Interno()
    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.noticiaService.remove(id);
    }
}
