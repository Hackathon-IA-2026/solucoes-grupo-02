import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { NormaService, toNormResponse } from './norma.service';
import { CreateNormaDto } from './dto/create-norma.dto';
import { UpdateNormaDto } from './dto/update-norma.dto';
import { NormaSource } from './entities/norma.entity';

@Controller('norms')
export class NormaController {
    constructor(private readonly normaService: NormaService) {}

    @Post()
    async create(@Body() dto: CreateNormaDto) {
        const norma = await this.normaService.create(dto);
        return toNormResponse(norma);
    }

    @Get()
    async list(@Query('source') source?: NormaSource) {
        const normas = await this.normaService.list(source);
        return normas.map(toNormResponse);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        const norma = await this.normaService.getById(id);
        return toNormResponse(norma);
    }

    @Put(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNormaDto) {
        const norma = await this.normaService.update(id, dto);
        return toNormResponse(norma);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.normaService.remove(id);
    }
}
