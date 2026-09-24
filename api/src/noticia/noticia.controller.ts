import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { NoticiaService, toNoticiaResponse } from './noticia.service';
import { CreateNoticiaDto } from './dto/create-noticia.dto';

@Controller('noticias')
export class NoticiaController {
    constructor(private readonly noticiaService: NoticiaService) {}

    @Post()
    async create(@Body() dto: CreateNoticiaDto) {
        const noticia = await this.noticiaService.create(dto);
        return toNoticiaResponse(noticia);
    }

    @Get()
    async list(@Query('setor') setor?: string) {
        const noticias = await this.noticiaService.list(setor);
        return noticias.map(toNoticiaResponse);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        const noticia = await this.noticiaService.getById(id);
        return toNoticiaResponse(noticia);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.noticiaService.remove(id);
    }
}
