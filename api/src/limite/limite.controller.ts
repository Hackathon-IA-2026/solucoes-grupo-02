import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { LimiteService } from './limite.service';
import { CreateLimiteDto } from './dto/create-limite.dto';
import { UpdateLimiteDto } from './dto/update-limite.dto';

@Controller('limites')
export class LimiteController {
    constructor(private readonly limiteService: LimiteService) {}

    @Post()
    async create(@Body() dto: CreateLimiteDto) {
        return await this.limiteService.create(dto);
    }

    @Get()
    async listByNorma(@Query('normaId', ParseUUIDPipe) normaId: string) {
        return await this.limiteService.listByNorma(normaId);
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.limiteService.getById(id);
    }

    @Put(':id')
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLimiteDto) {
        return await this.limiteService.update(id, dto);
    }

    @Patch(':id/aprovar')
    async aprovar(@Param('id', ParseUUIDPipe) id: string) {
        return await this.limiteService.update(id, { status: 'aprovado_manual' });
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.limiteService.remove(id);
    }
}
