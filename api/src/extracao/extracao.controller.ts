import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ExtracaoService } from './extracao.service';
import { CreateExtracaoDto } from './dto/create-extracao.dto';

@Controller('extracoes')
export class ExtracaoController {
    constructor(private readonly extracaoService: ExtracaoService) {}

    @Post()
    async create(@Body() dto: CreateExtracaoDto) {
        return await this.extracaoService.create(dto);
    }

    @Get()
    async listByNorma(@Query('normaId', ParseUUIDPipe) normaId: string) {
        return await this.extracaoService.listByNorma(normaId);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.extracaoService.getById(id);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.extracaoService.remove(id);
    }
}
