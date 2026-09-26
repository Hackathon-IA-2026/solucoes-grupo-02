import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { TrechoService } from './trecho.service';
import { CreateTrechoDto } from './dto/create-trecho.dto';
import { Interno } from '../ingestao/interno.decorator';

@Controller('trechos')
export class TrechoController {
    constructor(private readonly trechoService: TrechoService) {}

    @Interno()
    @Post()
    async create(@Body() dto: CreateTrechoDto) {
        return await this.trechoService.createTrecho(dto);
    }

    @Get()
    async listByNorma(@Query('normaId', ParseUUIDPipe) normaId: string) {
        return await this.trechoService.listByNorma(normaId);
    }

    @Post('search')
    async search(@Body('vetor') vetor: number[], @Body('limit') limit?: number) {
        return await this.trechoService.search(vetor, limit);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.trechoService.getById(id);
    }

    @Interno()
    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.trechoService.remove(id);
    }
}
