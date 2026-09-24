import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { MateriaDouService } from './materia-dou.service';
import { CreateMateriaDouDto } from './dto/create-materia-dou.dto';

@Controller('materias-dou')
export class MateriaDouController {
    constructor(private readonly materiaDouService: MateriaDouService) {}

    @Post()
    async create(@Body() dto: CreateMateriaDouDto) {
        return await this.materiaDouService.create(dto);
    }

    @Get()
    async list() {
        return await this.materiaDouService.list();
    }

    @Get(':id')
    async getById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.materiaDouService.getById(id);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.materiaDouService.remove(id);
    }
}
